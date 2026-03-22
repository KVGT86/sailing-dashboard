const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const FitParser = require('fit-file-parser').default || require('fit-file-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const API_KEY = "QYHdr2V4cZktJ7nu";

const initDB = async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS athlete_profiles (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, weight_kg FLOAT, height_cm FLOAT, rhr INT, max_hr INT, vo2max FLOAT, on_boat BOOLEAN DEFAULT FALSE, readiness_score INT DEFAULT 80, body_battery INT DEFAULT 100, recovery_hours INT DEFAULT 0)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS sail_inventory (id TEXT PRIMARY KEY, name TEXT, hours_flown FLOAT DEFAULT 0, type TEXT, is_race_sail BOOLEAN DEFAULT TRUE, last_used DATE DEFAULT CURRENT_DATE, condition_score INT DEFAULT 5)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS tuning_guide (min_wind INT PRIMARY KEY, max_wind INT, upper_shroud INT, lower_shroud INT, headstay TEXT, jib_selection TEXT, rake INT, backstay TEXT, traveller TEXT)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS sail_usage (id SERIAL PRIMARY KEY, sail_id TEXT REFERENCES sail_inventory(id), date DATE DEFAULT CURRENT_DATE, hours FLOAT, avg_wind FLOAT, max_wind FLOAT, notes TEXT)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS race_logs (id SERIAL PRIMARY KEY, event_name TEXT, date DATE DEFAULT CURRENT_DATE, wind_speed FLOAT, wind_dir INT, result_pos INT, total_boats INT, crew_list TEXT, notes TEXT)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS system_config (key TEXT PRIMARY KEY, value TEXT)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS athlete_availability (id SERIAL PRIMARY KEY, athlete_id INT REFERENCES athlete_profiles(id) ON DELETE CASCADE, available_date DATE NOT NULL, is_available BOOLEAN DEFAULT TRUE, UNIQUE(athlete_id, available_date))`);
    
    await pool.query(`INSERT INTO system_config (key, value) VALUES ('wind_multiplier', '1.0') ON CONFLICT DO NOTHING`);

    const guideCheck = await pool.query('SELECT * FROM tuning_guide LIMIT 1').catch(() => ({rowCount: 0}));
    if (guideCheck.rowCount === 0) {
      await pool.query(`INSERT INTO tuning_guide (min_wind, max_wind, upper_shroud, lower_shroud, headstay, rake, backstay, traveller, jib_selection) VALUES 
        (1, 5, 15, 0, '+2', 1425, '0', '100% Up', 'J2+'), (6, 7, 17, 0, '+1', 1425, '0-20%', '100% Up', 'J2+'), (8, 10, 19, 9, 'BASE', 1425, '0-40%', '50-100%', 'J2+'), (11, 12, 21, 13, 'BASE', 1425, '30-50%', '40-75%', 'J2+'), (13, 13, 23, 16, '-1', 1425, '40-60%', '20-40%', 'J2+'), (14, 14, 24, 21, '-1', 1425, '50-70%', '10-30%', 'J6'), (15, 15, 26, 23, '-2', 1425, '60-80%', '1Car Up', 'J6'), (16, 16, 27, 27, '-2', 1425, '80-100%', '1Car Up', 'J6'), (17, 18, 28, 28, '-3', 1425, '100%', '1Car Up', 'J6'), (19, 19, 29, 30, '-3', 1425, '100%', '1Car Up', 'J6'), (20, 30, 30, 32, '-4', 1425, '100%', 'Centred-1Car Down', 'J6')`).catch(e => console.log("Guide Seed Skip"));
    }
    console.log("⚓ GBR 1381 PRO ENGINE (V3) INITIALISED");
  } catch (err) { console.error("❌ Init Error:", err.message); }
};
initDB();

const getWindMultiplier = async () => { try { const r = await pool.query("SELECT value FROM system_config WHERE key = 'wind_multiplier'"); return parseFloat(r.rows[0]?.value || '1.0'); } catch (e) { return 1.0; } };

let weatherCache = { data: null, expiry: 0 };
const CACHE_DURATION = 30 * 60 * 1000;

app.get('/', (req, res) => res.send("🚀 GBR 1381 BACKEND ACTIVE (V3)"));
app.get('/api/health', (req, res) => res.json({ status: "OK" }));

// --- LIVE BUOY SCRAPER (Sensor Fusion) ---
const scrapeBuoy = async (stationUrl) => {
  try {
    const res = await axios.get(stationUrl, { timeout: 4000 });
    // Bramblemet/Chimet often embed JSON in their pages or serve simple XML/JSON
    // This regex looks for the specific standard data pattern used by Solentmet sites
    const windMatch = res.data.match(/Avg Wind.*?(\d+\.?\d*)\s*kn/i);
    const dirMatch = res.data.match(/Wind Dir.*?(\d+)/i);
    
    if (windMatch && dirMatch) {
      return { 
        wind_speed: parseFloat(windMatch[1]), 
        wind_direction: parseInt(dirMatch[1]),
        is_live: true 
      };
    }
    return null;
  } catch (e) { return null; }
};

app.get(['/api/solent', '/api/weather/solent'], async (req, res) => {
  const mult = await getWindMultiplier();
  let weatherData = { current: { wind_speed_10m: 12, wind_direction_10m: 210, temperature_2m: 15 } };
  let marineData = { current: { wave_height: 0.3 } };
  let source = "Safe-Mode";

  try {
    // 1. Attempt Direct Buoy Scrape (Bramblemet Priority)
    const [bramble, chimet] = await Promise.all([
      scrapeBuoy('https://www.bramblemet.co.uk'),
      scrapeBuoy('https://www.chimet.co.uk')
    ]);

    if (bramble && bramble.is_live) {
      weatherData.current.wind_speed_10m = bramble.wind_speed * mult;
      weatherData.current.wind_direction_10m = bramble.wind_direction;
      source = `Bramblemet (Live) [x${mult}]`;
    } else if (chimet && chimet.is_live) {
      weatherData.current.wind_speed_10m = chimet.wind_speed * mult;
      weatherData.current.wind_direction_10m = chimet.wind_direction;
      source = `Chimet (Live) [x${mult}]`;
    } else {
      // 2. Fallback to Meteoblue Model
      const mbRes = await axios.get(`https://my.meteoblue.com/packages/basic-1h?apikey=${API_KEY}&lat=50.79&lon=-1.10&format=json`, { timeout: 5000 });
      if (mbRes.data && mbRes.data.data_1h) {
        const mb = mbRes.data.data_1h;
        weatherData.current.wind_speed_10m = mb.windspeed[0] * mult;
        weatherData.current.wind_direction_10m = mb.winddirection[0];
        weatherData.current.temperature_2m = mb.temperature[0];
        source = `Meteoblue (Pro) [x${mult}]`;
      }
    }

    // Marine Data (Waves)
    const mRes = await axios.get('https://marine-api.open-meteo.com/v1/marine?latitude=50.79&longitude=-1.10&current=wave_height&timezone=GMT', { timeout: 5000 }).catch(() => null);
    if (mRes && mRes.data && mRes.data.current) marineData = mRes.data;

    res.json({ weather: weatherData, marine: marineData, source, timestamp: new Date().toISOString() });
  } catch (err) {
    res.json({ source: "Synthetic", weather: { current: { wind_speed_10m: 12 * mult } } });
  }
});

