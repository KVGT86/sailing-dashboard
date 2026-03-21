import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AthleteDashboard from './components/AthleteDashboard';
import LiveConditions from './components/LiveConditions';
import SetupGuide from './components/SetupGuide';
import SailTracker from './components/SailTracker';
import SolentMap from './components/SolentMap';
import Settings from './components/Settings';
import RaceTracker from './components/RaceTracker';
import { API_URL } from './config';

export default function App() {
  const [roster, setRoster] = useState([]);
  const [sails, setSails] = useState([]);
  const [selectedSailorId, setSelectedSailorId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [crewRes, sailRes] = await Promise.all([
        axios.get(`${API_URL}/athletes`),
        axios.get(`${API_URL}/sails`)
      ]);
      setRoster(crewRes.data);
      setSails(sailRes.data);
      if (crewRes.data.length > 0 && !selectedSailorId) {
        setSelectedSailorId(crewRes.data[0].id);
      }
    } catch (error) { console.error("Sync Error:", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleOnBoat = async (sailor) => {
    try {
      const updatedSailor = { ...sailor, on_boat: !sailor.on_boat };
      setRoster(prev => prev.map(s => s.id === sailor.id ? updatedSailor : s));
      await axios.post(`${API_URL}/athletes`, updatedSailor);
    } catch (error) {
      alert("Failed to sync crew status.");
      fetchData();
    }
  };

  const addSailor = async () => {
    const name = prompt("Enter New Sailor Name:");
    if (!name) return;
    await axios.post(`${API_URL}/athletes`, { name, weight_kg: 80, height_cm: 180, rhr: 60, max_hr: 190, vo2max: 50, on_boat: false });
    fetchData();
  };

  const deleteSailor = async (id) => {
    if (window.confirm("Remove this sailor from the fleet?")) {
      await axios.delete(`${API_URL}/athletes/${id}`);
      fetchData();
    }
  };

  const activeCrew = roster.filter(s => s.on_boat);
  const totalWeight = activeCrew.reduce((sum, s) => sum + (s.weight_kg || 0), 0);
  const currentSailor = roster.find(s => s.id === selectedSailorId);

  if (loading) return <div className="min-h-screen bg-[#1D1B44] flex items-center justify-center text-white font-black italic uppercase animate-pulse tracking-widest">Initialising GBR 1381 PRO...</div>;

  return (
    <div className="bg-slate-100 min-h-screen pb-10">
      {/* PROFESSIONAL NAVBAR */}
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
          {['dashboard', 'map', 'race', 'guide', 'weather', 'sails', 'sailors', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`transition-all pb-1 border-b-2 ${activeTab === tab ? 'text-[#ED1C24] border-[#ED1C24]' : 'text-slate-400 border-transparent hover:text-white hover:border-slate-500'}`}>
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto mt-6 px-4">
        {/* LIVE MISSION CONTROL BAR */}
        <div className="bg-white p-4 rounded-xl shadow-lg mb-6 flex flex-wrap items-center justify-between border-l-8 border-[#ED1C24]">
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded">Active Crew</span>
            <div className="flex -space-x-2">
              {roster.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleOnBoat(s)}
                  title={s.name}
                  className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black uppercase transition-all shadow-sm ${
                    s.on_boat ? 'bg-[#ED1C24] text-white z-10 scale-110' : 'bg-slate-200 text-slate-400 grayscale opacity-50'
                  }`}
                >
                  {s.name.substring(0, 1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right border-r pr-6 border-slate-100">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Crew Mass</span>
                <p className={`text-xl font-black italic leading-none ${totalWeight > 350 ? 'text-red-600' : 'text-[#1D1B44]'}`}>
                   {totalWeight.toFixed(0)}<span className="text-[10px] uppercase not-italic ml-1 text-slate-400">KG</span>
                </p>
             </div>
             <div className="text-right">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fleet Ready</span>
                <p className="text-xl font-black italic leading-none text-green-500 uppercase">Active</p>
             </div>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'dashboard' && (
            <>
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Athlete Selected:</span>
                <select value={selectedSailorId} onChange={(e) => setSelectedSailorId(Number(e.target.value))} className="font-black text-sm bg-transparent outline-none border-b-2 border-slate-200 focus:border-[#ED1C24] uppercase text-[#1D1B44]">
                  {roster.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <AthleteDashboard sailor={currentSailor} updateProfile={fetchData} />
            </>
          )}

          {activeTab === 'map' && <SolentMap />}
          {activeTab === 'race' && <RaceTracker activeCrew={activeCrew} />}
          {activeTab === 'guide' && <SetupGuide activeCrew={activeCrew} />}
          {activeTab === 'weather' && <LiveConditions />}
          {activeTab === 'sails' && <SailTracker sails={sails} refresh={fetchData} />}
          {activeTab === 'settings' && <Settings roster={roster} />}

          {activeTab === 'sailors' && (
             <div className="bg-white p-8 rounded-xl shadow-2xl border-t-8 border-[#1D1B44]">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black uppercase italic text-[#1D1B44]">Sailor Roster</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Athlete Profile Management</p>
                  </div>
                  <button onClick={addSailor} className="bg-[#ED1C24] hover:bg-[#1D1B44] text-white px-6 py-3 rounded-lg font-black text-[10px] uppercase shadow-xl transition-all">+ Add Athlete</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roster.map(s => (
                    <div key={s.id} className="flex justify-between items-center p-5 bg-slate-50 border-2 border-slate-100 rounded-xl hover:border-slate-300 transition-colors">
                      <div>
                        <span className="font-black text-[#1D1B44] uppercase block">{s.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{s.weight_kg}KG • {s.on_boat ? 'ON BOAT' : 'OFF BOAT'}</span>
                      </div>
                      <button onClick={() => deleteSailor(s.id)} className="text-[#ED1C24] font-black text-[10px] uppercase hover:underline p-2">Remove</button>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      </main>

      <footer className="mt-10 border-t border-slate-200 p-6 text-center">
        <div className="inline-flex items-center gap-4 bg-white px-4 py-2 rounded-full shadow-sm border">
           <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${API_URL.includes('localhost') ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></div>
              <span className="text-[10px] font-black uppercase text-slate-500">Backend: {API_URL.includes('localhost') ? 'LOCAL (ACTIVE)' : 'PROD (CLOUDSYNC)'}</span>
           </div>
           <div className="h-4 w-px bg-slate-200"></div>
           <span className="text-[10px] font-black uppercase text-[#ED1C24]">Project Blueberry // GBR 1381</span>
        </div>
      </footer>
    </div>
  );
}