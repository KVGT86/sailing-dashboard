import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function SolentTidesModule() {
  const [tides, setTides] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTides = async () => {
      try {
        const res = await axios.get(`${API_URL}/tides/solent`);
        setTides(res.data);
      } catch (err) { console.error("Tide Error", err); }
      finally { setLoading(false); }
    };
    fetchTides();
  }, []);

  const tideHours = Array.from({ length: 13 }, (_, i) => i - 6);

  if (loading) return <div className="p-10 font-black text-center animate-pulse">CALCULATING STREAM VECTORS...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow border-t-4 border-[#0A192F]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black italic uppercase text-[#0A192F]">Solent Playbook</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Winning Tides GBR 1381</p>
        </div>
        <div className="text-right">
           <span className="text-xs font-black uppercase text-red-600">Current Height</span>
           <p className="text-2xl font-black italic text-[#0A192F]">{tides?.hourly?.sea_level_height_msl?.[0]?.toFixed(2)}m</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="bg-[#0A192F] text-white text-[10px] uppercase font-black tracking-widest"><th className="p-3 italic">Reference</th><th className="p-3">Stream Direction</th><th className="p-3">Tactical Strategy</th></tr></thead>
          <tbody>
            {tideHours.map(hour => (
              <tr key={hour} className="border-b hover:bg-slate-50 transition-colors">
                <td className="p-3 font-black text-red-600 italic uppercase text-xs">{hour === 0 ? 'HW' : hour > 0 ? `HW +${hour}` : `HW ${hour}`}</td>
                <td className="p-3">
                   <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${hour > 0 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {hour > 0 ? 'West (Ebb)' : 'East (Flood)'}
                   </span>
                </td>
                <td className="p-3">
                   <input type="text" placeholder="e.g. Hug island shore for relief" className="w-full bg-transparent border-b border-dashed border-slate-200 focus:border-blue-600 outline-none font-bold text-xs" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}