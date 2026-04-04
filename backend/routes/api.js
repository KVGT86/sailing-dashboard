const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const router = express.Router();

// Initialize Cache: 300 seconds (5 minutes)
const buoyCache = new NodeCache({ stdTTL: 300 });

// --- Mock Database Helpers (Keep these!) ---
const dbPath = path.join(__dirname, '../db.json');
const readDB = () => {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ telemetry: [], tuning: [], sails: [] }, null, 2));
    return JSON.parse(fs.readFileSync(dbPath));
};
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// --- TASK 1: HIGH-RES WEATHER (UK MET OFFICE 2KM) ---
router.get('/weather', async (req, res) => {
    try {
        const { lat = 50.78, lon = -1.29 } = req.query;
        
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                latitude: lat,
                longitude: lon,
                models: 'ukmo_uk_deterministic_2km',
                hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m',
                wind_speed_unit: 'kn',
                timezone: 'Europe/London'
            }
        });

        const hourly = response.data.hourly;
        const formattedData = hourly.time.map((time, index) => ({
            timestamp: time,
            windSpeed: hourly.wind_speed_10m[index],
            windDirection: hourly.wind_direction_10m[index],
            windGusts: hourly.wind_gusts_10m[index],
            temp: hourly.temperature_2m[index]
        }));

        res.json(formattedData);
    } catch (error) {
        console.error("Open-Meteo High-Res Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch high-res weather' });
    }
});

// --- TASK 2: UKHO ADMIRALTY TIDES ---
router.get('/tides', async (req, res) => {
    try {
        const { station = 'portsmouth' } = req.query;
        
        // Station ID Mapping
        const stationMap = {
            'portsmouth': '0065',
            'southampton': '0060',
            'cowes': '0064'
        };
        
        const stationId = stationMap[station.toLowerCase()] || '0065';
        const UKHO_KEY = process.env.UKHO_API_KEY;

        if (!UKHO_KEY) {
            return res.status(500).json({ error: 'UKHO_API_KEY missing in .env' });
        }

        const response = await axios.get(
            `https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${stationId}/TidalEvents`,
            {
                headers: { 'Ocp-Apim-Subscription-Key': UKHO_KEY }
            }
        );

        // Filter and format the tidal events
        const events = response.data.map(event => ({
            time: event.DateTime,
            height: event.Height.toFixed(2),
            type: event.EventType // "HighWater" or "LowWater"
        }));

        res.json({ station, events });
    } catch (error) {
        console.error("UKHO Tide Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch UKHO tidal data' });
    }
});

// --- TASK 3: LIVE SOLENT BUOYS (SCRAPING + CACHE) ---
const fetchBuoyData = async (url, name) => {
    try {
        const { data } = await axios.get(url, { 
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        const $ = cheerio.load(data);
        
        // Bramblemet/Chimet use standard Solentmet selectors
        const getVal = (label) => {
            const el = $(`.now_label:contains("${label}")`).next('.now_value');
            return el.text().trim() || null;
        };
        
        const windRaw = getVal('Avg Wind');
        const dirRaw = getVal('Wind Dir');
        const tideRaw = getVal('Tide');

        return {
            name,
            url,
            windSpeed: windRaw ? parseFloat(windRaw.split(' ')[0]) : null,
            direction: dirRaw ? parseInt(dirRaw) : null,
            tideHeight: tideRaw ? parseFloat(tideRaw.split(' ')[0]) : null,
            timestamp: new Date().toISOString()
        };
    } catch (err) {
        console.error(`Error scraping ${name}:`, err.message);
        return { name, error: 'Offline' };
    }
};

router.get('/live-buoys', async (req, res) => {
    const cacheKey = 'solent_buoys';
    const cachedData = buoyCache.get(cacheKey);

    if (cachedData) {
        return res.json({ ...cachedData, source: 'cache' });
    }

    // Fetch both in parallel
    const [bramble, chimet] = await Promise.all([
        fetchBuoyData('https://www.bramblemet.co.uk/', 'Bramblemet'),
        fetchBuoyData('https://www.chimet.co.uk/', 'Chimet')
    ]);

    const result = {
        stations: [bramble, chimet],
        lastUpdated: new Date().toISOString()
    };

    buoyCache.set(cacheKey, result);
    res.json({ ...result, source: 'live' });
});

// --- KEEP YOUR EXISTING TELEMETRY AND TUNING ROUTES ---
router.post('/telemetry', (req, res) => {
    try {
        const db = readDB();
        const newEntry = { id: Date.now(), ...req.body };
        db.telemetry.push(newEntry);
        writeDB(db);
        res.status(201).json(newEntry);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update telemetry' });
    }
});

router.post('/tuning', (req, res) => {
    try {
        const db = readDB();
        const { jibUsed, sessionDurationHours, windCondition } = req.body;
        const newEntry = { id: Date.now(), timestamp: new Date().toISOString(), ...req.body };
        db.tuning.push(newEntry);

        const sail = db.sails.find(s => s.id === jibUsed);
        if (sail) {
            const hours = parseFloat(sessionDurationHours) || 0;
            sail.hours += hours;
            if (windCondition && windCondition.includes('Heavy')) {
                sail.heavyHours += hours;
            }
        }

        writeDB(db);
        res.status(201).json({ message: 'Tuning and Sail Hours updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update sail data' });
    }
});

router.get('/history', (req, res) => {
    try {
        const db = readDB();
        res.json(db.tuning);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;
