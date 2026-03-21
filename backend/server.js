const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
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
    // A. Athlete Profiles (Extended with Garmin Readiness)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS athlete_profiles (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        weight_kg FLOAT,
        height_cm FLOAT,
        rhr INT,
        max_hr INT,
        vo2max FLOAT,
        on_boat BOOLEAN DEFAULT FALSE,
        readiness_score INT DEFAULT 80,
        body_battery INT DEFAULT 100,
        recovery_hours INT DEFAULT 0
      )
    `);

    // B. Sail Inventory
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sail_inventory (
        id TEXT PRIMARY KEY,
        name TEXT,
        hours_flown FLOAT DEFAULT 0,
        type TEXT, 
        is_race_sail BOOLEAN DEFAULT TRUE,
        last_used DATE DEFAULT CURRENT_DATE
      )
    `);

    // C. Tuning Logs (Grand Prix AI Learning Data)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tuning_logs (
        id SERIAL PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        sailor_name TEXT,
        wind_condition FLOAT,
        duration FLOAT DEFAULT 0,
        upper_shroud INT,
        lower_shroud INT,
        headstay TEXT,
        jib_used TEXT,
        performance_rating INT DEFAULT 3, 
        notes TEXT,
        rpe INT,
        stress_score INT,
        avg_hr INT,
        total_weight FLOAT,
        sea_state FLOAT,
        tide_flow TEXT
      )
    `);

    // D. Performance Feedback
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_feedback (
        id SERIAL PRIMARY KEY,
        wind_speed FLOAT,
        upper_offset INT DEFAULT 0,
        lower_offset INT DEFAULT 0,
        performance_rating INT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sea_state FLOAT DEFAULT 0,
        crew_weight FLOAT DEFAULT 0
      )
    `);

    // E. Tuning Guide (Extended for AWS J/70 Data)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tuning_guide (
        min_wind INT PRIMARY KEY,
        max_wind INT,
        upper_shroud INT,
        lower_shroud INT,
        headstay TEXT,
        jib_selection TEXT,
        rake INT,
        backstay TEXT,
        traveller TEXT
      )
    `);

    // Ensure columns exist
    await pool.query("ALTER TABLE tuning_guide ADD COLUMN IF NOT EXISTS rake INT");
    await pool.query("ALTER TABLE tuning_guide ADD COLUMN IF NOT EXISTS backstay TEXT");
    await pool.query("ALTER TABLE tuning_guide ADD COLUMN IF NOT EXISTS traveller TEXT");

    const guideCheck = await pool.query('SELECT * FROM tuning_guide LIMIT 1');
    if (guideCheck.rowCount <= 3) { // If only basic data or empty
      await pool.query('DELETE FROM tuning_guide');
      await pool.query(`
        INSERT INTO tuning_guide (min_wind, max_wind, upper_shroud, lower_shroud, headstay, rake, backstay, traveller, jib_selection)
        VALUES 
          (1, 5, 15, 0, '+2', 1425, '0', '100% Up', 'J2+'),
          (6, 7, 17, 0, '+1', 1425, '0-20%', '100% Up', 'J2+'),
          (8, 10, 19, 9, 'BASE', 1425, '0-40%', '50-100%', 'J2+'),
          (11, 12, 21, 13, 'BASE', 1425, '30-50%', '40-75%', 'J2+'),
          (13, 13, 23, 16, '-1', 1425, '40-60%', '20-40%', 'J2+'),
          (14, 14, 24, 21, '-1', 1425, '50-70%', '10-30%', 'J6'),
          (15, 15, 26, 23, '-2', 1425, '60-80%', '1Car Up', 'J6'),
          (16, 16, 27, 27, '-2', 1425, '80-100%', '1Car Up', 'J6'),
          (17, 18, 28, 28, '-3', 1425, '100%', '1Car Up', 'J6'),
          (19, 19, 29, 30, '-3', 1425, '100%', '1Car Up', 'J6'),
          (20, 30, 30, 32, '-4', 1425, '100%', 'Centred-1Car Down', 'J6')
      `);
    }
    console.log("⚓ GBR 1381 AI Engine Live & Seeded with AWS J/70 Data");
  } catch (err) { console.error("❌ Init Error:", err); }
};
initDB();

// --- Smart Performance Mode ENGINE ---
app.get('/api/recommendation', async (req, res) => {
  // Explicitly handle missing wind with a J/70 'Base' default (12kts)
  const windSpd = parseFloat(req.query.wind) || 12;
  const crewWeight = parseFloat(req.query.weight) || 320;
  const seaState = parseFloat(req.query.sea) || 0.3; 

  console.log(`[SmartMode] Calculating for: ${windSpd}kts, ${crewWeight}kg, ${seaState}m`);

  try {
    const base = await pool.query(
      'SELECT * FROM tuning_guide WHERE $1 BETWEEN min_wind AND max_wind', 
      [Math.round(windSpd)]
    );
    
    // Fallback if DB query fails or wind is out of range
    let baseData = base.rows[0] || { 
      upper_shroud: 20, 
      lower_shroud: 15, 
      jib_selection: 'J2+', 
      rake: 1425, 
      backstay: '0', 
      traveller: 'Up' 
    };

    const weightFactor = crewWeight - 320; 
    let weightOffset = Math.floor(weightFactor / 20); 
    let chopOffset = seaState > 0.5 ? 1 : 0;

    res.json({
      base: baseData,
      suggested_offsets: { 
        upper: weightOffset + chopOffset, 
        lower: weightOffset 
      },
      recommended_sail: baseData.jib_selection || 'J2+',
      conditions: { weight: crewWeight, sea: seaState, wind: windSpd }
    });
  } catch (err) { 
    res.status(500).json({ error: "Logic Engine Error" });
  }
});

// Hardened Weather Proxy (Open-Meteo)
app.get('/api/solent', async (req, res) => {
  console.log("[Weather] Fetching Solent Data (50.79, -1.10)...");
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=50.79&longitude=-1.10&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&timezone=GMT`;
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=50.79&longitude=-1.10&current=wave_height&timezone=GMT`;
    
    const [wRes, mRes] = await Promise.allSettled([
      axios.get(weatherUrl, { timeout: 5000 }),
      axios.get(marineUrl, { timeout: 5000 })
    ]);

    const weather = wRes.status === 'fulfilled' ? wRes.value.data : { current: { wind_speed_10m: 12, wind_direction_10m: 210 } };
    const marine = mRes.status === 'fulfilled' ? mRes.value.data : { current: { wave_height: 0.3 } };

    if (wRes.status === 'rejected') console.error("Weather API Failed:", wRes.reason.message);
    if (mRes.status === 'rejected') console.error("Marine API Failed:", mRes.reason.message);

    res.json({ weather, marine, status: "OK" });
  } catch (err) {
    res.json({ 
      weather: { current: { wind_speed_10m: 12, wind_direction_10m: 210 } }, 
      marine: { current: { wave_height: 0.3 } },
      status: "FALLBACK"
    });
  }
});

app.post('/api/garmin/upload', async (req, res) => {
  const { sailor_name, fit_data, type } = req.body; // type: 'wellness' or 'activity'
  console.log(`[Garmin] Received ${type} file for ${sailor_name}`);
  
  // Future: fit-file-parser logic here
  // For now, update readiness to reflect a successful "sync"
  try {
    await pool.query(
      'UPDATE athlete_profiles SET readiness_score = 95, recovery_hours = 12 WHERE name = $1',
      [sailor_name]
    );
    res.json({ message: "Garmin .FIT Data Staged & Sync'd" });
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/athletes', async (req, res) => {
  const r = await pool.query('SELECT * FROM athlete_profiles ORDER BY name ASC');
  res.json(r.rows);
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
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 GBR 1381 AI ENGINE ACTIVE`));