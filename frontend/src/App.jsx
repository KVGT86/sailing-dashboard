import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AthleteDashboard from './components/AthleteDashboard';
import BoatTuningLog from './components/BoatTuningLog';
import SolentTidesModule from './components/SolentTidesModule';
import SetupGuide from './components/SetupGuide';
import LiveConditions from './components/LiveConditions';
import { API_BASE_URL } from './config';

export default function App() {
  const [roster, setRoster] = useState([]);
  const [selectedSailorId, setSelectedSailorId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // 1. INITIAL LOAD: Fetch crew from Postgres
  useEffect(() => {
    const fetchCrew = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/athletes`);
        if (response.data.length > 0) {
          // Map snake_case from DB back to camelCase for the UI if necessary, 
          // though our new components handle both.
          setRoster(response.data);
          setSelectedSailorId(response.data[0].id);
        }
      } catch (error) {
        console.error("Cloud Sync Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCrew();
  }, []);

  const toggleBoatAssignment = (id) => {
    setRoster(roster.map(sailor => 
      sailor.id === id ? { ...sailor, onBoat: !sailor.onBoat } : sailor
    ));
  };

  // 2. SYNC UPDATE: Keeps the local UI snappy while DB saves
  const updateProfile = (id, updatedStats) => {
    setRoster(prevRoster => prevRoster.map(sailor => 
      sailor.id === id ? { ...sailor, ...updatedStats } : sailor
    ));
  };

  const activeCrew = roster.filter(s => s.onBoat || s.on_boat);
  const currentSailor = roster.find(s => s.id === selectedSailorId);

  if (loading) {
    return (
      <div className="bg-[#1D1B44] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white font-black italic uppercase tracking-[0.3em] animate-pulse">
            Syncing GBR 1381 Cloud...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen pb-10">
      <nav className="relative z-50 bg-[#1D1B44] text-white p-4 shadow-lg flex flex-col md:flex-row justify-between items-center border-b-4 border-[#ED1C24] gap-4">
        <div className="flex items-center space-x-4">
          <img 
            src="/logo.png" 
            alt="Lightfoot Logo" 
            className="h-10 md:h-12 w-auto bg-transparent rounded p-1" 
            onError={(e) => e.target.style.display = 'none'} 
          />
          <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic">Lightfoot Racing</h1>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 md:gap-6 text-[10px] md:text-sm font-bold uppercase tracking-widest">
          {['dashboard', 'tuning', 'guide', 'weather', 'tides'].map((tab) => (
            <button 
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)} 
              className={`pb-1 transition-colors touch-manipulation capitalize ${activeTab === tab ? 'text-[#ED1C24] border-b-2 border-[#ED1C24]' : 'text-gray-300 hover:text-white'}`}
            >
              {tab === 'dashboard' ? 'Athletes' : tab === 'tuning' ? 'Log' : tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto mt-6 px-4">
        <div className="bg-white p-5 rounded-lg shadow-xl mb-6 border-t-4 border-[#1D1B44]">
          <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-[#1D1B44]">Today's Active Crew</h2>
          <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-100 pb-5">
            {roster.map(sailor => (
              <button 
                key={sailor.id} 
                onClick={() => toggleBoatAssignment(sailor.id)}
                className={`px-3 py-2 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-sm ${
                  (sailor.onBoat || sailor.on_boat) 
                  ? 'bg-[#ED1C24] text-white ring-2 ring-red-200' 
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              >
                {sailor.name.split(' ')[0]} {(sailor.onBoat || sailor.on_boat) && '✓'}
              </button>
            ))}
          </div>
          
          {activeTab === 'dashboard' && currentSailor && (
            <div className="flex items-center space-x-3">
              <span className="text-xs font-black uppercase text-slate-500">Focus:</span>
              <select 
                className="border-2 border-slate-200 rounded-md p-2 text-sm font-bold text-[#1D1B44] bg-slate-50 focus:border-[#ED1C24] outline-none" 
                value={selectedSailorId} 
                onChange={(e) => setSelectedSailorId(Number(e.target.value))}
              >
                {roster.map(sailor => (
                  <option key={sailor.id} value={sailor.id}>{sailor.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'dashboard' && <AthleteDashboard sailor={currentSailor} updateProfile={updateProfile} />}
          {activeTab === 'tuning' && <BoatTuningLog activeCrew={activeCrew} />}
          {activeTab === 'guide' && <SetupGuide activeCrew={activeCrew} />}
          {activeTab === 'weather' && <LiveConditions />}
          {activeTab === 'tides' && <SolentTidesModule />}
        </div>
      </main>
      
      <footer className="container mx-auto mt-12 mb-8 text-center px-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          GBR 1381 Lightfoot Performance Systems
        </p>
      </footer>
    </div>
  );
}