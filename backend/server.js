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
        id TEXT PRIMARY KEY, -- Example: 'J2-104'
        name TEXT,
        hours_flown FLOAT DEFAULT 0,
        type TEXT, -- 'Main', 'Jib', 'Spinnaker'
        last_used DATE DEFAULT CURRENT_DATE
      )
    `);

    // C. Tuning Logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tuning_logs (
        id SERIAL PRIMARY KEY,
        date DATE,
        duration FLOAT,
        jib_used TEXT REFERENCES sail_inventory(id) ON DELETE SET NULL,
        notes TEXT,
        rpe INT,
        stress_score INT
      )
    `);

    console.log("⚓ GBR 1381 Database Fully Synced");
  } catch (err) {
    console.error("❌ Database Init Error:", err);
  }
};
initDB();

// --- ATHLETE ROUTES ---
app.get('/api/athletes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM athlete_profiles ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/athletes', async (req, res) => {
  const { name, weight_kg, height_cm, rhr, max_hr, vo2max } = req.body;
  try {
    await pool.query(`
      INSERT INTO athlete_profiles (name, weight_kg, height_cm, rhr, max_hr, vo2max)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (name) DO UPDATE SET 
        weight_kg = $2, height_cm = $3, rhr = $4, max_hr = $5, vo2max = $6
    `, [name, weight_kg, height_cm, rhr, max_hr, vo2max]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/athletes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM athlete_profiles WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

// --- SAIL ROUTES ---
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

// DANGER: Visit lightfoot-backend.onrender.com/api/admin/reset-db to wipe everything
app.get('/api/admin/reset-db', async (req, res) => {
  try {
    await pool.query('DROP TABLE IF EXISTS tuning_logs');
    await pool.query('DROP TABLE IF EXISTS athlete_profiles');
    await pool.query('DROP TABLE IF EXISTS sail_inventory');
    await initDB(); // Re-create the empty tables
    res.send("Database wiped and reset to factory settings.");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

const PORT = process.env.PORT || 5222;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GBR 1381 Engine Live on Port ${PORT}`);
});