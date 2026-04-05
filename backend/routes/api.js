const express = require('express');
const router = express.Router();

// --- 1. DECOUPLED TELEMETRY API (Task 2) ---
router.get(['/solent', '/weather'], async (req, res) => {
    try {
        const result = await req.pool.query('SELECT * FROM solent_telemetry ORDER BY id DESC LIMIT 1');
        
        if (result.rows.length > 0) {
            const row = result.rows[0];
            return res.json({
                ...row,
                tide_data: typeof row.tide_data === 'string' ? JSON.parse(row.tide_data) : row.tide_data,
                timestamp: row.created_at || new Date().toISOString()
            });
        }

        // Ultimate Safe Mode Fallback
        res.json({ 
            source: "Safe Mode (No DB Records)", 
            wind_speed: 12, 
            wind_dir: 210, 
            wind_gust: 15, 
            air_temp: 15,
            tide_data: { hourly: { time: [], sea_level_height_msl: [] } }
        });
    } catch (error) {
        console.error("API DB Query Failed:", error.message);
        res.status(500).json({ error: "Telemetry system offline" });
    }
});

router.get(['/tides/solent', '/tides'], async (req, res) => {
    try {
        const result = await req.pool.query('SELECT tide_data FROM solent_telemetry ORDER BY id DESC LIMIT 1');
        if (result.rows.length > 0) {
            const data = result.rows[0].tide_data;
            return res.json(typeof data === 'string' ? JSON.parse(data) : data);
        }
        res.json({ hourly: { time: [], sea_level_height_msl: [] } });
    } catch (error) {
        res.json({ hourly: { time: [], sea_level_height_msl: [] } });
    }
});

// --- 3. TEAM, SAILS & RECOMMENDATIONS ---
router.get('/athletes', async (req, res) => {
    try {
        const r = await req.pool.query('SELECT * FROM athlete_profiles ORDER BY name ASC');
        res.json(r.rows || []);
    } catch (e) { res.json([]); }
});

router.get('/sails', async (req, res) => {
    try {
        const r = await req.pool.query('SELECT * FROM sail_inventory ORDER BY hours_flown ASC');
        res.json(r.rows || []);
    } catch (e) { res.json([]); }
});

router.get(['/recommendation', '/team/recommendation'], async (req, res) => {
    try {
        const wind = parseFloat(req.query.wind) || 12;
        const result = await req.pool.query('SELECT * FROM tuning_guide WHERE $1 BETWEEN min_wind AND max_wind', [Math.round(wind)]);
        res.json({ 
            base: result.rows[0] || { jib_selection: 'J2+', upper_shroud: 20, lower_shroud: 15 },
            recommended_sail: result.rows[0]?.jib_selection || 'J2+' 
        });
    } catch (err) { res.json({ base: { jib_selection: 'J2+' } }); }
});

module.exports = router;
