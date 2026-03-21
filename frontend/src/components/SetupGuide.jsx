import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function SetupGuide({ activeCrew }) {
  const [data, setData] = useState(null);
  const [wind, setWind] = useState(12);
  const [loading, setLoading] = useState(true);

  const totalWeight = activeCrew.reduce((sum, s) => sum + (s.weight_kg || 0), 0);

  useEffect(() => {
    const fetchSmartSetup = async () => {
      try {
        const env = await axios.get(`${API_URL}/solent`);
        const liveWind = env.data.weather.current.wind_speed_10m;
        const liveSea = env.data.marine.current.wave_height;
        setWind(liveWind);

        const rec = await axios.get(`${API_URL}/recommendation?wind=${liveWind}&weight=${totalWeight}&sea=${liveSea}`);
        setData(rec.data);
      } catch (err) { console.error("Sync Error", err); }
      finally { setLoading(false); }
    };
    fetchSmartSetup();
  }, [activeCrew, totalWeight]);

  const saveTuning = async () => {
    const u = document.getElementById('uOff').value;
    const l = document.getElementById('lOff').value;
    await axios.post(`${API_URL}/feedback`, {
      wind_speed: wind,
      upper_offset: parseInt(u) || 0,
      lower_offset: parseInt(l) || 0,
      performance_rating: 5,
      crew_weight: totalWeight,
      sea_state: data?.conditions?.sea || 0
    });
    alert("AI Learned GBR 1381 Bias.");
  };

  if (loading) return <div className="p-10 font-black text-center animate-pulse">OPTIMIZING FOR SOLENT CONDITIONS...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-[#1D1B44] p-6 rounded-xl shadow-2xl border-b-8 border-[#ED1C24] text-white">
        <div className="flex justify-between">
          <h2 className="text-2xl font-black italic uppercase">Smart Performance Mode</h2>
          <div className="text-right">
             <p className="text-[10px] font-bold text-slate-400 uppercase">Recommended Sail</p>
             <p className="text-xl font-black text-[#ED1C24] italic uppercase">{data?.recommended_sail || 'J2+'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <StatBox label="Crew Weight" val={`${totalWeight.toFixed(0)}kg`} />
          <StatBox label="Live Wind" val={`${wind.toFixed(1)} kts`} />
          <StatBox label="Sea State" val={`${data?.conditions?.sea}m`} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TargetCard label="Uppers" val={(data?.base?.upper_shroud || 0) + (data?.suggested_offsets?.upper || 0)} sub="Turn to marked V1/D1" offset={data?.suggested_offsets?.upper} />
        <TargetCard label="Lowers" val={(data?.base?.lower_shroud || 0) + (data?.suggested_offsets?.lower || 0)} sub="Check for mid-mast sag" offset={data?.suggested_offsets?.lower} />
        <TargetCard label="Backstay" val={data?.base?.backstay || '0'} sub="Power/Flatten Main" />
        <TargetCard label="Traveller" val={data?.base?.traveller || 'Up'} sub="Adjust for leach tension" />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-slate-100 flex justify-between items-center">
         <div>
            <h3 className="text-sm font-black uppercase text-[#1D1B44]">Global Rig Calibration</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase">J/70 Standard Rake</p>
         </div>
         <div className="text-right">
            <span className="text-3xl font-black italic text-[#ED1C24]">{data?.base?.rake || 1425} <span className="text-xs">MM</span></span>
         </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-slate-100">
        <h3 className="text-sm font-black uppercase text-[#1D1B44] mb-4">Log Performance Offset (Teach Boat)</h3>
        <div className="flex gap-2">
          <input id="uOff" type="number" placeholder="U-Offset" className="w-full p-2 border rounded font-bold" />
          <input id="lOff" type="number" placeholder="L-Offset" className="w-full p-2 border rounded font-bold" />
          <button onClick={saveTuning} className="bg-[#1D1B44] text-white px-4 py-2 rounded font-black text-xs uppercase">Save</button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, val }) {
  return (
    <div className="bg-white/10 p-3 rounded-lg border border-white/10">
      <p className="text-[9px] uppercase font-bold text-slate-400">{label}</p>
      <p className="text-2xl font-black italic uppercase">{val}</p>
    </div>
  );
}

function TargetCard({ label, val, sub, offset }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow border-l-8 border-[#1D1B44] flex justify-between items-center">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase">{label}</p>
        <p className="text-4xl font-black text-[#1D1B44] italic">{val} <span className="text-xs">PT2</span></p>
        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{sub}</p>
      </div>
      {offset !== 0 && <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-black">{offset > 0 ? `+${offset}` : offset} AI BIAS</div>}
    </div>
  );
}