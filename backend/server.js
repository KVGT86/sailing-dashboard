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

// 2. INITIALIZE TABLES
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
        last_used DATE DEFAULT CURRENT_DATE
      )
    `);

    // C. Tuning Logs (The History/Sessions)
    // Updated to handle both athlete telemetry and boat settings
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

    // D. Tuning Guide (The Targets)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tuning_guide (
        wind_range TEXT PRIMARY KEY,
        upper_shroud INT,
        lower_shroud INT,
        headstay TEXT,
        jib_selection TEXT
      )
    `);

    // --- SEED DATA (Only inserts if table is empty) ---
    const guideCheck = await pool.query('SELECT * FROM tuning_guide LIMIT 1');
    if (guideCheck.rowCount === 0) {
      await pool.query(`
        INSERT INTO tuning_guide (wind_range, upper_shroud, lower_shroud, headstay, jib_selection)
        VALUES 
          ('Light (0-10kts)', 14, 8, '+1 hole', 'J1'),
          ('Base (11-16kts)', 20, 15, 'Base', 'J2'),
          ('Heavy (17+ kts)', 24, 19, '-1 hole', 'J2')
      `);
    }

    console.log("⚓ GBR 1381 Database Fully Synced & Functional");
  } catch (err) {
    console.error("❌ Database Init Error:", err);
  }
};
initDB();

// --- ROUTES ---

// 1. ATHLETES
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

app.delete('/api/athletes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM athlete_profiles WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

// 2. TUNING LOGS & HISTORY
app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tuning_logs ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/tuning', async (req, res) => {
  const { 
    date, sailorName, windCondition, sessionDurationHours, 
    upperShroudPT2, lowerShroudPT2, headstayLength, jibUsed, 
    notes, rpe, stressScore, avgHr 
  } = req.body;
  
  try {
    await pool.query(`
      INSERT INTO tuning_logs 
      (date, sailor_name, wind_condition, duration, upper_shroud, lower_shroud, headstay, jib_used, notes, rpe, stress_score, avg_hr)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [date, sailorName, windCondition, sessionDurationHours, upperShroudPT2, lowerShroudPT2, headstayLength, jibUsed, notes, rpe, stressScore, avgHr]);
    
    // Update Sail hours if a jib was used
    if (jibUsed && sessionDurationHours) {
      await pool.query('UPDATE sail_inventory SET hours_flown = hours_flown + $1 WHERE id = $2', [sessionDurationHours, jibUsed]);
    }
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

// 3. SAILS
app.get('/api/sails', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sail_inventory ORDER BY hours_flown ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/sails', async (req, res) => {
  const { id, name, type, hours_flown } = req.body;
  try {
    await pool.query(`
      INSERT INTO sail_inventory (id, name, type, hours_flown)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET name = $2, type = $3, hours_flown = $4
    `, [id, name, type, hours_flown || 0]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/sails/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sail_inventory WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

// 4. TUNING GUIDE (Targets)
app.get('/api/guide', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tuning_guide ORDER BY upper_shroud ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// 5. WEATHER & TIDES
app.get('/api/weather/solent', async (req, res) => {
  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=50.8&longitude=-1.1&current=wind_speed_10m,wind_direction_10m,temperature_2m');
    res.json(response.data);
  } catch (err) { res.status(500).send("Weather Proxy Failed"); }
});

app.get('/api/tides/portsmouth', async (req, res) => {
  try {
    // This is a static mock. In a real scenario, you'd proxy an RSS or API feed.
    res.json({ extremes: [
      { type: 'High', time: '13:12', height: '4.4m' },
      { type: 'Low', time: '19:45', height: '0.9m' }
    ]});
  } catch (err) { res.status(500).send("Tide Fetch Failed"); }
});

// ADMIN: Reset
app.get('/api/admin/reset-db', async (req, res) => {
  try {
    await pool.query('DROP TABLE IF EXISTS tuning_logs, athlete_profiles, sail_inventory, tuning_guide');
    await initDB();
    res.send("Database wiped and reset.");
  } catch (err) { res.status(500).send(err.message); }
});

const PORT = process.env.PORT || 5222;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GBR 1381 Engine Live on Port ${PORT}`);
});