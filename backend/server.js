const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const FitParser = require('fit-file-parser').default || require('fit-file-parser');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const API_KEY = "QYHdr2V4cZktJ7nu";

// --- DYNAMIC SYNTHETIC DATA (Realistic Solent Simulation) ---
const getSyntheticSolent = () => {
  const hour = new Date().getHours();
  // Simulate a sea breeze cycle
  const windBase = hour > 10 && hour < 18 ? 16 : 8;
  const variance = Math.sin(Date.now() / 100000) * 3;
  return {
    weather: {
      current: {
        wind_speed_10m: windBase + variance,
        wind_direction_10m: 215 + (variance * 5),
        temperature_2m: 14 + Math.sin(hour/24) * 5,
        relative_humidity_2m: 75
      }
    },
    marine: { current: { wave_height: 0.3 + (Math.abs(variance) / 10) } },
    source: "Solent-Synthetic (Active)",
    timestamp: new Date().toISOString()
  };
};

// --- TACTICAL ROUTES ---

app.get('/api/debug/outbound', async (req, res) => {
  const results = { google: "pending", mb: "pending" };
  try { await axios.get('https://google.com', { timeout: 3000 }); results.google = "Success"; } catch (e) { results.google = `Failed: ${e.message}`; }
  try { await axios.get(`https://my.meteoblue.com/packages/basic-1h?apikey=${API_KEY}&lat=50.79&lon=-1.10`, { timeout: 3000 }); results.mb = "Success"; } catch (e) { results.mb = `Failed: ${e.message}`; }
  res.json(results);
});

app.get(['/api/solent', '/api/weather/solent'], async (req, res) => {
  try {
    const mbRes = await axios.get(`https://my.meteoblue.com/packages/basic-1h?apikey=${API_KEY}&lat=50.79&lon=-1.10&format=json`, { timeout: 5000 });
    if (mbRes.data && mbRes.data.data_1h) {
      const mb = mbRes.data.data_1h;
      return res.json({
        weather: { current: { wind_speed_10m: mb.windspeed[0], wind_direction_10m: mb.winddirection[0], temperature_2m: mb.temperature[0], relative_humidity_2m: mb.relativehumidity[0] } },
        marine: { current: { wave_height: 0.4 } },
        source: "Meteoblue (Pro)",
        timestamp: new Date().toISOString()
      });
    }
    throw new Error("Empty API Response");
  } catch (err) {
    console.warn("Using Synthetic Fallback:", err.message);
    res.json(getSyntheticSolent());
  }
});

app.get(['/api/tides/solent', '/api/tides/portsmouth'], async (req, res) => {
  try {
    const resTide = await axios.get('https://marine-api.open-meteo.com/v1/marine?latitude=50.79&longitude=-1.10&hourly=sea_level_height_msl&timezone=GMT', { timeout: 4000 });
    res.json(resTide.data);
  } catch (err) {
    // Synthetic Tides
    const times = []; const heights = [];
    for(let i=0; i<48; i++) {
      const d = new Date(); d.setHours(d.getHours() + i);
      times.push(d.toISOString());
      heights.push(Math.sin(i/2) * 2.5);
    }
    res.json({ hourly: { time: times, sea_level_height_msl: heights }, source: "Synthetic" });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM tuning_logs ORDER BY date DESC LIMIT 20');
    res.json(r.rows);
  } catch (err) { res.json([]); }
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

app.get('/api/sails', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM sail_inventory ORDER BY hours_flown ASC');
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

app.post('/api/sails', async (req, res) => {
  const { id, name, type, hours_flown, is_race_sail } = req.body;
  await pool.query('INSERT INTO sail_inventory (id, name, type, hours_flown, is_race_sail) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET hours_flown = $4, is_race_sail = $5', [id, name, type, hours_flown, is_race_sail]);
  res.sendStatus(200);
});

app.get(['/api/recommendation'], async (req, res) => {
  const windSpd = parseFloat(req.query.wind) || 12;
  const crewWeight = parseFloat(req.query.weight) || 320;
  const seaState = parseFloat(req.query.sea) || 0.3; 
  try {
    const base = await pool.query('SELECT * FROM tuning_guide WHERE $1 BETWEEN min_wind AND max_wind', [Math.round(windSpd)]);
    let baseData = base.rows[0] || { upper_shroud: 20, lower_shroud: 15, jib_selection: 'J2+', rake: 1425, backstay: '0', traveller: 'Up' };
    const weightFactor = crewWeight - 320; 
    let weightOffset = Math.floor(weightFactor / 20); 
    res.json({
      base: baseData,
      suggested_offsets: { upper: weightOffset + (seaState > 0.5 ? 1 : 0), lower: weightOffset },
      recommended_sail: baseData.jib_selection || 'J2+',
      conditions: { weight: crewWeight, sea: seaState, wind: windSpd }
    });
  } catch (err) { res.json({ base: { upper_shroud: 20, lower_shroud: 15, jib_selection: 'J2+' }, suggested_offsets: { upper: 0, lower: 0 } }); }
});

app.get('/', (req, res) => res.send("🚀 GBR 1381 BACKEND ACTIVE"));

const PORT = process.env.PORT || 5222;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 GBR 1381 ONLINE`));
