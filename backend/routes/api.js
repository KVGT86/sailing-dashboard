const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

// --- HELPER: Bramblemet Live Scraper ---
const getBramblemet = async () => {
    try {
        const { data } = await axios.get('https://www.bramblemet.co.uk/', { 
            timeout: 3500,
            headers: { 'User-Agent': 'Mozilla/5.0 (GBR1381-Dashboard)' }
        });
        const $ = cheerio.load(data);
        const getVal = (label) => $(`.now_label:contains("${label}")`).next('.now_value').text().trim();
        
        const speed = parseFloat(getVal('Avg Wind'));
        const dir = parseInt(getVal('Wind Dir'));
        
        if (isNaN(speed) || isNaN(dir)) return null;

        return {
            source: "Bramblemet (Live Buoy)",
            current: {
                wind_speed_10m: speed,
                wind_direction_10m: dir,
                wind_gusts_10m: parseFloat(getVal('Gust')) || speed * 1.2,
                temperature_2m: 15 // Buoy air temp is often static/missing
            }
        };
    } catch (e) { return null; }
};

// --- 1. WEATHER & SOLENT TELEMETRY ---
router.get(['/solent', '/weather'], async (req, res) => {
    try {
        // Step A: Try Live Buoy first
        const liveBuoy = await getBramblemet();
        if (liveBuoy) return res.json({ ...liveBuoy, timestamp: new Date().toISOString() });

        // Step B: Fallback to UK Met Office 2km Model
        const omUrl = 'https://api.open-meteo.com/v1/forecast?latitude=50.80&longitude=-1.30&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&models=ukmo_ukv&wind_speed_unit=kn&timezone=GMT';
        const response = await axios.get(omUrl);
        
        return res.json({
            source: "UK Met Office 2km (UKV)",
            current: response.data.current,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Telemetry Error:", error.message);
        // Step C: Ultimate Safe Mode (matches your frontend keys)
        res.json({ 
            source: "Safe Mode (Offline)", 
            current: { 
                wind_speed_10m: 12.5, 
                wind_direction_10m: 225, 
                temperature_2m: 14,
                wind_gusts_10m: 15.0
            } 
        });
    }
});

// --- 2. TIDES (Open-Meteo Marine) ---
router.get(['/tides/solent', '/tides'], async (req, res) => {
    try {
        const url = 'https://marine-api.open-meteo.com/v1/marine?latitude=50.79&longitude=-1.37&hourly=sea_level_height_msl&timezone=GMT';
        const response = await axios.get(url);
        res.json(response.data);
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