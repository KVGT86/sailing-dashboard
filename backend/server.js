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

    // D. PERFORMANCE FEEDBACK (AI Memory)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_feedback (
        id SERIAL PRIMARY KEY,
        wind_speed FLOAT,
        upper_offset INT DEFAULT 0,
        lower_offset INT DEFAULT 0,
        performance_rating INT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // E. SMART TUNING GUIDE
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
    console.log("⚓ GBR 1381 AI Engine Synced");
  } catch (err) { console.error("❌ Init Error:", err); }
};
initDB();

// --- AI & RECOMMENDATION ROUTES ---

app.get('/api/recommendation', async (req, res) => {
  const windSpd = parseFloat(req.query.wind) || 10;
  try {
    const base = await pool.query(
      'SELECT * FROM tuning_guide WHERE $1 BETWEEN min_wind AND max_wind', 
      [Math.round(windSpd)]
    );
    const targetJib = base.rows[0]?.jib_selection || 'J2';

    const aiData = await pool.query(
      'SELECT AVG(upper_offset) as u_adj, AVG(lower_offset) as l_adj FROM performance_feedback WHERE wind_speed BETWEEN $1 AND $2 AND performance_rating >= 4',
      [windSpd - 3, windSpd + 3]
    );

    // SMART WARDROBE SEARCH: Matches 'J2' to 'NORTH J2+' or 'J2-104'
    const sail = await pool.query(
      "SELECT id, name FROM sail_inventory WHERE (id ILIKE $1 OR name ILIKE $1) AND is_race_sail = TRUE ORDER BY hours_flown ASC LIMIT 1",
      [`%${targetJib}%`]
    );

    res.json({
      base: base.rows[0],
      suggested_offsets: { 
        upper: Math.round(aiData.rows[0].u_adj || 0), 
        lower: Math.round(aiData.rows[0].l_adj || 0) 
      },
      recommended_sail: sail.rows[0] ? `${sail.rows[0].name} (${sail.rows[0].id})` : "No Matching Race Sail Found"
    });
  } catch (err) { res.status(500).send(err.message); }
});

// --- API FIXES (Clearing the 404s) ---

app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tuning_logs ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// Matches the frontend call to /api/solent or /api/weather/solent
app.get(['/api/solent', '/api/weather/solent'], async (req, res) => {
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

// --- CORE CRUD ---

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
      ON CONFLICT (name) DO UPDATE SET weight_kg = $2, on_boat = $7
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

app.post('/api/tuning', async (req, res) => {
  const { date, sailorName, windCondition, sessionDurationHours, upperShroudPT2, lowerShroudPT2, headstayLength, jibUsed, notes, rpe, stressScore, avgHr } = req.body;
  try {
    await pool.query(`
      INSERT INTO tuning_logs (date, sailor_name, wind_condition, duration, upper_shroud, lower_shroud, headstay, jib_used, notes, rpe, stress_score, avg_hr)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [date, sailorName, windCondition, sessionDurationHours, upperShroudPT2, lowerShroudPT2, headstayLength, jibUsed, notes, rpe, stressScore, avgHr]);
    if (jibUsed && sessionDurationHours) {
      await pool.query('UPDATE sail_inventory SET hours_flown = hours_flown + $1 WHERE id = $2', [sessionDurationHours, jibUsed]);
    }
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/admin/reset-db', async (req, res) => {
  try {
    await pool.query('DROP TABLE IF EXISTS performance_feedback, tuning_logs, athlete_profiles, sail_inventory, tuning_guide');
    await initDB();
    res.send("Database reset success.");
  } catch (err) { res.status(500).send(err.message); }
});

const PORT = process.env.PORT || 5222;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 GBR 1381 Engine Live`));