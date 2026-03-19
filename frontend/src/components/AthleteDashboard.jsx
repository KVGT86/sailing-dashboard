import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_URL } from '../config';

export default function AthleteDashboard({ sailor, updateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Local form states
  const [profileForm, setProfileForm] = useState({ 
    weight_kg: '', height_cm: '', rhr: '', max_hr: '', vo2max: '' 
  });
  const [manualGarminData, setManualGarminData] = useState({ 
    avgHr: '', maxHr: '', sleepHours: '', rpe: '5', stressScore: '' 
  });
  const [historyData, setHistoryData] = useState([]);

  // Sync profile form when sailor selection changes
  useEffect(() => {
    if (sailor) {
      setProfileForm({ 
        weight_kg: sailor.weight_kg || sailor.weightKg || '', 
        height_cm: sailor.height_cm || sailor.heightCm || '', 
        rhr: sailor.rhr || '', 
        max_hr: sailor.max_hr || sailor.maxHr || '', 
        vo2max: sailor.vo2max || '' 
      });
      setIsEditing(false);
      fetchHistory();
    }
  }, [sailor]);

  const fetchHistory = async () => {
    try {
      // Fetches the saved telemetry from Postgres
      const response = await axios.get(`${API_URL}/history`);
      // Filter for this specific sailor's logs
      const sailorHistory = response.data
        .filter(log => log.sailor_id === sailor.id || log.sailorId === sailor.id)
        .map(log => ({ 
          ...log, 
          date: new Date(log.date || log.timestamp).toLocaleDateString() 
        }));
      setHistoryData(sailorHistory);
    } catch (error) { 
      console.error("Could not fetch workload history", error); 
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        id: sailor.id,
        name: sailor.name,
        weight_kg: Number(profileForm.weight_kg),
        height_cm: Number(profileForm.height_cm),
        rhr: Number(profileForm.rhr),
        max_hr: Number(profileForm.max_hr),
        vo2max: Number(profileForm.vo2max)
      };

      await axios.post(`${API_URL}/athletes`, payload);
      
      // Update parent state (App.jsx)
      updateProfile(sailor.id, payload);
      setIsEditing(false);
      alert("Profile synced to GBR 1381 Cloud");
    } catch (error) {
      alert("Sync failed. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      // Saves Garmin/RPE data to the tuning_logs table as a "Session"
      await axios.post(`${API_BASE_URL}/tuning`, { 
        date: new Date().toISOString().split('T')[0],
        sailorId: sailor.id,
        sailorName: sailor.name,
        notes: `RPE: ${manualGarminData.rpe}, Stress: ${manualGarminData.stressScore}`,
        ...manualGarminData 
      });
      
      alert(`Success! Session saved.`);
      setManualGarminData({ avgHr: '', maxHr: '', sleepHours: '', rpe: '5', stressScore: '' });
      fetchHistory();
    } catch (error) { 
      alert("Failed to save session telemetry."); 
    }
  };

  // --- KARVONEN HEART RATE ZONES CALCULATION ---
  const calculateHRZones = () => {
    const currentRhr = profileForm.rhr;
    const currentMax = profileForm.max_hr;
    if (!currentRhr || !currentMax) return null;
    
    const hrr = currentMax - currentRhr;
    return {
      zone1: `${Math.round((hrr * 0.50) + currentRhr)} - ${Math.round((hrr * 0.60) + currentRhr)}`,
      zone2: `${Math.round((hrr * 0.60) + currentRhr)} - ${Math.round((hrr * 0.70) + currentRhr)}`,
      zone3: `${Math.round((hrr * 0.70) + currentRhr)} - ${Math.round((hrr * 0.80) + currentRhr)}`,
      zone4: `${Math.round((hrr * 0.80) + currentRhr)} - ${Math.round((hrr * 0.90) + currentRhr)}`,
      zone5: `${Math.round((hrr * 0.90) + currentRhr)} - ${currentMax}`
    };
  };

  const hrZones = calculateHRZones();

  if (!sailor) return <div className="p-6 font-bold text-[#1D1B44]">Please select a sailor.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        
        {/* PROFILE CARD */}
        <div className="bg-white p-6 rounded-lg shadow-xl border-t-4 border-[#ED1C24]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-[#1D1B44] uppercase italic">{sailor.name}</h2>
            <button onClick={() => setIsEditing(!isEditing)} className="text-xs text-[#ED1C24] font-black uppercase hover:underline">
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleProfileSave} className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Weight (kg)</label>
                    <input type="number" step="0.1" value={profileForm.weight_kg} onChange={e => setProfileForm({...profileForm, weight_kg: e.target.value})} className="w-full mt-1 font-bold" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Height (cm)</label>
                    <input type="number" value={profileForm.height_cm} onChange={e => setProfileForm({...profileForm, height_cm: e.target.value})} className="w-full mt-1 font-bold" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Resting HR</label>
                    <input type="number" value={profileForm.rhr} onChange={e => setProfileForm({...profileForm, rhr: e.target.value})} className="w-full mt-1 font-bold" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">Max HR</label>
                    <input type="number" value={profileForm.max_hr} onChange={e => setProfileForm({...profileForm, max_hr: e.target.value})} className="w-full mt-1 font-bold" required />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">VO2 Max</label>
                    <input type="number" value={profileForm.vo2max} onChange={e => setProfileForm({...profileForm, vo2max: e.target.value})} className="w-full mt-1 font-bold border-red-200" required />
                  </div>
               </div>
               <button type="submit" className="w-full bg-[#ED1C24] text-white p-3 rounded font-black uppercase tracking-widest hover:bg-[#1D1B44] transition-all">
                 {loading ? 'Syncing...' : 'Confirm Changes'}
               </button>
            </form>
          ) : (
            <div className="grid grid-cols-5 gap-2 text-center">
              <StatDisplay label="Weight" val={`${profileForm.weight_kg}kg`} />
              <StatDisplay label="Height" val={`${profileForm.height_cm}cm`} />
              <StatDisplay label="RHR" val={profileForm.rhr || '--'} />
              <StatDisplay label="MAX HR" val={profileForm.max_hr || '--'} />
              <div className="bg-red-50 p-2 rounded border border-red-100">
                <span className="block text-[8px] font-black text-red-600 uppercase">VO2 Max</span>
                <span className="text-sm font-black text-red-700">{profileForm.vo2max || '--'}</span>
              </div>
            </div>
          )}
        </div>

        {/* HR ZONES CARD */}
        <div className="bg-white p-6 rounded-lg shadow-xl border-t-4 border-[#1D1B44]">
          <h2 className="text-sm font-black text-[#1D1B44] uppercase tracking-widest mb-4 italic">Target Training Zones</h2>
          {hrZones ? (
            <div className="space-y-2">
              <ZoneRow label="Z1 Recovery" range={hrZones.zone1} color="border-slate-400 bg-slate-50" />
              <ZoneRow label="Z2 Aerobic" range={hrZones.zone2} color="border-blue-400 bg-blue-50" />
              <ZoneRow label="Z3 Tempo" range={hrZones.zone3} color="border-green-500 bg-green-50" />
              <ZoneRow label="Z4 Threshold" range={hrZones.zone4} color="border-orange-400 bg-orange-50" />
              <ZoneRow label="Z5 VO2 Max" range={hrZones.zone5} color="border-red-600 bg-red-50" isMax />
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Enter HR data to see targets.</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* TELEMETRY ENTRY */}
        <div className="bg-white p-6 rounded-lg shadow-xl border-t-4 border-[#1D1B44]">
          <h3 className="text-sm font-black text-[#1D1B44] uppercase mb-4 border-b pb-2">Log Garmin Telemetry</h3>
          <form onSubmit={handleManualSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Avg HR</label>
              <input type="number" className="w-full mt-1" value={manualGarminData.avgHr} onChange={e => setManualGarminData({...manualGarminData, avgHr: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Stress Score</label>
              <input type="number" className="w-full mt-1" value={manualGarminData.stressScore} onChange={e => setManualGarminData({...manualGarminData, stressScore: e.target.value})} />
            </div>
            <div className="col-span-2 bg-slate-50 p-4 rounded border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 mb-2 block uppercase">Subjective RPE (1-10)</label>
              <input type="range" min="1" max="10" className="w-full accent-[#ED1C24]" value={manualGarminData.rpe} onChange={e => setManualGarminData({...manualGarminData, rpe: e.target.value})} />
              <div className="text-center font-black text-[#ED1C24] mt-2 text-xl italic">Level {manualGarminData.rpe}</div>
            </div>
            <button type="submit" className="col-span-2 bg-[#1D1B44] text-white p-3 rounded font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95">Save Session</button>
          </form>
        </div>

        {/* WORKLOAD CHART */}
        <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col h-[350px] border-t-4 border-[#ED1C24]">
          <h3 className="text-sm font-black text-[#1D1B44] uppercase mb-4 border-b pb-2 italic">Workload History</h3>
          <div className="flex-grow">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={10} fontStyle="italic" />
                  <YAxis yAxisId="left" domain={[0, 10]} fontSize={10} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} fontSize={10} />
                  <Tooltip contentStyle={{ borderRadius: '10px', fontWeight: 'bold' }} />
                  <Legend iconType="circle" />
                  <Line yAxisId="left" type="monotone" dataKey="rpe" stroke="#ED1C24" name="RPE" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                  <Line yAxisId="right" type="monotone" dataKey="stressScore" stroke="#1D1B44" name="Stress" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-bold italic">Waiting for Garmin Data...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components for cleaner code
function StatDisplay({ label, val }) {
  return (
    <div className="bg-slate-50 p-2 rounded">
      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
      <span className="text-xs lg:text-sm font-black text-[#1D1B44]">{val}</span>
    </div>
  );
}

function ZoneRow({ label, range, color, isMax }) {
  return (
    <div className={`flex justify-between items-center p-2 rounded border-l-4 ${color}`}>
      <span className="text-[10px] font-black uppercase text-slate-700">{label}</span>
      <span className={`font-black ${isMax ? 'text-red-700' : 'text-[#1D1B44]'}`}>{range} <span className="text-[8px]">BPM</span></span>
    </div>
  );
}