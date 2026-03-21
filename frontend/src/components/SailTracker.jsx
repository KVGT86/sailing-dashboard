import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { ShieldCheck, AlertCircle, History, Plus, Wind, X } from 'lucide-react';

function UsageHistoryModal({ sail, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_URL}/sails/${sail.id}/usage`);
        setHistory(res.data);
      } catch (e) { console.error("History sync failed"); }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, [sail.id]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-black text-xl uppercase text-[#1D1B44]">{sail.id} Duty Log</h2>
            <p className="text-xs font-bold text-slate-400 uppercase">On-Water Usage History</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X size={20}/></button>
        </div>
        <div className="mt-6 max-h-[60vh] overflow-y-auto space-y-2 pr-2">
          {loading && <p>Loading history...</p>}
          {history.map(h => (
            <div key={h.id} className="grid grid-cols-3 gap-4 items-center p-3 bg-slate-50 rounded-lg">
              <span className="font-bold text-xs">{new Date(h.date).toLocaleDateString()}</span>
              <span className="font-black text-center">{h.hours} hrs</span>
              <span className="font-bold text-xs text-right">{h.avg_wind} kts avg</span>
            </div>
          ))}
          {!loading && history.length === 0 && <p className="text-center py-10 text-slate-400 font-bold italic">No usage logged for this sail.</p>}
        </div>
      </div>
    </div>
  );
}


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
    <>
      {selectedSail && <UsageHistoryModal sail={selectedSail} onClose={() => setSelectedSail(null)} />}
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
                     <button onClick={() => setSelectedSail(sail)} className="p-2 bg-slate-200 text-slate-600 rounded hover:bg-slate-300">
                       <History size={14}/>
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
