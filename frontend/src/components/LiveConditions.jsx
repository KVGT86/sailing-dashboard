import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wind, Thermometer, Waves, Compass, Droplets, MapPin } from 'lucide-react';
import { API_URL } from '../config';

export default function LiveConditions() {
  const [data, setData] = useState(null);
  const [tideList, setTideList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveConditions = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/solent`);
      const row = res.data;
      setData(row);

      // Process Tide Data from JSONB field
      if (row.tide_data?.hourly?.sea_level_height_msl) {
        const heights = row.tide_data.hourly.sea_level_height_msl;
        const times = row.tide_data.hourly.time;
        const list = [];
        // Show every 6th hour for the next 24 hours
        for (let i = 0; i < Math.min(heights.length, 24); i += 6) {
          const h = Number(heights[i] || 0);
          list.push({
            type: i % 12 === 0 ? 'High' : 'Low',
            time: times[i] ? new Date(times[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
            height: h.toFixed(2)
          });
        }
        setTideList(list);
      }
    } catch (error) {
      console.error("Telemetry Sync Failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveConditions();
    const interval = setInterval(fetchLiveConditions, 600000); // 10 mins
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !data) {
    return <div className="p-10 text-[#1D1B44] font-black text-xl animate-pulse italic uppercase text-center tracking-widest">Accessing Ingestion Mesh...</div>;
  }

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="bg-[#1D1B44] text-white p-6 rounded-3xl shadow-2xl flex justify-between items-center border-b-4 border-cyan-500">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
            <MapPin className="text-cyan-400" /> Solent Tactical Mesh
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Single Source of Truth • {data.source}</p>
        </div>
        <button 
          onClick={fetchLiveConditions}
          className="bg-cyan-500 hover:bg-white hover:text-[#1D1B44] text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
        >
          {isLoading ? 'Polling...' : 'Refresh Local DB'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* WIND VELOCITY */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-[#1D1B44] flex flex-col items-center text-center">
          <Wind size={48} className="text-[#1D1B44] mb-4" />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wind Velocity</h3>
          <div className="text-7xl font-black text-[#1D1B44] my-2 italic tracking-tighter">
            {Number(data.wind_speed || 0).toFixed(1)} <span className="text-xl text-slate-400 not-italic uppercase">kts</span>
          </div>
          <div className="flex gap-4 mt-6">
            <div className="bg-cyan-50 px-6 py-3 rounded-2xl border border-cyan-100 shadow-sm">
              <span className="block text-[8px] font-black text-cyan-600 uppercase">Gust</span>
              <span className="font-black text-cyan-700 text-xl">{Number(data.wind_gust || 0).toFixed(1)}</span>
            </div>
            <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
              <div className="text-left">
                <span className="block text-[8px] font-black text-slate-400 uppercase">Deg</span>
                <span className="font-black text-[#1D1B44] text-xl">{data.wind_dir}°</span>
              </div>
              <Compass size={28} className="text-[#1D1B44] transition-transform duration-1000" style={{ transform: `rotate(${data.wind_dir}deg)` }} />
            </div>
          </div>
        </div>

        {/* ATMOSPHERE */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-cyan-500 flex flex-col items-center text-center">
          <Thermometer size={48} className="text-cyan-500 mb-4" />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Air Temp</h3>
          <div className="text-7xl font-black text-[#1D1B44] my-2 italic tracking-tighter">
            {Number(data.air_temp || 0).toFixed(1)}°<span className="text-xl text-slate-400 not-italic">C</span>
          </div>
          <div className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-full flex items-center gap-3 shadow-lg">
            <Droplets size={16} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Humidity: NOMINAL</span>
          </div>
        </div>

        {/* TIDES */}
        <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-[#1D1B44]">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <Waves size={24} className="text-[#1D1B44]" />
            <h3 className="text-sm font-black text-[#1D1B44] uppercase italic tracking-tighter">Tidal Sequence</h3>
          </div>
          <div className="space-y-4">
            {tideList.map((tide, index) => (
              <div key={index} className={`flex justify-between items-center p-4 rounded-2xl font-black transition-all ${tide.type === 'High' ? 'bg-[#1D1B44] text-white shadow-lg' : 'bg-slate-50 text-[#1D1B44] border border-slate-100'}`}>
                <span className="text-[10px] uppercase tracking-widest opacity-60">{tide.type}</span>
                <span className="text-xl italic">{tide.time}</span>
                <span className={`text-xs ${tide.type === 'High' ? 'text-cyan-400' : 'text-slate-400'}`}>{tide.height}m</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
