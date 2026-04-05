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
import { Plus, UserPlus } from 'lucide-react';

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

  const addSailor = async () => {
    const name = prompt("Enter full name of new athlete:");
    if (!name) return;
    try {
      await axios.post(`${API_URL}/athletes`, { 
        name, 
        weight_kg: 75, 
        height_cm: 180, 
        rhr: 60, 
        max_hr: 190, 
        vo2max: 50,
        on_boat: false 
      });
      fetchData(); // Reload list
    } catch (e) { alert("Failed to add sailor."); }
  };

  if (loading) return <div className="min-h-screen bg-[#0b1121] flex items-center justify-center text-cyan-400 font-black italic uppercase animate-pulse tracking-[0.3em]">Deploying GBR 1381 Command...</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-10 font-sans selection:bg-cyan-500 selection:text-white">
      {/* COMMAND NAVBAR */}
      <nav className="bg-[#1D1B44] text-white p-4 shadow-2xl flex flex-col md:flex-row justify-between items-center border-b-4 border-cyan-500 sticky top-0 z-[1000] backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="bg-white p-1 rounded-lg">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none text-white">Lightfoot Tactical</h1>
            <p className="text-[7px] font-black tracking-[0.4em] text-cyan-400 uppercase mt-1">Onshore Command Center • GBR 1381</p>
          </div>
        </div>
        <div className="flex gap-4 md:gap-8 text-[10px] font-black uppercase overflow-x-auto no-scrollbar pb-2 md:pb-0">
          {['briefing', 'map', 'race', 'guide', 'team', 'sails', 'sailors', 'settings'].map(tab => (
            <button 
              key={tab} 
              onClick={() => { setActiveTab(tab); setActiveSailor(null); }} 
              className={`transition-all pb-1 border-b-4 tracking-widest ${activeTab === tab ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent hover:text-white hover:border-slate-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto mt-8 px-4 max-w-7xl">
        {/* SYNOPTIC DAILY BRIEFING */}
        <div className="bg-white p-6 rounded-3xl shadow-xl mb-8 flex items-center justify-between border-l-[12px] border-cyan-500">
          <DailyBrief />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {activeTab === 'briefing' && <LiveConditions />}
          {activeTab === 'map' && <SolentMap />}
          {activeTab === 'race' && <RaceTracker activeCrew={activeCrew} />}
          {activeTab === 'guide' && <SetupGuide activeCrew={activeCrew} />}
          {activeTab === 'team' && <TeamCalendar roster={roster} />}
          {activeTab === 'sails' && <SailTracker sails={sails} refresh={fetchData} />}
          {activeTab === 'settings' && <Settings roster={roster} />}

          {activeTab === 'sailors' && (
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-4">
                   <div className="bg-white p-6 rounded-3xl shadow-xl border-t-4 border-[#1D1B44]">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-black uppercase italic text-[#1D1B44]">Operatives</h2>
                        <button onClick={addSailor} className="text-cyan-600 hover:text-cyan-400 transition-colors">
                          <UserPlus size={20} />
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                        {roster.map(s => (
                          <button 
                            key={s.id} 
                            onClick={() => setActiveSailor(s)} 
                            className={`w-full text-left p-4 rounded-2xl font-black uppercase text-xs border-2 transition-all ${activeSailor?.id === s.id ? 'bg-[#1D1B44] text-white border-transparent shadow-lg scale-[1.02]' : 'bg-slate-50 border-slate-100 hover:border-cyan-200 text-slate-600'}`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>
                <div className="lg:col-span-3">
                  {activeSailor ? (
                    <AthleteDashboard sailor={activeSailor} updateProfile={fetchData} key={activeSailor.id} />
                  ) : (
                    <div className="h-[600px] flex flex-col items-center justify-center bg-white rounded-3xl shadow-xl text-slate-300 border-4 border-dashed border-slate-100">
                      <Activity size={64} className="mb-4 opacity-20" />
                      <p className="font-black uppercase italic tracking-widest">Select Operative for Full Bio-Technical Scan</p>
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

function Activity({ size, className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  );
}
