const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();
const NodeCache = require('node-cache');

const buoyCache = new NodeCache({ stdTTL: 600 }); // 10 minute cache

// --- HELPER: Southampton VTS Live Scraper (The Bypass) ---
const getVTSData = async () => {
    const cached = buoyCache.get("vts_bramble");
    if (cached) return cached;

    try {
        const { data } = await axios.get('https://www.southamptonvts.co.uk/live_information/tides_and_weather/', { 
            timeout: 5000,
            headers: { 'User-Agent': 'GBR1381-Dashboard/1.0' }
        });
        
        const $ = cheerio.load(data);
        
        // 1. Strip all HTML tags and collapse whitespace into a single text string
        const bodyText = $('body').text().replace(/\s+/g, ' ');

        // 2. Find the Bramble Bank section
        const brambleIdx = bodyText.indexOf('Bramble Bank');
        if (brambleIdx === -1) throw new Error("Bramble Bank section not found");

        // 3. Slice out a chunk of text just for Bramble to avoid Sotonmet's numbers
        const brambleSection = bodyText.substring(brambleIdx, brambleIdx + 500);

        // 4. Regex sniper to extract the exact numbers
        const extract = (regex) => {
            const match = brambleSection.match(regex);
            return match ? parseFloat(match[1]) : null;
        };

        const speed = extract(/Wind Speed\s+([\d.]+)\s+Knots/i);
        const gust = extract(/Max Gust\s+([\d.]+)\s+Knots/i);
        const dir = extract(/Wind Direction\s+([\d.]+)\s+Degree/i);
        const temp = extract(/Air Temp\s+([\d.]+)\s+C/i);

        // 5. Strict safety check (catches both null and NaN)
        if (speed === null || dir === null || isNaN(speed) || isNaN(dir)) {
            throw new Error("Regex failed to find wind values");
        }

        const result = {
            source: "Bramble Bank (VTS Live)",
            current: {
                wind_speed_10m: speed,
                wind_direction_10m: dir,
                wind_gusts_10m: gust || (speed * 1.2),
                temperature_2m: temp || 15
            }
        };
        
        buoyCache.set("vts_bramble", result);
        return result;
    } catch (e) { 
        console.error("VTS Scrape failed:", e.message);
        return null; 
    }
};

// --- 1. WEATHER & SOLENT TELEMETRY ---
router.get(['/solent', '/weather'], async (req, res) => {
    try {
        // Step A: Try Live VTS Scrape first
        const liveBuoy = await getVTSData();
        if (liveBuoy) return res.json({ ...liveBuoy, timestamp: new Date().toISOString() });

        // Step B: Fallback to UK Met Office 2km Model (Fixed parameters)
        const omUrl = 'https://api.open-meteo.com/v1/forecast?latitude=50.80&longitude=-1.30&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&models=ukmo_ukv&wind_speed_unit=kn&timezone=GMT';
        const response = await axios.get(omUrl, {
            timeout: 5000,
            headers: { 'User-Agent': 'GBR1381-Dashboard/1.0' }
        });
        
        return res.json({
            source: "UK Met Office 2km (UKV)",
            current: response.data.current,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Telemetry Error:", error.message);
        // Step C: Ultimate Safe Mode
        res.json({ 
            source: "Safe Mode", 
            backend_error: error.message,
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
