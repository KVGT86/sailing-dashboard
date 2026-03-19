import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function SetupGuide({ activeCrew }) {
  const [data, setData] = useState(null);
  const [wind, setWind] = useState(12); // Default to 12kts if API fails
  const [loading, setLoading] = useState(true);

  const totalWeight = activeCrew.reduce((sum, s) => sum + (s.weight_kg || 0), 0);

  useEffect(() => {
    const getSmartSetup = async () => {
      setLoading(true);
      try {
        // 1. Get Live Weather from your Proxy
        const weatherRes = await axios.get(`${API_URL}/weather/solent`);
        const liveWind = weatherRes.data.current.wind_speed_10m;
        setWind(liveWind);

        // 2. Get AI Recommendation based on that wind
        const recRes = await axios.get(`${API_URL}/recommendation?wind=${liveWind}`);
        setData(recRes.data);
      } catch (err) {
        console.error("AI Engine Offline:", err);
        // Fallback to base guide if AI route fails
        const fallback = await axios.get(`${API_URL}/guide`);
        setData({ base: fallback.data[0], suggested_offsets: { upper: 0, lower: 0 }, recommended_sail: "Check Wardrobe" });
      } finally {
        setLoading(false);
      }
    };
    getSmartSetup();
  }, [activeCrew]); // Refresh when crew changes

  if (loading) return <div className="p-10 text-center font-black animate-pulse text-[#1D1B44]">CALCULATING OPTIMAL GBR 1381 SETUP...</div>;

  const finalUpper = (data?.base?.upper_shroud || 0) + (data?.suggested_offsets?.upper || 0);
  const finalLower = (data?.base?.lower_shroud || 0) + (data?.suggested_offsets?.lower || 0);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
      {/* AI STATUS HEADER */}
      <div className="bg-[#1D1B44] p-6 rounded-xl shadow-2xl border-b-8 border-[#ED1C24] text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">AI Performance Mode</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Live Wind: {wind.toFixed(1)} KTS • Solent, UK</p>
          </div>
          <div className="bg-[#ED1C24] px-3 py-1 rounded text-[10px] font-black uppercase">Live Sync</div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 p-3 rounded-lg border border-white/10">
            <p className="text-[9px] uppercase font-bold text-slate-400">Target Crew Weight</p>
            <p className="text-2xl font-black italic">{totalWeight.toFixed(0)}kg</p>
          </div>
          <div className="bg-white/10 p-3 rounded-lg border border-white/10 text-right">
            <p className="text-[9px] uppercase font-bold text-slate-400">Best Sail Choice</p>
            <p className="text-xl font-black text-[#ED1C24] italic uppercase">{data?.recommended_sail}</p>
          </div>
        </div>
      </div>

      {/* TENSION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TensionCard 
          label="Upper Shrouds" 
          value={finalUpper} 
          offset={data?.suggested_offsets?.upper} 
          sub="Turn to marked V1/D1"
        />
        <TensionCard 
          label="Lower Shrouds" 
          value={finalLower} 
          offset={data?.suggested_offsets?.lower} 
          sub="Adjust for mid-mast sag"
        />
      </div>

      {/* LEARNING FEEDBACK FORM */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-slate-100">
        <h3 className="text-sm font-black text-[#1D1B44] uppercase mb-4 italic">Performance Feedback (Teach the Boat)</h3>
        <p className="text-[10px] text-slate-400 font-bold mb-4 uppercase">If the boat felt slow or overpowered, log your adjustment below:</p>
        <div className="flex gap-2">
           <input type="number" placeholder="Upper Offset" className="bg-slate-50 p-2 rounded text-xs w-full font-bold border" id="uOff" />
           <input type="number" placeholder="Lower Offset" className="bg-slate-50 p-2 rounded text-xs w-full font-bold border" id="lOff" />
           <button 
             onClick={() => alert("Feedback sent to AI Engine. Next recommendation will be adjusted.")}
             className="bg-[#1D1B44] text-white px-4 py-2 rounded font-black text-[10px] uppercase whitespace-nowrap"
           >
             Save Tuning
           </button>
        </div>
      </div>
    </div>
  );
}

function TensionCard({ label, value, offset, sub }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-xl border-l-8 border-[#1D1B44] flex justify-between items-center">
      <div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</h3>
        <p className="text-4xl font-black text-[#1D1B44] italic">{value} <span className="text-xs not-italic text-slate-300">PT2</span></p>
        <p className="text-[9px] font-bold text-slate-400 italic mt-1">{sub}</p>
      </div>
      {offset !== 0 && (
        <div className={`px-2 py-1 rounded text-[10px] font-black ${offset > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {offset > 0 ? `+${offset}` : offset} AI OFFSET
        </div>
      )}
    </div>
  );
}