app.get(['/api/tides/solent', '/api/tides/portsmouth'], async (req, res) => {
  try {
    const resTide = await axios.get('https://marine-api.open-meteo.com/v1/marine?latitude=50.79&longitude=-1.10&hourly=sea_level_height_msl&timezone=GMT', { timeout: 5000 });
    res.json(resTide.data);
  } catch (err) { res.json({ hourly: { time: [], sea_level_height_msl: [] } }); }
});

app.get('/api/history', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM tuning_logs ORDER BY date DESC LIMIT 20');
    res.json(r.rows);
  } catch (err) { res.json([]); }
});

app.delete('/api/athletes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM athlete_profiles WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/garmin/upload', async (req, res) => {
  const { sailor_name, fit_data, type } = req.body;
  try {
    const buffer = Buffer.from(fit_data, 'base64');
    const parser = new FitParser({ force: true });
    parser.parse(buffer, async (err, data) => {
      if (err) return res.status(400).json({ error: "Invalid .FIT" });
      let readiness = 85, battery = 100, recovery = 0;
      if (type === 'wellness') {
        const summary = (data.monitoring || [])[data.monitoring?.length - 1] || {};
        readiness = summary.readiness_score_value || 85;
        battery = summary.body_battery_level || 100;
      } else {
        const session = (data.sessions || [])[0] || {};
        readiness = Math.max(50, 100 - (session.total_training_effect || 0) * 10);
        recovery = session.recovery_time || 24;
      }
      await pool.query('UPDATE athlete_profiles SET readiness_score = $1, body_battery = $2, recovery_hours = $3 WHERE name = $4', [readiness, battery, recovery, sailor_name]);
      res.json({ message: "Success", summary: { readiness, battery, recovery } });
    });
  } catch (err) { res.status(500).json({ error: "Parse Error" }); }
});

