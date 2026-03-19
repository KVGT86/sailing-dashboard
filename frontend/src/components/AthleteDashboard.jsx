import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AthleteDashboard({ sailor, updateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ weightKg: '', heightCm: '', rhr: '', maxHr: '', vo2max: '' });
  const [manualGarminData, setManualGarminData] = useState({ avgHr: '', maxHr: '', sleepHours: '', rpe: '5', stressScore: '' });
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    if (sailor) {
      setProfileForm({ 
        weightKg: sailor.weightKg, 
        heightCm: sailor.heightCm, 
        rhr: sailor.rhr || '', 
        maxHr: sailor.maxHr || '', 
        vo2max: sailor.vo2max || '' 
      });
      setIsEditing(false);
      fetchHistory();
    }
  }, [sailor]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('http://localhost:5222/api/history');
      const sailorHistory = response.data.telemetry
        .filter(log => log.sailorId === sailor.id)
        .map(log => ({ ...log, date: new Date(log.timestamp).toLocaleDateString() }));
      setHistoryData(sailorHistory);
    } catch (error) { console.error("Could not fetch history", error); }
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    updateProfile(sailor.id, { 
      weightKg: Number(profileForm.weightKg), 
      heightCm: Number(profileForm.heightCm), 
      rhr: Number(profileForm.rhr), 
      maxHr: Number(profileForm.maxHr), 
      vo2max: Number(profileForm.vo2max) 
    });
    setIsEditing(false);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/telemetry', { sailorId: sailor.id, sailorName: sailor.name, ...manualGarminData });
      alert(`Success! Data saved.`);
      setManualGarminData({ avgHr: '', maxHr: '', sleepHours: '', rpe: '5', stressScore: '' });
      fetchHistory();
    } catch (error) { alert("Failed to save data."); }
  };

  // --- KARVONEN HEART RATE ZONES CALCULATION ---
  const calculateHRZones = () => {
    if (!sailor.rhr || !sailor.maxHr) return null;
    const hrr = sailor.maxHr - sailor.rhr; // Heart Rate Reserve
    return {
      zone1: Math.round((hrr * 0.50) + sailor.rhr) + " - " + Math.round((hrr * 0.60) + sailor.rhr), // Recovery
      zone2: Math.round((hrr * 0.60) + sailor.rhr) + " - " + Math.round((hrr * 0.70) + sailor.rhr), // Aerobic Base
      zone3: Math.round((hrr * 0.70) + sailor.rhr) + " - " + Math.round((hrr * 0.80) + sailor.rhr), // Tempo
      zone4: Math.round((hrr * 0.80) + sailor.rhr) + " - " + Math.round((hrr * 0.90) + sailor.rhr), // Anaerobic Threshold
      zone5: Math.round((hrr * 0.90) + sailor.rhr) + " - " + sailor.maxHr // VO2 Max
    };
  };

  const hrZones = calculateHRZones();

  if (!sailor) return <div className="p-6 font-bold text-[#0A192F]">Please select a sailor.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        
        {/* PROFILE CARD */}
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-red-600">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#0A192F]">{sailor.name}'s Profile</h2>
            <button onClick={() => setIsEditing(!isEditing)} className="text-sm text-red-600 font-bold hover:underline">
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
          {isEditing ? (
            <form onSubmit={handleProfileSave} className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-700">Weight (kg)</label><input type="number" step="0.1" value={profileForm.weightKg} onChange={e => setProfileForm({...profileForm, weightKg: e.target.value})} className="w-full mt-1" required /></div>
                  <div><label className="text-xs font-bold text-gray-700">Height (cm)</label><input type="number" value={profileForm.heightCm} onChange={e => setProfileForm({...profileForm, heightCm: e.target.value})} className="w-full mt-1" required /></div>
                  <div><label className="text-xs font-bold text-gray-700">Resting HR (bpm)</label><input type="number" value={profileForm.rhr} onChange={e => setProfileForm({...profileForm, rhr: e.target.value})} className="w-full mt-1" required /></div>
                  <div><label className="text-xs font-bold text-gray-700">Max HR (bpm)</label><input type="number" value={profileForm.maxHr} onChange={e => setProfileForm({...profileForm, maxHr: e.target.value})} className="w-full mt-1" required /></div>
                  <div className="col-span-2"><label className="text-xs font-bold text-gray-700">VO2 Max</label><input type="number" value={profileForm.vo2max} onChange={e => setProfileForm({...profileForm, vo2max: e.target.value})} className="w-full mt-1" required /></div>
               </div>
               <button type="submit" className="w-full bg-red-600 text-white p-2 rounded font-bold hover:bg-red-700">Save Changes</button>
            </form>
          ) : (
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="bg-gray-100 p-2 rounded"><span className="block text-[10px] font-bold text-gray-500 uppercase">Weight</span><span className="text-sm lg:text-base font-bold text-[#0A192F]">{sailor.weightKg}kg</span></div>
              <div className="bg-gray-100 p-2 rounded"><span className="block text-[10px] font-bold text-gray-500 uppercase">Height</span><span className="text-sm lg:text-base font-bold text-[#0A192F]">{sailor.heightCm}cm</span></div>
              <div className="bg-gray-100 p-2 rounded"><span className="block text-[10px] font-bold text-gray-500 uppercase">Rest HR</span><span className="text-sm lg:text-base font-bold text-[#0A192F]">{sailor.rhr || '--'}</span></div>
              <div className="bg-gray-100 p-2 rounded"><span className="block text-[10px] font-bold text-gray-500 uppercase">Max HR</span><span className="text-sm lg:text-base font-bold text-[#0A192F]">{sailor.maxHr || '--'}</span></div>
              <div className="bg-red-50 p-2 rounded border border-red-200"><span className="block text-[10px] font-bold text-red-600 uppercase">VO2 Max</span><span className="text-sm lg:text-base font-black text-red-700">{sailor.vo2max || '--'}</span></div>
            </div>
          )}
        </div>

        {/* DYNAMIC HR TRAINING ZONES CARD */}
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-[#0A192F]">
          <h2 className="text-lg font-bold text-[#0A192F] mb-4">Target Training Zones</h2>
          {hrZones ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 rounded bg-gray-100 border-l-4 border-gray-400">
                <span className="text-sm font-bold text-gray-700">Zone 1 (Recovery)</span>
                <span className="font-bold text-[#0A192F]">{hrZones.zone1} bpm</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-blue-50 border-l-4 border-blue-400">
                <span className="text-sm font-bold text-blue-900">Zone 2 (Aerobic Base)</span>
                <span className="font-bold text-[#0A192F]">{hrZones.zone2} bpm</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-green-50 border-l-4 border-green-500">
                <span className="text-sm font-bold text-green-900">Zone 3 (Tempo)</span>
                <span className="font-bold text-[#0A192F]">{hrZones.zone3} bpm</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-yellow-50 border-l-4 border-yellow-400">
                <span className="text-sm font-bold text-yellow-900">Zone 4 (Threshold)</span>
                <span className="font-bold text-[#0A192F]">{hrZones.zone4} bpm</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-red-50 border-l-4 border-red-600">
                <span className="text-sm font-bold text-red-900">Zone 5 (VO2 Max)</span>
                <span className="font-black text-red-700">{hrZones.zone5} bpm</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic font-medium">Enter Resting HR and Max HR to calculate zones.</p>
          )}
        </div>

      </div>

      <div className="space-y-6">
        {/* TELEMETRY ENTRY */}
        <div className="bg-white p-6 rounded-lg shadow border-t-4 border-[#0A192F]">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase border-b pb-2 mb-4">Log Session Telemetry</h3>
          <form onSubmit={handleManualSubmit} className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-gray-700">Avg HR</label><input type="number" className="w-full mt-1" value={manualGarminData.avgHr} onChange={e => setManualGarminData({...manualGarminData, avgHr: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-gray-700">Stress (0-100)</label><input type="number" className="w-full mt-1" value={manualGarminData.stressScore} onChange={e => setManualGarminData({...manualGarminData, stressScore: e.target.value})} /></div>
            <div className="col-span-2 bg-gray-50 p-4 rounded border border-gray-200">
              <label className="text-xs font-bold text-gray-700 mb-2 block">Subjective RPE (1-10)</label>
              <input type="range" min="1" max="10" className="w-full" value={manualGarminData.rpe} onChange={e => setManualGarminData({...manualGarminData, rpe: e.target.value})} />
              <div className="text-center font-black text-red-600 mt-2 text-lg">RPE: {manualGarminData.rpe}</div>
            </div>
            <button type="submit" className="col-span-2 bg-[#0A192F] text-white p-3 rounded font-bold hover:bg-gray-800 transition-colors">Save Session</button>
          </form>
        </div>

        {/* HISTORICAL CHART */}
        <div className="bg-white p-6 rounded-lg shadow flex flex-col h-[400px] border-t-4 border-red-600">
          <h3 className="text-sm font-bold text-[#0A192F] uppercase border-b pb-2 mb-4">Workload History (RPE vs Stress)</h3>
          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" domain={[0, 10]} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="rpe" stroke="#DC2626" name="RPE (1-10)" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="stressScore" stroke="#0A192F" name="Garmin Stress" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-grow flex items-center justify-center text-gray-400 font-medium">No history recorded yet. Log a session to see charts.</div>
          )}
        </div>
      </div>
    </div>
  );
}