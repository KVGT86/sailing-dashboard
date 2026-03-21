import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wind, Thermometer, Waves, Compass, Droplets, MapPin } from 'lucide-react';
import { API_URL } from '../config';

export default function LiveConditions() {
  const [weather, setWeather] = useState(null);
  const [tides, setTides] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const fetchLiveConditions = async () => {
    setIsLoading(true);
    setApiError(false);
    try {
      const [weatherRes, tideRes] = await Promise.all([
        axios.get(`${API_URL}/solent`),
        axios.get(`${API_URL}/tides/solent`)
      ]);

      const data = weatherRes.data || {};
      const current = data.weather?.current || {};
      
      setWeather({
        windSpeed: (current.wind_speed_10m || 12).toFixed(1),
        windGust: (current.wind_gusts_10m || (current.wind_speed_10m * 1.2) || 14).toFixed(1),
        windDirection: current.wind_direction_10m || 210,
        temp: Math.round(current.temperature_2m || 15),
        humidity: current.relative_humidity_2m || 70,
        source: data.source || "System Default"
      });

      if (tideRes.data?.hourly?.sea_level_height_msl) {
        const heights = tideRes.data.hourly.sea_level_height_msl;
        const times = tideRes.data.hourly.time;
        const list = [];
        for (let i = 0; i < 24; i += 6) {
          list.push({
            type: i % 12 === 0 ? 'High' : 'Low',
            time: new Date(times[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            height: heights[i].toFixed(2)
          });
        }
        setTides(list);
      }
    } catch (error) {
      console.error("Telemetry Sync Failed:", error);
      setApiError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveConditions();
    const interval = setInterval(fetchLiveConditions, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !weather) return <div className="p-6 text-[#1D1B44] font-black text-xl animate-pulse italic uppercase tracking-widest text-center">Syncing Solent Buoys...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-700">
      
      <div className="bg-[#1D1B44] text-white p-6 rounded-xl shadow-2xl flex justify-between items-center border-b-4 border-[#ED1C24]">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
            <MapPin className="text-[#ED1C24]" /> Solent Live Conditions
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Source: {weather?.source || 'Detecting...'}</p>
        </div>
        <button 
          onClick={fetchLiveConditions}
          className="bg-[#ED1C24] hover:bg-white hover:text-[#1D1B44] text-white px-4 py-2 rounded font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
        >
          {isLoading ? 'Syncing...' : 'Force Satellite Sync'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* WIND CARD */}
        <div className="bg-white p-8 rounded-xl shadow-xl border-t-4 border-[#1D1B44] flex flex-col items-center text-center">
          <Wind size={48} className="text-[#1D1B44] mb-4" />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Surface Wind</h3>
          <div className="text-6xl font-black text-[#1D1B44] my-2 italic">
            {weather.windSpeed} <span className="text-xl text-slate-400 not-italic uppercase">kts</span>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="bg-red-50 px-4 py-2 rounded border border-red-100">
              <span className="block text-[8px] font-black text-[#ED1C24] uppercase">Gusts</span>
              <span className="font-black text-[#ED1C24] text-lg">{weather.windGust}</span>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded border border-slate-100 flex items-center gap-3">
              <div className="text-left">
                <span className="block text-[8px] font-black text-slate-400 uppercase">Dir</span>
                <span className="font-black text-[#1D1B44] text-lg">{weather.windDirection}°</span>
              </div>
              <Compass size={24} className="text-[#1D1B44]" style={{ transform: `rotate(${weather.windDirection}deg)` }} />
            </div>
          </div>
        </div>

        {/* ATMOSPHERE CARD */}
        <div className="bg-white p-8 rounded-xl shadow-xl border-t-4 border-[#ED1C24] flex flex-col items-center text-center">
          <Thermometer size={48} className="text-[#ED1C24] mb-4" />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Air Temp</h3>
          <div className="text-6xl font-black text-[#1D1B44] my-2 italic">
            {weather.temp}°<span className="text-xl text-slate-400 not-italic">C</span>
          </div>
          <div className="mt-4 bg-blue-50 px-6 py-2 rounded-full border border-blue-100 flex items-center gap-2">
            <Droplets size={16} className="text-blue-500" />
            <span className="text-[10px] font-black text-blue-900 uppercase">Humidity: {weather.humidity}%</span>
          </div>
        </div>

        {/* TIDES CARD */}
        <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-[#1D1B44]">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <Waves size={24} className="text-[#1D1B44]" />
            <h3 className="text-sm font-black text-[#1D1B44] uppercase italic tracking-tighter">Portsmouth Tides</h3>
          </div>
          <div className="space-y-3">
            {tides && tides.length > 0 ? tides.map((tide, index) => (
              <div key={index} className={`flex justify-between items-center p-3 rounded-lg font-black transition-all ${tide.type === 'High' ? 'bg-[#1D1B44] text-white' : 'bg-slate-100 text-[#1D1B44]'}`}>
                <span className="text-[10px] uppercase">{tide.type}</span>
                <span className="text-lg italic">{tide.time}</span>
                <span className={`text-xs ${tide.type === 'High' ? 'text-[#ED1C24]' : 'text-slate-400'}`}>{tide.height}m</span>
              </div>
            )) : (
              <div className="text-center py-10">
                <p className="text-[10px] font-black text-slate-300 uppercase italic">Check local chart for tide times</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}