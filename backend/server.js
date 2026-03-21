const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const FitParser = require('fit-file-parser').default;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS athlete_profiles (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, weight_kg FLOAT, height_cm FLOAT, rhr INT, max_hr INT, vo2max FLOAT, on_boat BOOLEAN DEFAULT FALSE, readiness_score INT DEFAULT 80, body_battery INT DEFAULT 100, recovery_hours INT DEFAULT 0)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS sail_inventory (id TEXT PRIMARY KEY, name TEXT, hours_flown FLOAT DEFAULT 0, type TEXT, is_race_sail BOOLEAN DEFAULT TRUE, last_used DATE DEFAULT CURRENT_DATE)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS tuning_logs (id SERIAL PRIMARY KEY, date DATE DEFAULT CURRENT_DATE, sailor_name TEXT, wind_condition FLOAT, duration FLOAT DEFAULT 0, upper_shroud INT, lower_shroud INT, headstay TEXT, jib_used TEXT, performance_rating INT DEFAULT 3, notes TEXT, total_weight FLOAT, sea_state FLOAT, tide_flow TEXT)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS performance_feedback (id SERIAL PRIMARY KEY, wind_speed FLOAT, upper_offset INT DEFAULT 0, lower_offset INT DEFAULT 0, performance_rating INT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, sea_state FLOAT DEFAULT 0, crew_weight FLOAT DEFAULT 0)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS tuning_guide (min_wind INT PRIMARY KEY, max_wind INT, upper_shroud INT, lower_shroud INT, headstay TEXT, jib_selection TEXT, rake INT, backstay TEXT, traveller TEXT)`);

    const guideCheck = await pool.query('SELECT * FROM tuning_guide LIMIT 1');
    if (guideCheck.rowCount === 0) {
      await pool.query(`INSERT INTO tuning_guide (min_wind, max_wind, upper_shroud, lower_shroud, headstay, rake, backstay, traveller, jib_selection) VALUES 
        (1, 5, 15, 0, '+2', 1425, '0', '100% Up', 'J2+'), (6, 7, 17, 0, '+1', 1425, '0-20%', '100% Up', 'J2+'), (8, 10, 19, 9, 'BASE', 1425, '0-40%', '50-100%', 'J2+'), (11, 12, 21, 13, 'BASE', 1425, '30-50%', '40-75%', 'J2+'), (13, 13, 23, 16, '-1', 1425, '40-60%', '20-40%', 'J2+'), (14, 14, 24, 21, '-1', 1425, '50-70%', '10-30%', 'J6'), (15, 15, 26, 23, '-2', 1425, '60-80%', '1Car Up', 'J6'), (16, 16, 27, 27, '-2', 1425, '80-100%', '1Car Up', 'J6'), (17, 18, 28, 28, '-3', 1425, '100%', '1Car Up', 'J6'), (19, 19, 29, 30, '-3', 1425, '100%', '1Car Up', 'J6'), (20, 30, 30, 32, '-4', 1425, '100%', 'Centred-1Car Down', 'J6')`);
    }
    console.log("⚓ GBR 1381 Smart Engine Live & Seeded");
  } catch (err) { console.error("❌ Init Error:", err); }
};
initDB();

// --- SMART PERFORMANCE ENGINE ---
app.get('/api/recommendation', async (req, res) => {
  const windSpd = parseFloat(req.query.wind) || 12;
  const crewWeight = parseFloat(req.query.weight) || 320;
  const seaState = parseFloat(req.query.sea) || 0.3; 
  try {
    const base = await pool.query('SELECT * FROM tuning_guide WHERE $1 BETWEEN min_wind AND max_wind', [Math.round(windSpd)]);
    let baseData = base.rows[0] || { upper_shroud: 20, lower_shroud: 15, jib_selection: 'J2+', rake: 1425, backstay: '0', traveller: 'Up' };
    const weightFactor = crewWeight - 320; 
    let weightOffset = Math.floor(weightFactor / 20); 
    let chopOffset = seaState > 0.5 ? 1 : 0;
    res.json({
      base: baseData,
      suggested_offsets: { upper: weightOffset + chopOffset, lower: weightOffset },
      recommended_sail: baseData.jib_selection || 'J2+',
      conditions: { weight: crewWeight, sea: seaState, wind: windSpd }
    });
  } catch (err) { res.status(500).json({ error: "Engine Offline" }); }
});

const fs = require('fs');
const logFile = 'weather_debug.log';

app.get(['/api/solent', '/api/weather/solent'], async (req, res) => {
  console.log("-> Solent Request Received");
  let weatherData = { current: { wind_speed_10m: 12, wind_direction_10m: 210, temperature_2m: 15 } };
  let marineData = { current: { wave_height: 0.3 } };
  let source = "Safe-Mode";

  try {
    fs.appendFileSync(logFile, `${new Date().toISOString()}: Attempting Open-Meteo...\n`);
    
    const wRes = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=50.79&longitude=-1.10&current=wind_speed_10m,wind_direction_10m,temperature_2m,relative_humidity_2m&wind_speed_unit=kn&timezone=GMT', { 
      headers: { 'Accept': 'application/json' },
      timeout: 8000 
    });

    if (wRes.data && wRes.data.current) {
      weatherData = wRes.data;
      source = "Open-Meteo (Live)";
      fs.appendFileSync(logFile, `Success: ${weatherData.current.wind_speed_10m}kts\n`);
    } else {
      fs.appendFileSync(logFile, `Partial Failure: No current data block\n`);
    }

    const mRes = await axios.get('https://marine-api.open-meteo.com/v1/marine?latitude=50.79&longitude=-1.10&current=wave_height&timezone=GMT', { timeout: 8000 });
    if (mRes.data && mRes.data.current) {
      marineData = mRes.data;
    }

    res.json({ weather: weatherData, marine: marineData, source, timestamp: new Date().toISOString() });
  } catch (err) {
    fs.appendFileSync(logFile, `Error: ${err.message}\n`);
    console.error("!! Fetch Error:", err.message);
    res.json({ weather: weatherData, marine: marineData, source: `Error: ${err.message.substring(0,10)}` });
  }
});

app.get(['/api/tides/solent', '/api/tides/portsmouth'], async (req, res) => {
  try {
    const resTide = await axios.get('https://marine-api.open-meteo.com/v1/marine?latitude=50.79&longitude=-1.10&hourly=sea_level_height_msl&timezone=GMT', { timeout: 5000 });
    res.json(resTide.data);
  } catch (err) { res.json({ hourly: { time: [new Date().toISOString()], sea_level_height_msl: [0] } }); }
});

app.get('/api/history', async (req, res) => {
  const r = await pool.query('SELECT * FROM tuning_logs ORDER BY date DESC LIMIT 20');
  res.json(r.rows);
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
        const summary = data.monitoring?.[data.monitoring.length - 1] || {};
        readiness = summary.readiness_score_value || 85;
        battery = summary.body_battery_level || 100;
      } else {
        const session = data.sessions?.[0] || {};
        readiness = Math.max(50, 100 - (session.total_training_effect || 0) * 10);
        recovery = session.recovery_time || 24;
      }
      await pool.query('UPDATE athlete_profiles SET readiness_score = $1, body_battery = $2, recovery_hours = $3 WHERE name = $4', [readiness, battery, recovery, sailor_name]);
      res.json({ message: "Success", summary: { readiness, battery, recovery } });
    });
  } catch (err) { res.status(500).json({ error: "Parse Error" }); }
});

app.get('/api/athletes', async (req, res) => {
  const r = await pool.query('SELECT * FROM athlete_profiles ORDER BY name ASC');
  res.json(r.rows);
});

app.post('/api/athletes', async (req, res) => {
  const { name, weight_kg, height_cm, rhr, max_hr, vo2max, on_boat, readiness_score, body_battery, recovery_hours } = req.body;
  await pool.query(`INSERT INTO athlete_profiles (name, weight_kg, height_cm, rhr, max_hr, vo2max, on_boat, readiness_score, body_battery, recovery_hours) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (name) DO UPDATE SET weight_kg = $2, on_boat = $7, readiness_score = $8, body_battery = $9, recovery_hours = $10`, [name, weight_kg, height_cm, rhr, max_hr, vo2max, on_boat, readiness_score || 80, body_battery || 100, recovery_hours || 0]);
  res.sendStatus(200);
});

app.get('/api/sails', async (req, res) => {
  const r = await pool.query('SELECT * FROM sail_inventory ORDER BY hours_flown ASC');
  res.json(r.rows);
});

app.post('/api/sails', async (req, res) => {
  const { id, name, type, hours_flown, is_race_sail } = req.body;
  await pool.query('INSERT INTO sail_inventory (id, name, type, hours_flown, is_race_sail) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET hours_flown = $4, is_race_sail = $5', [id, name, type, hours_flown, is_race_sail]);
  res.sendStatus(200);
});

app.post('/api/feedback', async (req, res) => {
  const { wind_speed, upper_offset, lower_offset, performance_rating } = req.body;
  await pool.query('INSERT INTO performance_feedback (wind_speed, upper_offset, lower_offset, performance_rating) VALUES ($1, $2, $3, $4)', [wind_speed, upper_offset, lower_offset, performance_rating]);
  res.sendStatus(200);
});

app.get('/api/admin/reset-db', async (req, res) => {
  await pool.query('DROP TABLE IF EXISTS performance_feedback, tuning_logs, athlete_profiles, sail_inventory, tuning_guide');
  await initDB();
  res.send("DB Reset Success");
});

const PORT = process.env.PORT || 5222;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 GBR 1381 ACTIVE`));
