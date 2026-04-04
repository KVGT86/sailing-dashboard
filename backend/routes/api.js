const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const router = express.Router();

const buoyCache = new NodeCache({ stdTTL: 300 });

// --- TASK 1: HIGH-RES WEATHER (UK MET OFFICE 2KM) ---
// Alias for both /weather and /solent to satisfy different frontend components
router.get(['/weather', '/solent'], async (req, res) => {
    try {
        const { lat = 50.80, lon = -1.30 } = req.query; // Default to Hamble Entrance
        
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
            params: {
                latitude: lat,
                longitude: lon,
                models: 'ukmo_ukv', // High-res 2km model
                current: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m',
                wind_speed_unit: 'kn',
                timezone: 'Europe/London'
            }
        });

        res.json({
            source: "UK Met Office 2km (UKV)",
            weather: { current: response.data.current },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Weather Sync Failed' });
    }
});

// --- TASK 2: UKHO ADMIRALTY TIDES ---
router.get(['/tides', '/tides/solent'], async (req, res) => {
    try {
        const UKHO_KEY = process.env.UKHO_API_KEY;
        const stationId = '0065'; // Southampton Town Quay

        if (!UKHO_KEY) throw new Error('Key Missing');

        const response = await axios.get(
            `https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${stationId}/TidalPredictions`,
            { headers: { 'Ocp-Apim-Subscription-Key': UKHO_KEY } }
        );

        res.json({ source: "UKHO Admiralty", data: response.data });
    } catch (error) {
        // Fallback to Open-Meteo if UKHO fails
        const fb = await axios.get('https://marine-api.open-meteo.com/v1/marine?latitude=50.8&longitude=-1.3&hourly=sea_level_height_msl');
        res.json({ source: "Open-Meteo Fallback", data: fb.data });
    }
});

// --- TASK 3: LIVE SOLENT BUOYS ---
router.get('/live-buoys', async (req, res) => {
    const cacheKey = 'solent_buoys';
    const cachedData = buoyCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
        const { data } = await axios.get('https://www.bramblemet.co.uk/', { timeout: 3000 });
        const $ = cheerio.load(data);
        const getVal = (label) => $(`.now_label:contains("${label}")`).next('.now_value').text().trim();

        const result = {
            station: 'Bramblemet',
            windSpeed: parseFloat(getVal('Avg Wind')),
            direction: parseInt(getVal('Wind Dir')),
            timestamp: new Date().toISOString()
        };
        buoyCache.set(cacheKey, result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Buoys Offline' });
    }
});

// --- TASK 4: FIXING THE 404 (RECOMMENDATIONS) ---
router.get(['/recommendation', '/team/recommendation'], async (req, res) => {
    try {
        const wind = parseFloat(req.query.wind) || 12;
        const result = await req.pool.query(
            'SELECT * FROM tuning_guide WHERE $1 BETWEEN min_wind AND max_wind', 
            [Math.round(wind)]
        );
        res.json({ 
            base: result.rows[0] || { jib_selection: 'J2+' },
            recommended_sail: result.rows[0]?.jib_selection || 'J2+'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TASK 5: SUPABASE INTEGRATION (Bye Bye db.json) ---
router.get('/athletes', async (req, res) => {
    const r = await req.pool.query('SELECT * FROM athlete_profiles ORDER BY name ASC');
    res.json(r.rows);
});

router.post('/tuning', async (req, res) => {
    const { jibUsed, sessionDurationHours, windCondition } = req.body;
    try {
        // Log the session
        await req.pool.query(
            'INSERT INTO sail_usage (sail_id, hours, avg_wind, notes) VALUES ($1, $2, $3, $4)',
            [jibUsed, sessionDurationHours, windCondition, 'Manual Log']
        );
        // Update the sail inventory totals
        await req.pool.query(
            'UPDATE sail_inventory SET hours_flown = hours_flown + $1 WHERE id = $2',
            [sessionDurationHours, jibUsed]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;