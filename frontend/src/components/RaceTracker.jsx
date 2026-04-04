import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Timer, Trophy, Flag, Wind, Anchor } from 'lucide-react';
import { API_URL } from '../config';

export default function RaceTracker({ activeCrew }) {
  const [races, setRaces] = useState([]);
  const [timer, setTimer] = useState(300); // 5 minute sequence
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRaces = async () => {
    try {
      const res = await axios.get(`${API_URL}/races`);
      setRaces(Array.isArray(res.data) ? res.data : []);
    } catch (e) { 
      console.error("Race Sync Failed"); 
      setRaces([]);
    }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRaces();
    let interval;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const logRace = async () => {
    const event = prompt("Event Name:");
    if (!event) return;
    const pos = prompt("Finish Position:");
    const total = prompt("Total Boats:");
    
    try {
      await axios.post(`${API_URL}/races`, {
        event_name: event,
        wind_speed: 12, // Default/current
        wind_dir: 215,
        result_pos: parseInt(pos),
        total_boats: parseInt(total),
        crew_list: activeCrew.map(c => c.name).join(', '),
        notes: ""
      });
      fetchRaces();
    } catch (e) { alert("Failed to log race."); }
  };

  if (loading) return <div className="p-10 text-center font-black animate-pulse uppercase">Syncing Race Control...</div>;

  return (
    <div className="space-y-6">
      {/* RACE SEQUENCE HUD */}
      <div className="bg-[#1D1B44] p-8 rounded-2xl shadow-2xl border-b-8 border-[#ED1C24] text-white flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-center md:text-left">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ED1C24]">Sequence Timer</span>
          <div className="text-8xl font-black italic tracking-tighter tabular-nums leading-none mt-2">
            {formatTime(timer)}
          </div>
          <div className="flex gap-2 mt-6 justify-center md:justify-start">
            <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`px-6 py-2 rounded font-black uppercase text-[10px] tracking-widest transition-all ${isTimerRunning ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}>
              {isTimerRunning ? 'Pause' : 'Start 5m'}
            </button>
            <button onClick={() => {setTimer(300); setIsTimerRunning(false);}} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded font-black uppercase text-[10px] tracking-widest">Reset</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
           <HUDBox label="Active Crew" val={activeCrew.length} sub="Athletes" icon={<Anchor size={16}/>} />
           <HUDBox label="Last Pos" val={races[0]?.result_pos || '--'} sub={`of ${races[0]?.total_boats || '--'}`} icon={<Trophy size={16}/>} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LOG ACTION */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border-t-4 border-[#ED1C24]">
           <h3 className="font-black uppercase italic text-[#1D1B44] mb-4 flex items-center gap-2">
             <Flag className="text-[#ED1C24]" size={18} /> Log Performance
           </h3>
           <p className="text-xs text-slate-500 mb-6 font-bold uppercase leading-tight">Record finish times and conditions to train the Smart Engine.</p>
           <button onClick={logRace} className="w-full bg-[#1D1B44] hover:bg-[#ED1C24] text-white p-4 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">
             Submit Race Result
           </button>
        </div>

        {/* RACE HISTORY */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
           <h3 className="font-black uppercase italic text-[#1D1B44] mb-6 border-b pb-2 flex items-center gap-2">
             <Trophy className="text-amber-500" size={18} /> Recent Engagements
           </h3>
           <div className="space-y-3">
             {races.map(r => (
               <div key={r.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border-l-4 border-[#1D1B44]">
                 <div>
                    <span className="font-black text-[#1D1B44] uppercase text-sm block">{r.event_name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(r.date).toLocaleDateString()} • {r.wind_speed} KTS</span>
                 </div>
                 <div className="text-right">
                    <span className="text-2xl font-black italic text-[#ED1C24] leading-none">{r.result_pos}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase ml-1">/ {r.total_boats}</span>
                 </div>
               </div>
             ))}
             {races.length === 0 && <p className="text-center py-10 text-slate-300 font-black italic uppercase">No race data recorded.</p>}
           </div>
        </div>
      </div>
    </div>
  );
}

function HUDBox({ label, val, sub, icon }) {
    return (
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center min-w-[120px]">
            <div className="text-[#ED1C24] mb-1">{icon}</div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-3xl font-black italic text-white">{val}</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase">{sub}</p>
        </div>
    )
}
