const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// --- Mock Database Helpers (Keep these!) ---
const dbPath = path.join(__dirname, '../db.json');
const readDB = () => {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ telemetry: [], tuning: [] }, null, 2));
    return JSON.parse(fs.readFileSync(dbPath));
};
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// --- FREE PUBLIC API ROUTES ---

// 1. Open-Meteo Weather (No API Key Required!)
router.get('/weather/current', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const response = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
            params: {
                latitude: lat,
                longitude: lon,
                current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
                wind_speed_unit: 'kn', // Request knots automatically
                timezone: 'Europe/London'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Open-Meteo Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch free weather data' });
    }
});

router.post('/tuning', (req, res) => {
    try {
        const db = readDB();
        const { jibUsed, sessionDurationHours, windCondition } = req.body;
        
        // 1. Save the tuning log entry
        const newEntry = { id: Date.now(), timestamp: new Date().toISOString(), ...req.body };
        db.tuning.push(newEntry);

        // 2. Update Sail Hours
        const sail = db.sails.find(s => s.id === jibUsed);
        if (sail) {
            const hours = parseFloat(sessionDurationHours) || 0;
            sail.hours += hours;
            // If wind is Heavy (17+ kts based on our previous logic), track heavy wear
            if (windCondition.includes('Heavy')) {
                sail.heavyHours += hours;
            }
        }

        writeDB(db);
        res.status(201).json({ message: 'Tuning and Sail Hours updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update sail data' });
    }
});


// 2. Open-Meteo Marine API (100% Free Tides - No Scraping!)
router.get('/tides/portsmouth', async (req, res) => {
    try {
        // Portsmouth / Solent coordinates
        const { lat = 50.8, lon = -1.1 } = req.query;
        
        // Fetch 2 days of hourly tide data (No API key required!)
        const response = await axios.get(`https://marine-api.open-meteo.com/v1/marine`, {
            params: {
                latitude: lat,
                longitude: lon,
                hourly: 'sea_level_height_msl',
                timezone: 'Europe/London',
                forecast_days: 2
            }
        });

        const times = response.data.hourly.time;
        const heights = response.data.hourly.sea_level_height_msl;
        const extremes = [];

        // Peak-Finding Algorithm: Find local Highs and Lows in the hourly sine wave
        for (let i = 1; i < times.length - 1; i++) {
            const prev = heights[i-1];
            const curr = heights[i];
            const next = heights[i+1];

            if (curr === null || prev === null || next === null) continue;

            let type = null;
            // If current height is higher than both previous and next hour = High Tide
            if (curr > prev && curr >= next) type = 'High';
            // If current height is lower than both previous and next hour = Low Tide
            else if (curr < prev && curr <= next) type = 'Low';

            if (type) {
                const rawTime = times[i]; // Looks like "YYYY-MM-DDTHH:MM"
                const timeString = rawTime.substring(11, 16); // Extracts just "HH:MM"
                extremes.push({ 
                    type, 
                    time: timeString, 
                    height: curr.toFixed(1),
                    rawTime 
                });
            }
        }

        // Filter out tides that already happened earlier today (with a 1-hour grace period)
        const now = new Date();
        now.setHours(now.getHours() - 1);
        const upcomingExtremes = extremes.filter(e => new Date(e.rawTime) >= now);

        // Return the next 4 upcoming tides to the frontend
        res.json({ extremes: upcomingExtremes.slice(0, 4) });

    } catch (error) {
        console.error("Marine API Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch free tide data' });
    }
});

// --- KEEP YOUR EXISTING TELEMETRY AND TUNING ROUTES BELOW THIS ---
router.post('/telemetry', (req, res) => { /* ... */ });
router.post('/tuning', (req, res) => { /* ... */ });
router.get('/history', (req, res) => { /* ... */ });

module.exports = router;