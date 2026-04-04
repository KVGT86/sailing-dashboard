import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AthleteDashboard from './components/AthleteDashboard';
import LiveConditions from './components/LiveConditions';
import SetupGuide from './components/SetupGuide';
import SailTracker from './components/SailTracker';
import SolentMap from './components/SolentMap';
import Settings from './components/Settings';
import RaceTracker from './components/RaceTracker';
import TeamCalendar from './components/TeamCalendar';
import DailyBrief from './components/DailyBrief';
import { API_URL } from './config';

export default function App() {
  const [roster, setRoster] = useState([]);
  const [sails, setSails] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [crewRes, sailRes] = await Promise.all([
        axios.get(`${API_URL}/athletes`),
        axios.get(`${API_URL}/sails`)
      ]);
      setRoster(Array.isArray(crewRes.data) ? crewRes.data : []);
      setSails(Array.isArray(sailRes.data) ? sailRes.data : []);
    } catch (error) { 
      console.error("Sync Error:", error); 
      setRoster([]);
      setSails([]);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  
  const [activeTab, setActiveTab] = useState('briefing');
  const [activeSailor, setActiveSailor] = useState(null);

  const activeCrew = roster.filter(s => s.on_boat);
  const totalWeight = activeCrew.reduce((sum, s) => sum + (s.weight_kg || 0), 0);

  if (loading) return <div className="min-h-screen bg-[#1D1B44] flex items-center justify-center text-white font-black italic uppercase animate-pulse tracking-widest">Initialising GBR 1381 PRO...</div>;

  return (
    <div className="bg-slate-100 min-h-screen pb-10">
      {/* NAVBAR */}
      <nav className="bg-[#1D1B44] text-white p-4 shadow-2xl flex justify-between items-center border-b-4 border-[#ED1C24] sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white p-1 rounded">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter leading-none text-white">Lightfoot Racing</h1>
            <p className="text-[8px] font-black tracking-[0.2em] text-[#ED1C24] uppercase">Grand Prix Performance • GBR 1381</p>
          </div>
        </div>
        <div className="flex gap-4 md:gap-6 text-[10px] font-black uppercase overflow-x-auto no-scrollbar">
          {['briefing', 'map', 'race', 'guide', 'team', 'sails', 'sailors', 'settings'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setActiveSailor(null); }} className={`transition-all pb-1 border-b-2 ${activeTab === tab ? 'text-[#ED1C24] border-[#ED1C24]' : 'text-slate-400 border-transparent hover:text-white hover:border-slate-500'}`}>
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto mt-6 px-4">
        {/* TOP BAR */}
        <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex items-center justify-between border-l-8 border-[#ED1C24]">
          <DailyBrief />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'briefing' && <LiveConditions />}
          {activeTab === 'map' && <SolentMap />}
          {activeTab === 'race' && <RaceTracker activeCrew={activeCrew} />}
          {activeTab === 'guide' && <SetupGuide activeCrew={activeCrew} />}
          {activeTab === 'team' && <TeamCalendar roster={roster} />}
          {activeTab === 'sails' && <SailTracker sails={sails} refresh={fetchData} />}
          {activeTab === 'settings' && <Settings roster={roster} />}

          {activeTab === 'sailors' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-lg border-t-4 border-[#1D1B44]">
                   <h2 className="text-xl font-black uppercase italic text-[#1D1B44]">Sailor Roster</h2>
                   <div className="mt-4 space-y-2">
                     {roster.map(s => (
                       <button key={s.id} onClick={() => setActiveSailor(s)} className={`w-full text-left p-4 rounded-lg font-black uppercase border-2 transition-all ${activeSailor?.id === s.id ? 'bg-[#ED1C24] text-white border-transparent' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                         {s.name}
                       </button>
                     ))}
                   </div>
                </div>
                <div className="md:col-span-2">
                  {activeSailor ? (
                    <AthleteDashboard sailor={activeSailor} updateProfile={fetchData} key={activeSailor.id} />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-white rounded-xl shadow-lg text-slate-400 font-black uppercase italic">
                      Select a sailor to view profile
                    </div>
                  )}
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
