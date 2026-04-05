const axios = require('axios');
const cheerio = require('cheerio');

const getVTSData = async () => {
    try {
        const { data } = await axios.get('https://www.southamptonvts.co.uk/live_information/tides_and_weather/', { 
            timeout: 5000,
            headers: { 'User-Agent': 'GBR1381-Dashboard/1.0' }
        });
        
        const $ = cheerio.load(data);
        const bodyText = $('body').text().replace(/\s+/g, ' ');
        const brambleIdx = bodyText.indexOf('Bramble Bank');
        if (brambleIdx === -1) throw new Error("Bramble Bank section not found");

        const brambleSection = bodyText.substring(brambleIdx, brambleIdx + 500);
        const extract = (regex) => {
            const match = brambleSection.match(regex);
            return match ? parseFloat(match[1]) : null;
        };

        return {
            speed: extract(/Wind Speed\s+([\d.]+)\s+Knots/i),
            gust: extract(/Max Gust\s+([\d.]+)\s+Knots/i),
            dir: extract(/Wind Direction\s+([\d.]+)\s+Degree/i),
            temp: extract(/Air Temp\s+([\d.]+)\s+C/i),
            source: "Bramble Bank (VTS Live)"
        };
    } catch (e) {
        console.error("VTS Scrape failed:", e.message);
        return null;
    }
};

const getTides = async () => {
    try {
        const url = 'https://marine-api.open-meteo.com/v1/marine?latitude=50.79&longitude=-1.37&hourly=sea_level_height_msl&timezone=GMT';
        const { data } = await axios.get(url);
        return data;
    } catch (e) {
        console.error("Tide fetch failed:", e.message);
        return null;
    }
};

const runTelemetrySync = async (pool) => {
    console.log("📡 Starting Telemetry Ingestion Worker...");
    
    let wind = await getVTSData();
    const tides = await getTides();

    // Fallback to UK MO if VTS is down or blocking
    if (!wind || wind.speed === null || isNaN(wind.speed)) {
        try {
            const omUrl = 'https://api.open-meteo.com/v1/forecast?latitude=50.80&longitude=-1.30&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&models=ukmo_ukv&wind_speed_unit=kn&timezone=GMT';
            const { data } = await axios.get(omUrl);
            wind = {
                speed: data.current.wind_speed_10m,
                dir: data.current.wind_direction_10m,
                gust: data.current.wind_gusts_10m,
                temp: data.current.temperature_2m,
                source: "UK Met Office 2km (UKV)"
            };
        } catch (e) {
            console.error("Fallback UKMO failed:", e.message);
            wind = { speed: 12.5, dir: 225, gust: 15.0, temp: 14, source: "Safe Mode (Offline)" };
        }
    }

    try {
        await pool.query(
            `INSERT INTO solent_telemetry (wind_speed, wind_dir, wind_gust, air_temp, tide_data, source) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [wind.speed, wind.dir, wind.gust, wind.temp, JSON.stringify(tides), wind.source]
        );
        console.log(`✅ Ingestion Successful: ${wind.source} @ ${wind.speed}kts`);
    } catch (err) {
        console.error("❌ DB Ingestion Error:", err.message);
    }
};

module.exports = { runTelemetrySync };
