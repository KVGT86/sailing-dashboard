import React, { useState } from 'react';
import axios from 'axios';
import SailTracker from './SailTracker';
import { API_URL } from '../config';

export default function BoatTuningLog({ activeCrew }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    windCondition: 'Medium (11-16 kts)',
    sessionDurationHours: '2',
    upperShroudPT2: '', 
    lowerShroudPT2: '', 
    headstayLength: '',
    jibUsed: 'J1-104',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/tuning`, { 
        ...formData, 
        crewWeight: activeCrew.reduce((sum, s) => sum + s.weightKg, 0) 
      });
      alert('Log Saved: GBR 1381 Data Updated');
      window.location.reload();
    } catch (error) { 
      alert("Error: Server might be waking up. Try again in 30 seconds."); 
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: The Input Form */}
      <div className="lg:col-span-2 p-4 md:p-6 bg-white rounded-xl shadow border-t-4 border-[#1D1B44]">
        <h2 className="text-xl md:text-2xl font-black mb-6 text-[#1D1B44] uppercase italic">Session Log</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* TOP ROW: Date, Conditions, Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1">Date</label>
              <input type="date" className="w-full text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1">Conditions</label>
              <select className="w-full text-sm font-bold" value={formData.windCondition} onChange={e => setFormData({...formData, windCondition: e.target.value})}>
                <option>Light (0-10 kts)</option>
                <option>Medium (11-16 kts)</option>
                <option>Heavy (17+ kts)</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-1">Duration (Hrs)</label>
              <input type="number" step="0.5" className="w-full text-sm font-bold" value={formData.sessionDurationHours} onChange={e => setFormData({...formData, sessionDurationHours: e.target.value})} />
            </div>
          </div>

          {/* RIG & SAILS SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rig Turns */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-[#ED1C24] uppercase italic border-b border-red-100 pb-1">Rig Turns (PT2)</h3>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Uppers" className="w-full text-sm" onChange={e => setFormData({...formData, upperShroudPT2: e.target.value})} />
                <input type="number" placeholder="Lowers" className="w-full text-sm" onChange={e => setFormData({...formData, lowerShroudPT2: e.target.value})} />
              </div>
              <input type="text" placeholder="Headstay Length (mm)" className="w-full text-sm" onChange={e => setFormData({...formData, headstayLength: e.target.value})} />
            </div>

            {/* Sail Inventory */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-[#ED1C24] uppercase italic border-b border-red-100 pb-1">Sail Inventory</h3>
              <select className="w-full text-sm font-bold" value={formData.jibUsed} onChange={e => setFormData({...formData, jibUsed: e.target.value})}>
                <option value="J1-104">North J2-A (Race #104)</option>
                <option value="J1-99">North J2-B (Practice #99)</option>
              </select>
              <textarea 
                placeholder="Session Notes (Tide, Traffic, Speed...)" 
                className="w-full text-sm h-20" 
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#ED1C24] text-white p-4 rounded font-black uppercase tracking-widest hover:bg-[#1D1B44] transition-all shadow-lg active:scale-95 touch-manipulation"
          >
            Update Inventory & Log
          </button>
        </form>
      </div>

      {/* RIGHT/BOTTOM: Sail Tracker */}
      <div className="lg:col-span-1 h-fit">
        <SailTracker />
      </div>
    </div>
  );
}