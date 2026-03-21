import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { ShieldCheck, AlertCircle, History, Plus, Wind } from 'lucide-react';

export default function SailTracker({ sails, refresh }) {
  const [selectedSail, setSelectedSail] = useState(null);

  const addSail = async () => {
    const id = prompt("Enter Sail ID (e.g., J2-2024):");
    const name = prompt("Enter Sail Name (e.g., North J2 Plus):");
    if (!id || !name) return;
    await axios.post(`${API_URL}/sails`, { id, name, hours_flown: 0, type: 'Jib', is_race_sail: true });
    refresh();
  };

  const logUsage = async (sailId) => {
    const hours = prompt("Hours flown today:");
    const wind = prompt("Average wind speed (kts):");
    if (!hours || isNaN(hours)) return;
    
    try {
      await axios.post(`${API_URL}/sails/usage`, {
        sail_id: sailId,
        hours: parseFloat(hours),
        avg_wind: parseFloat(wind) || 12,
        max_wind: (parseFloat(wind) || 12) * 1.2,
        notes: "On-water session"
      });
      alert("Usage logged to GBR 1381 history.");
      refresh();
    } catch (e) { alert("Failed to log usage."); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-8 border-[#1D1B44]">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black uppercase italic text-[#1D1B44]">Sail Wardrobe</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory & Fatigue Tracking</p>
          </div>
          <button onClick={addSail} className="bg-[#1D1B44] text-white px-6 py-3 rounded-lg font-black text-[10px] uppercase shadow-xl hover:bg-[#ED1C24] transition-all flex items-center gap-2">
            <Plus size={14}/> Commission New Sail
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sails.map(sail => {
            const hours = Number(sail.hours_flown || 0);
            const condition = 100 - (hours / 100 * 100); // 100hr lifespan example
            const isCritical = condition < 30;

            return (
              <div key={sail.id} className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-100 hover:border-[#ED1C24] transition-all group relative overflow-hidden">
                {/* Condition Bar */}
                <div className="absolute top-0 left-0 h-1 bg-slate-200 w-full">
                    <div className={`h-full transition-all duration-1000 ${isCritical ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.max(0, condition)}%` }}></div>
                </div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-[#1D1B44] uppercase tracking-tight leading-none">{sail.id}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{sail.name}</p>
                  </div>
                  {isCritical ? <AlertCircle className="text-red-500" size={20}/> : <ShieldCheck className="text-green-500" size={20}/>}
                </div>

                <div className="flex items-end justify-between mt-6">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Duty</p>
                    <p className="text-3xl font-black text-[#1D1B44] italic leading-none">{hours.toFixed(1)}<span className="text-[10px] not-italic ml-1 uppercase">hrs</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Status</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${isCritical ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {condition > 70 ? 'Race Primary' : condition > 30 ? 'Training' : 'Retire Soon'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => logUsage(sail.id)} className="flex-1 bg-[#1D1B44] text-white py-2 rounded font-black text-[10px] uppercase flex items-center justify-center gap-2">
                     <Wind size={12}/> Log Hours
                   </button>
                   <button className="p-2 bg-slate-200 text-slate-600 rounded">
                     <History size={14}/>
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
