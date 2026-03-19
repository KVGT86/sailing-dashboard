import React, { useState } from 'react';
import axios from 'axios';
import SailTracker from './SailTracker'; // Import the new tracker

export default function BoatTuningLog({ activeCrew }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    windCondition: 'Medium (11-16 kts)',
    sessionDurationHours: '2', // New field
    upperShroudPT2: '', 
    lowerShroudPT2: '', 
    headstayLength: '',
    jibUsed: 'J1-104', // Matches our db.json ID
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // POST to your backend on Port 5222
      await axios.post('http://localhost:5222/api/tuning', { 
        ...formData, 
        crewWeight: activeCrew.reduce((sum, s) => sum + s.weightKg, 0) 
      });
      alert('Log Saved: Rig settings recorded and Sail Hours updated.');
      window.location.reload(); // Quick refresh to update the tracker bars
    } catch (error) { 
      alert("Error: Ensure backend is running on port 5222"); 
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: The Input Form */}
      <div className="lg:col-span-2 p-6 bg-white rounded-xl shadow border-t-4 border-[#1D1B44]">
        <h2 className="text-2xl font-black mb-6 text-[#1D1B44] uppercase italic">Session Log</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500">Date</label>
              <input type="date" className="w-full mt-1" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500">Conditions</label>
              <select className="w-full mt-1 font-bold" value={formData.windCondition} onChange={e => setFormData({...formData, windCondition: e.target.value})}>
                <option>Light (0-10 kts)</option>
                <option>Medium (11-16 kts)</option>
                <option>Heavy (17+ kts)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500">Duration (Hrs)</label>
              <input type="number" step="0.5" className="w-full mt-1 font-bold" value={formData.sessionDurationHours} onChange={e => setFormData({...formData, sessionDurationHours: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-black text-[#ED1C24] uppercase mb-3 italic">Rig Setup</h3>
              <div className="space-y-3">
                <input type="number" placeholder="Uppers (Turns)" className="w-full" onChange={e => setFormData({...formData, upperShroudPT2: e.target.value})} />
                <input type="number" placeholder="Lowers (Turns)" className="w-full" onChange={e => setFormData({...formData, lowerShroudPT2: e.target.value})} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black text-[#ED1C24] uppercase mb-3 italic">Sail Choice</h3>
              <select className="w-full font-bold" value={formData.jibUsed} onChange={e => setFormData({...formData, jibUsed: e.target.value})}>
                <option value="J1-104">North J2-A (Race #104)</option>
                <option value="J1-99">North J2-B (Practice #99)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="w-full bg-[#ED1C24] text-white p-4 rounded font-black uppercase tracking-widest hover:bg-[#1D1B44] transition-all">
            Confirm Settings & Update Inventory
          </button>
        </form>
      </div>

      {/* RIGHT: The Live Sail Tracker */}
      <div className="lg:col-span-1">
        <SailTracker />
      </div>
    </div>
  );
}