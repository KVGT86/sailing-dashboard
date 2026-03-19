import React from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function SailTracker({ sails, refresh }) {
  const addSail = async () => {
    const id = prompt("Enter Sail ID (e.g., J2-105):");
    const name = prompt("Description (e.g., Race Jib 3Di):");
    const type = prompt("Type (Main, Jib, or Kite):");
    if (!id || !name) return;
    
    await axios.post(`${API_URL}/sails`, { id, name, type, hours_flown: 0 });
    refresh();
  };

  const deleteSail = async (id) => {
    if (window.confirm(`Retire ${id} from active wardrobe?`)) {
      await axios.delete(`${API_URL}/sails/${id}`);
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-blue-600">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-black uppercase italic text-[#1D1B44]">Sail Wardrobe</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Service Life Tracking</p>
          </div>
          <button onClick={addSail} className="bg-blue-600 text-white px-4 py-2 rounded font-black text-xs uppercase shadow-md hover:bg-[#1D1B44] transition-all">
            + New Inventory
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sails.map(sail => {
            const hours = sail.hours_flown || 0;
            // Service Life logic: Green < 30h, Yellow < 50h, Red > 50h
            const statusColor = hours > 50 ? 'bg-red-500' : hours > 30 ? 'bg-amber-400' : 'bg-green-500';
            
            return (
              <div key={sail.id} className="p-5 border rounded-xl bg-slate-50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className={`absolute top-0 left-0 h-1.5 w-full ${statusColor}`}></div>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{sail.id}</span>
                    <h3 className="font-black text-[#1D1B44] text-lg uppercase leading-tight">{sail.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{sail.type}</p>
                  </div>
                  <button onClick={() => deleteSail(sail.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <span className="text-xl">×</span>
                  </button>
                </div>

                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Total Flight Time</p>
                    <p className="text-2xl font-black text-[#1D1B44] italic">{hours.toFixed(1)} <span className="text-xs not-italic">HRS</span></p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${hours > 50 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                      {hours > 50 ? 'Retire Recommended' : 'Race Ready'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}