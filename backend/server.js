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
    // A. Tuning Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tuning_logs (
        id SERIAL PRIMARY KEY,
        date DATE,
        wind_condition TEXT,
        duration FLOAT,
        upper_shroud INT,
        lower_shroud INT,
        headstay TEXT,
        jib_used TEXT,
        notes TEXT,
        crew_weight FLOAT
      )
    `);

    // B. Athlete Profiles 
    // We use NAME as the unique constraint so we can update based on name
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

    // C. Sail Inventory
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sail_inventory (
        id TEXT PRIMARY KEY,
        name TEXT,
        hours_flown FLOAT,
        type TEXT,
        last_used DATE DEFAULT CURRENT_DATE
      )
    `);

    // D. Tuning Guide
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tuning_guide (
        wind_range TEXT PRIMARY KEY,
        upper_shroud INT,
        lower_shroud INT,
        headstay TEXT,
        jib_selection TEXT
      )
    `);

    // --- SEED DATA ---
    
    // Default Sails
    await pool.query(`
      INSERT INTO sail_inventory (id, name, hours_flown, type)
      VALUES 
        ('J2-104', 'North J2-A (Race #104)', 12.5, 'Jib'),
        ('J2-99', 'North J2-B (Practice #99)', 45.0, 'Jib'),
        ('M1-202', 'North Main M-1', 22.0, 'Main')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Default Tuning Guide
    await pool.query(`
      INSERT INTO tuning_guide (wind_range, upper_shroud, lower_shroud, headstay, jib_selection)
      VALUES 
        ('Light (0-10kts)', 14, 8, '+1 hole', 'J1'),
        ('Base (11-16kts)', 20, 15, 'Base', 'J2'),
        ('Heavy (17+ kts)', 24, 19, '-1 hole', 'J2')
      ON CONFLICT (wind_range) DO NOTHING;
    `);

    console.log("⚓ GBR 1381 Database Fully Synced & Seeded");
  } catch (err) {
    console.error("❌ Database Initialization Error:", err);
  }
};
initDB();

// --- ROUTES ---

// 1. ATHLETE SYNC
app.get('/api/athletes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM athlete_profiles ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/athletes', async (req, res) => {
  const { 
    name, 
    weight_kg, weightKg, 
    height_cm, heightCm, 
    rhr, 
    max_hr, maxHr, 
    vo2max 
  } = req.body;

  try {
    // We use "ON CONFLICT (name)" to either insert a new person or update their stats
    const query = `
      INSERT INTO athlete_profiles (name, weight_kg, height_cm, rhr, max_hr, vo2max)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (name) DO UPDATE SET 
        weight_kg = $2, height_cm = $3, rhr = $4, max_hr = $5, vo2max = $6
    `;
    
    await pool.query(query, [
      name, 
      weight_kg || weightKg || 0, 
      height_cm || heightCm || 0, 
      rhr || 60, 
      max_hr || maxHr || 190, 
      vo2max || 50
    ]);
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ DB Insert Error:", err.message);
    res.status(500).send(err.message);
  }
});

// 2. SESSION LOGS
app.post('/api/tuning', async (req, res) => {
  const { date, windCondition, sessionDurationHours, upperShroudPT2, lowerShroudPT2, headstayLength, jibUsed, notes, crewWeight } = req.body;
  try {
    const query = `
      INSERT INTO tuning_logs (date, wind_condition, duration, upper_shroud, lower_shroud, headstay, jib_used, notes, crew_weight)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await pool.query(query, [date, windCondition, sessionDurationHours, upperShroudPT2, lowerShroudPT2, headstayLength, jibUsed, notes, crewWeight]);
    
    if (jibUsed) {
        await pool.query('UPDATE sail_inventory SET hours_flown = hours_flown + $1 WHERE id = $2', [sessionDurationHours, jibUsed]);
    }
    
    res.status(200).send("Log Saved & Sail Hours Updated");
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tuning_logs ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// 3. SAIL INVENTORY
app.get('/api/sails', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sail_inventory ORDER BY hours_flown ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/sails', async (req, res) => {
  const { id, name, type } = req.body;
  try {
    await pool.query('INSERT INTO sail_inventory (id, name, hours_flown, type) VALUES ($1, $2, 0, $3) ON CONFLICT (id) DO NOTHING', [id, name, type]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/sails/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sail_inventory WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

// 4. TUNING GUIDE
app.get('/api/guide', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tuning_guide ORDER BY upper_shroud ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// 5. WEATHER PROXY
app.get('/api/weather/solent', async (req, res) => {
  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=50.8&longitude=-1.1&current=wind_speed_10m,wind_direction_10m,temperature_2m');
    res.json(response.data);
  } catch (err) { res.status(500).send("Weather Proxy Failed"); }
});

// DELETE an athlete
app.delete('/api/athletes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM athlete_profiles WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

// SERVER START
const PORT = process.env.PORT || 5222;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GBR 1381 Engine Live on Port ${PORT}`);
});