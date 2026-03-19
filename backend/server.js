const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Import Postgres tool
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Connect to Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render/Heroku
});

// 2. Initialize Tables (Run once on startup)
const initDB = async () => {
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
};
initDB();

// 3. Update the POST route to save to SQL
app.post('/api/tuning', async (req, res) => {
  const { date, windCondition, sessionDurationHours, upperShroudPT2, lowerShroudPT2, headstayLength, jibUsed, notes, crewWeight } = req.body;
  try {
    const query = `
      INSERT INTO tuning_logs (date, wind_condition, duration, upper_shroud, lower_shroud, headstay, jib_used, notes, crew_weight)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    await pool.query(query, [date, windCondition, sessionDurationHours, upperShroudPT2, lowerShroudPT2, headstayLength, jibUsed, notes, crewWeight]);
    res.status(200).send("Saved to Postgres");
  } catch (err) {
    console.error(err);
    res.status(500).send("Database Error");
  }
});

// 4. Update the GET route to fetch from SQL
app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tuning_logs ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Database Error");
  }
});

const PORT = process.env.PORT || 5222;
app.listen(PORT, () => console.log(`GBR 1381 Engine running on ${PORT}`));