app.get('/api/athletes', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM athlete_profiles ORDER BY name ASC');
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

app.post('/api/athletes', async (req, res) => {
  const { name, weight_kg, height_cm, rhr, max_hr, vo2max, on_boat, readiness_score, body_battery, recovery_hours } = req.body;
  await pool.query(`INSERT INTO athlete_profiles (name, weight_kg, height_cm, rhr, max_hr, vo2max, on_boat, readiness_score, body_battery, recovery_hours) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (name) DO UPDATE SET weight_kg = $2, on_boat = $7, readiness_score = $8, body_battery = $9, recovery_hours = $10`, [name, weight_kg, height_cm, rhr, max_hr, vo2max, on_boat, readiness_score || 80, body_battery || 100, recovery_hours || 0]);
  res.sendStatus(200);
});

app.get('/api/races', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM race_logs ORDER BY date DESC');
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

app.post('/api/races', async (req, res) => {
  const { event_name, wind_speed, wind_dir, result_pos, total_boats, crew_list, notes } = req.body;
  await pool.query('INSERT INTO race_logs (event_name, wind_speed, wind_dir, result_pos, total_boats, crew_list, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)', [event_name, wind_speed, wind_dir, result_pos, total_boats, crew_list, notes]);
  res.sendStatus(200);
});

app.post('/api/sails/usage', async (req, res) => {
  const { sail_id, hours, avg_wind, max_wind, notes } = req.body;
  await pool.query('INSERT INTO sail_usage (sail_id, hours, avg_wind, max_wind, notes) VALUES ($1, $2, $3, $4, $5)', [sail_id, hours, avg_wind, max_wind, notes]);
  await pool.query('UPDATE sail_inventory SET hours_flown = hours_flown + $1, last_used = CURRENT_DATE WHERE id = $2', [hours, sail_id]);
  res.sendStatus(200);
});

app.post('/api/system/calibrate', async (req, res) => {
  const { multiplier } = req.body;
  await pool.query("INSERT INTO system_config (key, value) VALUES ('wind_multiplier', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [multiplier.toString()]);
  res.sendStatus(200);
});

app.get('/api/sails', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM sail_inventory ORDER BY hours_flown ASC');
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

app.get('/api/sails/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query("SELECT * FROM sail_usage WHERE sail_id = $1 ORDER BY date DESC", [id]);
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

app.post('/api/sails', async (req, res) => {
  const { id, name, type, hours_flown, is_race_sail } = req.body;
  await pool.query('INSERT INTO sail_inventory (id, name, type, hours_flown, is_race_sail) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET hours_flown = $4, is_race_sail = $5', [id, name, type, hours_flown, is_race_sail]);
  res.sendStatus(200);
});

app.get('/api/recommendation', async (req, res) => {
  const windSpd = parseFloat(req.query.wind) || 12;
  const crewWeight = parseFloat(req.query.weight) || 320;
  const seaState = parseFloat(req.query.sea) || 0.3; 
  const base = await pool.query('SELECT * FROM tuning_guide WHERE $1 BETWEEN min_wind AND max_wind', [Math.round(windSpd)]);
  let baseData = base.rows[0] || { upper_shroud: 20, lower_shroud: 15, jib_selection: 'J2+', rake: 1425, backstay: '0', traveller: 'Up' };
  const weightFactor = crewWeight - 320; 
  let weightOffset = Math.floor(weightFactor / 20); 
  res.json({ base: baseData, suggested_offsets: { upper: weightOffset + (seaState > 0.5 ? 1 : 0), lower: weightOffset }, recommended_sail: baseData.jib_selection || 'J2+', conditions: { weight: crewWeight, sea: seaState, wind: windSpd } });
});

const PORT = process.env.PORT || 5222;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 GBR 1381 ONLINE on port ${PORT}`));
