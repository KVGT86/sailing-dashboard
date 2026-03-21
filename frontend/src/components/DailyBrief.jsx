import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Users, BatteryCharging, ShieldCheck } from 'lucide-react';

export default function DailyBrief() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await axios.get(`${API_URL}/team/recommendation`);
        setTeam(res.data);
      } catch (e) { console.error("Briefing Sync Failed"); }
      finally { setLoading(false); }
    };
    fetchRecs();
  }, []);

  if (loading) return <div className="font-black text-slate-300 animate-pulse text-xs uppercase">Analysing Crew Readiness...</div>

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <Users className="text-blue-500" size={16} />
        <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Daily Briefing: Top Available Sailors</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {team.slice(0, 6).map((sailor, i) => (
          <div 
            key={sailor.id} 
            className={`p-3 rounded-lg text-center border-2 ${i < 3 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}
          >
            <p className="font-black uppercase text-xs text-[#1D1B44]">{sailor.name.split(' ')[0]}</p>
            <div className="flex justify-center items-center gap-2 mt-2 text-[10px] font-bold">
              <ShieldCheck className="text-green-600" size={12}/>
              <span className="text-green-800">{sailor.readiness_score}</span>
              <BatteryCharging className="text-blue-600" size={12}/>
              <span className="text-blue-800">{sailor.body_battery}%</span>
            </div>
          </div>
        ))}
        {team.length === 0 && <p className="text-slate-400 font-bold text-xs">No sailors marked as available for today.</p>}
      </div>
    </div>
  );
}
