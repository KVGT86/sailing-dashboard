import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Activity, Weight, Target, Heart } from 'lucide-react';

export default function AthleteDashboard({ sailor, updateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
    weight_kg: '', height_cm: '', rhr: '', max_hr: '', vo2max: '' 
  });

  useEffect(() => {
    if (sailor) {
      setProfileForm({ 
        weight_kg: sailor.weight_kg || '', 
        height_cm: sailor.height_cm || '', 
        rhr: sailor.rhr || '', 
        max_hr: sailor.max_hr || '', 
        vo2max: sailor.vo2max || '',
      });
      setIsEditing(false);
    }
  }, [sailor]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/athletes`, { ...profileForm, name: sailor.name });
      updateProfile();
      setIsEditing(false);
    } catch (e) { alert("Sync failed."); }
    finally { setLoading(false); }
  };

  const calculateHRZones = () => {
    const hrr = profileForm.max_hr - profileForm.rhr;
    if (!hrr) return null;
    return {
      z2: Math.round(hrr * 0.6 + Number(profileForm.rhr)),
      z4: Math.round(hrr * 0.8 + Number(profileForm.rhr)),
    };
  };

  const zones = calculateHRZones();

  if (!sailor) return <div className="p-10 font-black uppercase text-slate-400 italic">Select operative for technical briefing...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-8">
        {/* OPERATIVE IDENTITY */}
        <div className="bg-[#1D1B44] p-8 rounded-3xl shadow-2xl border-b-8 border-cyan-500 text-white">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{sailor.name}</h2>
              <p className="text-cyan-400 font-bold text-xs uppercase mt-2 tracking-[0.2em]">High Performance Profile</p>
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all">
              <Activity size={20} className="text-cyan-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-2 text-slate-400"><Weight size={14}/> <span className="text-[10px] font-black uppercase">Weight</span></div>
              <p className="text-2xl font-black italic">{profileForm.weight_kg} <span className="text-[10px]">KG</span></p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-2 text-slate-400"><Target size={14}/> <span className="text-[10px] font-black uppercase">VO2 MAX</span></div>
              <p className="text-2xl font-black italic text-red-500">{profileForm.vo2max}</p>
            </div>
          </div>
        </div>

        {/* TARGET HEART RATES */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-slate-900">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <Heart className="text-red-500" size={16}/> Physiological Targets
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border-l-4 border-blue-500">
              <span className="text-[10px] font-black uppercase text-blue-900">Aerobic Base (Z2)</span>
              <span className="text-xl font-black text-blue-900">{zones?.z2 || '--'} <span className="text-[10px]">BPM</span></span>
            </div>
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border-l-4 border-red-500">
              <span className="text-[10px] font-black uppercase text-red-900">Threshold (Z4)</span>
              <span className="text-xl font-black text-red-900">{zones?.z4 || '--'} <span className="text-[10px]">BPM</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* TECHNICAL OVERRIDES */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 h-fit">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 border-b pb-2">Manual Override</h3>
        <form onSubmit={handleSave} className="space-y-4">
           {['weight_kg', 'height_cm', 'rhr', 'max_hr', 'vo2max'].map(field => (
             <div key={field}>
               <label className="text-[8px] font-black uppercase text-slate-400 ml-2 mb-1 block">{field.replace('_', ' ')}</label>
               <input 
                type="number" 
                step="0.1"
                className="w-full bg-slate-50 border-2 border-slate-100 p-3 rounded-xl font-black text-[#1D1B44] focus:border-cyan-500 transition-all outline-none"
                value={profileForm[field]}
                onChange={e => setProfileForm({...profileForm, [field]: e.target.value})}
               />
             </div>
           ))}
           <button type="submit" disabled={loading} className="w-full bg-[#1D1B44] text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-cyan-500 transition-all mt-4 shadow-lg shadow-cyan-500/20 active:scale-95">
             {loading ? 'Transmitting...' : 'Commit to Cloud'}
           </button>
        </form>
      </div>
    </div>
  );
}
