const express = require('express');
const axios = require('axios');
const router = express.Router();

// --- 1. WEATHER & SOLENT ---
router.get(['/solent', '/weather'], async (req, res) => {
    try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=50.8&longitude=-1.3&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&models=ukmo_ukv&wind_speed_unit=kn';
        const response = await axios.get(url);
        res.json({
            source: "UK Met Office 2km (UKV)",
            current: response.data.current,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({ source: "Backup Mode", current: { wind_speed_10m: 12, wind_direction_10m: 210, temperature_2m: 15 } });
    }
});

// --- 2. TIDES ---
router.get(['/tides/solent', '/tides'], async (req, res) => {
    try {
        const url = 'https://marine-api.open-meteo.com/v1/marine?latitude=50.8&longitude=-1.3&hourly=sea_level_height_msl&timezone=GMT';
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.json({ hourly: { time: [], sea_level_height_msl: [] } });
    }
});

// --- 3. ATHLETES ---
router.get('/athletes', async (req, res) => {
    try {
        const r = await req.pool.query('SELECT * FROM athlete_profiles ORDER BY name ASC');
        res.json(r.rows || []);
    } catch (e) {
        res.json([]);
    }
});

// --- 4. SAILS ---
router.get('/sails', async (req, res) => {
    try {
        const r = await req.pool.query('SELECT * FROM sail_inventory ORDER BY hours_flown ASC');
        res.json(r.rows || []);
    } catch (e) { res.json([]); }
});

// --- 5. RECOMMENDATIONS ---
router.get(['/recommendation', '/team/recommendation'], async (req, res) => {
    try {
        const wind = parseFloat(req.query.wind) || 12;
        const result = await req.pool.query('SELECT * FROM tuning_guide WHERE $1 BETWEEN min_wind AND max_wind', [Math.round(wind)]);
        const guide = result.rows[0] || { jib_selection: 'J2+' };
        res.json({ base: guide, recommended_sail: guide.jib_selection });
    } catch (err) { res.json({ base: { jib_selection: 'J2+' } }); }
});

module.exports = router;