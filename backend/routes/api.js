const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// IMPORTANT: Inject pool into every request
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes); // This makes routes accessible at /api/athletes, etc.

const PORT = process.env.PORT || 5222;
app.listen(PORT, () => console.log(`🚀 GBR 1381 Engine Online on ${PORT}`));