const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATABASE CONNECTION
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. INITIALIZE TABLES (Updated for Learning AI)
const initDB = async () => {
  try {
    // A. Athlete Profiles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS athlete_profiles (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        weight_kg FLOAT,
        height_cm FLOAT,
        rhr INT,
        max_hr INT,
        vo2max FLOAT,
        on_boat BOOLEAN DEFAULT FALSE
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

    // C. Tuning Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tuning_logs (
        id SERIAL PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        sailor_name TEXT,
        wind_condition TEXT,
        duration FLOAT DEFAULT 0,
        upper_shroud INT,
        lower_shroud INT,
        headstay TEXT,
        jib_used TEXT REFERENCES sail_inventory(id) ON DELETE SET NULL,
        notes TEXT,
        rpe INT,
        stress_score INT,
        avg_hr INT
      )
    `);

    // D. PERFORMANCE FEEDBACK (The AI's "Memory")
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_feedback (
        id SERIAL PRIMARY KEY,
        wind_speed FLOAT,
        upper_offset INT DEFAULT 0,
        lower_offset INT DEFAULT 0,
        performance_rating INT, -- 1 to 5
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // E. SMART TUNING GUIDE (Updated for Wind Ranges)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tuning_guide (
        min_wind INT PRIMARY KEY,
        max_wind INT,
        upper_shroud INT,
        lower_shroud INT,
        headstay TEXT,
        jib_selection TEXT
      )
    `);

    // --- SEED DATA ---
    const guideCheck = await pool.query('SELECT * FROM tuning_guide LIMIT 1');
    if (guideCheck.rowCount === 0) {
      await pool.query(`
        INSERT INTO tuning_guide (min_wind, max_wind, upper_shroud, lower_shroud, headstay, jib_selection)
        VALUES 
          (0, 10, 14, 8, '+1 hole', 'J1'),
          (11, 16, 20, 15, 'Base', 'J2'),
          (17, 30, 24, 19, '-1 hole', 'J2')
      `);
    }

    console.log("⚓ GBR 1381 AI Engine Synced & Learning");
  } catch (err) {
    console.error("❌ Database Init Error:", err);
  }
};
initDB();

// --- AI & RECOMMENDATION ROUTES ---

// Smart Recommendation Engine
app.get('/api/recommendation', async (req, res) => {
  const windSpd = parseFloat(req.query.wind) || 10;

  try {
    // 1. Get Base Guide for current wind
    const base = await pool.query(
      'SELECT * FROM tuning_guide WHERE $1 BETWEEN min_wind AND max_wind', 
      [Math.round(windSpd)]
    );

    // 2. Calculate AI Offset (Average of 4+ star sessions in similar wind)
    const aiData = await pool.query(
      'SELECT AVG(upper_offset) as u_adj, AVG(lower_offset) as l_adj FROM performance_feedback WHERE wind_speed BETWEEN $1 AND $2 AND performance_rating >= 4',
      [windSpd - 3, windSpd + 3]
    );

    // 3. Find Best Sail (Type from guide, lowest hours, is race sail)
    const jibType = base.rows[0]?.jib_selection || 'J2';
    const sail = await pool.query(
      'SELECT id, hours_flown FROM sail_inventory WHERE type = $1 AND is_race_sail = TRUE ORDER BY hours_flown ASC LIMIT 1',
      [jibType]
    );

    res.json({
      base: base.rows[0],
      suggested_offsets: { 
        upper: Math.round(aiData.rows[0].u_adj || 0), 
        lower: Math.round(aiData.rows[0].l_adj || 0) 
      },
      recommended_sail: sail.rows[0]?.id || "No Race Sail Found"
    });
  } catch (err) { res.status(500).send(err.message); }
});

// Save AI Learning Feedback
app.post('/api/feedback', async (req, res) => {
  const { wind_speed, upper_offset, lower_offset, performance_rating } = req.body;
  try {
    await pool.query(
      'INSERT INTO performance_feedback (wind_speed, upper_offset, lower_offset, performance_rating) VALUES ($1, $2, $3, $4)',
      [wind_speed, upper_offset, lower_offset, performance_rating]
    );
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

// --- CORE ROUTES ---

app.get('/api/athletes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM athlete_profiles ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/athletes', async (req, res) => {
  const { name, weight_kg, height_cm, rhr, max_hr, vo2max, on_boat } = req.body;
  try {
    await pool.query(`
      INSERT INTO athlete_profiles (name, weight_kg, height_cm, rhr, max_hr, vo2max, on_boat)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (name) DO UPDATE SET 
        weight_kg = $2, height_cm = $3, rhr = $4, max_hr = $5, vo2max = $6, on_boat = $7
    `, [name, weight_kg, height_cm, rhr, max_hr, vo2max, on_boat]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/sails', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sail_inventory ORDER BY hours_flown ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/sails', async (req, res) => {
  const { id, name, type, hours_flown, is_race_sail } = req.body;
  try {
    await pool.query(`
      INSERT INTO sail_inventory (id, name, type, hours_flown, is_race_sail)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET name = $2, type = $3, hours_flown = $4, is_race_sail = $5
    `, [id, name, type, hours_flown || 0, is_race_sail]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/weather/solent', async (req, res) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=50.79&longitude=-1.10&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&timezone=GMT`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) { res.status(500).send("Weather Proxy Failed"); }
});

app.get('/api/guide', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tuning_guide ORDER BY min_wind ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// ADMIN: Reset
app.get('/api/admin/reset-db', async (req, res) => {
  try {
    await pool.query('DROP TABLE IF EXISTS performance_feedback, tuning_logs, athlete_profiles, sail_inventory, tuning_guide');
    await initDB();
    res.send("Database wiped and reset with AI tables.");
  } catch (err) { res.status(500).send(err.message); }
});

const PORT = process.env.PORT || 5222;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GBR 1381 Engine Live on Port ${PORT}`);
});