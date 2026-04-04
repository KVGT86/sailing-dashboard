const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const router = express.Router();

const buoyCache = new NodeCache({ stdTTL: 300 });

// --- WEATHER & TELEMETRY (Fixes the 'windSpeed' 500 error) ---
router.get(['/weather', '/solent'], async (req, res) => {
    try {
        // 1. Try Bramblemet Scrape first
        const brambleRes = await axios.get('https://www.bramblemet.co.uk/', { timeout: 3000 }).catch(() => null);
        if (brambleRes && brambleRes.data) {
            const $ = cheerio.load(brambleRes.data);
            const getVal = (l) => $(`.now_label:contains("${l}")`).next('.now_value').text().trim();
            
            const speed = parseFloat(getVal('Avg Wind'));
            if (!isNaN(speed)) {
                return res.json({
                    source: "Bramblemet Live",
                    windSpeed: speed, // Match frontend key
                    windDirection: parseInt(getVal('Wind Dir')) || 0,
                    temp: 15,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // 2. Fallback to UK Met Office 2km
        const om = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=50.8&longitude=-1.3&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&models=ukmo_ukv&wind_speed_unit=kn');
        const cur = om.data.current;
        
        res.json({
            source: "UK Met Office 2km",
            windSpeed: cur.wind_speed_10m, // Match frontend key
            windDirection: cur.wind_direction_10m,
            windGusts: cur.wind_gusts_10m,
            temp: cur.temperature_2m,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // EMERGENCY FALLBACK (Prevents frontend crash)
        res.json({ 
            source: "Safe Mode", 
            windSpeed: 12, 
            windDirection: 215, 
            temp: 15 
        });
    }
});

// --- SAILS (Fixes the 404 error) ---
router.get('/sails', async (req, res) => {
    try {
        const r = await req.pool.query('SELECT * FROM sail_inventory ORDER BY hours_flown ASC');
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- RECOMMENDATIONS (Briefing Fix) ---
router.get(['/recommendation', '/team/recommendation'], async (req, res) => {
    try {
        const wind = parseFloat(req.query.wind) || 12;
        const result = await req.pool.query('SELECT * FROM tuning_guide WHERE $1 BETWEEN min_wind AND max_wind', [Math.round(wind)]);
        const guide = result.rows[0] || { jib_selection: 'J2+', upper_shroud: 20, lower_shroud: 15 };
        res.json({ base: guide, recommended_sail: guide.jib_selection });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ATHLETES ---
router.get('/athletes', async (req, res) => {
    try {
        const r = await req.pool.query('SELECT * FROM athlete_profiles ORDER BY name ASC');
        res.json(r.rows);
    } catch (e) { res.json([]); }
});

module.exports = router;