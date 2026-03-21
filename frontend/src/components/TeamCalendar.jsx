import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { ChevronLeft, ChevronRight, UserCheck, UserX } from 'lucide-react';

export default function TeamCalendar({ roster }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSailorId, setSelectedSailorId] = useState(roster[0]?.id);
  const [availability, setAvailability] = useState({});

  const fetchAvailability = async () => {
    if (!selectedSailorId) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    try {
      const res = await axios.get(`${API_URL}/athletes/${selectedSailorId}/availability?year=${year}&month=${month}`);
      const availMap = res.data.reduce((acc, item) => {
        acc[new Date(item.available_date).getDate()] = item.is_available;
        return acc;
      }, {});
      setAvailability(availMap);
    } catch (e) { console.error("Could not sync availability"); }
  };

  useEffect(() => {
    fetchAvailability();
  }, [currentDate, selectedSailorId]);

  const toggleDay = async (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateString = date.toISOString().split('T')[0];
    const currentStatus = availability[day] ?? true; // Default to available
    try {
      await axios.post(`${API_URL}/athletes/availability`, {
        athlete_id: selectedSailorId,
        date: dateString,
        is_available: !currentStatus
      });
      setAvailability(prev => ({ ...prev, [day]: !currentStatus }));
    } catch (e) { alert("Failed to update status."); }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  return (
    <div className="bg-white p-8 rounded-2xl shadow-2xl border-t-8 border-[#ED1C24]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black uppercase italic text-[#1D1B44]">Team Availability</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select an athlete to manage their schedule.</p>
        </div>
        <select value={selectedSailorId} onChange={e => setSelectedSailorId(Number(e.target.value))} className="p-3 border-2 border-slate-100 rounded-lg font-black uppercase text-[#1D1B44]">
          {roster.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Calendar Controls */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentDate(d => new Date(d.setMonth(d.getMonth() - 1)))} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeft/></button>
        <h3 className="text-xl font-black uppercase text-center text-[#ED1C24]">{currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}</h3>
        <button onClick={() => setCurrentDate(d => new Date(d.setMonth(d.getMonth() + 1)))} className="p-2 rounded-full hover:bg-slate-100"><ChevronRight/></button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center font-black text-slate-400 text-xs uppercase">{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isAvailable = availability[day] ?? true; // Default to available
          return (
            <button 
              key={day} 
              onClick={() => toggleDay(day)}
              className={`p-4 border-2 rounded-lg text-center font-black transition-all ${isAvailable ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}
            >
              {day}
              {isAvailable ? <UserCheck className="mx-auto mt-1 opacity-50" size={14}/> : <UserX className="mx-auto mt-1 opacity-50" size={14}/>}
            </button>
          )
        })}
      </div>
    </div>
  );
}
