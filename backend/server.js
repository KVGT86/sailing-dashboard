const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Establish the Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. Inject the pool into every request so the routes can use it
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// 3. Mount the API routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// 4. Ingestion Worker (Task 1)
const cron = require('node-cron');
const { runTelemetrySync } = require('./services/telemetryWorker');

// Schedule: Every 10 minutes
cron.schedule('*/10 * * * *', () => runTelemetrySync(pool));

// Initial Run on Startup
runTelemetrySync(pool);

app.get('/', (req, res) => res.send("🚀 GBR 1381 Engine Online"));

const PORT = process.env.PORT || 5222;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));