import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function SailTracker() {
  const [sails, setSails] = useState([]);

  useEffect(() => {
    const fetchSails = async () => {
      const res = await axios.get(`${API_URL}/history`);
      setSails(res.data.sails || []);
    };
    fetchSails();
  }, []);

  const getHealthColor = (hours, type) => {
    const limit = type === 'Jib' ? 30 : 100; // Jibs blow out much faster
    if (hours < limit * 0.4) return 'bg-green-500';
    if (hours < limit * 0.8) return 'bg-yellow-500';
    return 'bg-[#ED1C24]'; // Lightfoot Red
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl border-t-4 border-[#1D1B44]">
      <h2 className="text-xl font-black uppercase text-[#1D1B44] mb-6">Sail Wardrobe Health</h2>
      <div className="space-y-6">
        {sails.map(sail => {
          const limit = sail.type === 'Jib' ? 30 : 100;
          const percentage = Math.min((sail.hours / limit) * 100, 100);
          
          return (
            <div key={sail.id} className="border-b pb-4 last:border-0">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sail.type}</span>
                  <h3 className="text-lg font-bold text-[#1D1B44]">{sail.name} <span className="text-slate-400 text-sm">#{sail.id}</span></h3>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-[#1D1B44]">{sail.hours.toFixed(1)} / {limit} hrs</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${getHealthColor(sail.hours, sail.type)}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-tighter">
                <span className="text-slate-400">Heavy Air Usage: {sail.heavyHours.toFixed(1)} hrs</span>
                <span className={sail.hours >= limit ? 'text-[#ED1C24]' : 'text-slate-400'}>
                  {sail.hours >= limit ? 'REPLACE FOR REGATTA' : 'Race Ready'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}