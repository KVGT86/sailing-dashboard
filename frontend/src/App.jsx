import React, { useState } from 'react';
import AthleteDashboard from './components/AthleteDashboard';
import BoatTuningLog from './components/BoatTuningLog';
import SolentTidesModule from './components/SolentTidesModule';
import SetupGuide from './components/SetupGuide';
import LiveConditions from './components/LiveConditions';

const INITIAL_SAILORS = [
  { id: 1, name: 'Morgan Renoylds', onBoat: true, weightKg: 80, heightCm: 180, rhr: 52, maxHr: 192, vo2max: 58 },
  { id: 2, name: 'Nils Theuninck', onBoat: true, weightKg: 98, heightCm: 196, rhr: 48, maxHr: 188, vo2max: 62 }, 
  { id: 3, name: 'Kate Angier', onBoat: true, weightKg: 65, heightCm: 168, rhr: 54, maxHr: 195, vo2max: 55 },
  { id: 4, name: 'George Selwood', onBoat: true, weightKg: 80, heightCm: 182, rhr: 50, maxHr: 190, vo2max: 60 },
  { id: 5, name: 'Cam Yates (Reserve)', onBoat: false, weightKg: 75, heightCm: 178, rhr: 55, maxHr: 194, vo2max: 56 },
  { id: 6, name: 'Alex Barone (Reserve)', onBoat: false, weightKg: 85, heightCm: 185, rhr: 53, maxHr: 189, vo2max: 57 },
  { id: 7, name: 'Caleb Barnes (Reserve)', onBoat: false, weightKg: 78, heightCm: 180, rhr: 51, maxHr: 196, vo2max: 59 },
  { id: 8, name: 'Guest Sailor (Reserve)', onBoat: false, weightKg: 80, heightCm: 175, rhr: 60, maxHr: 185, vo2max: 50 }
];

export default function App() {
  const [roster, setRoster] = useState(INITIAL_SAILORS);
  const [selectedSailorId, setSelectedSailorId] = useState(1);
  const [activeTab, setActiveTab] = useState('dashboard');

  const toggleBoatAssignment = (id) => {
    setRoster(roster.map(sailor => sailor.id === id ? { ...sailor, onBoat: !sailor.onBoat } : sailor));
  };

  const updateSailorProfile = (id, updatedStats) => {
    setRoster(roster.map(sailor => sailor.id === id ? { ...sailor, ...updatedStats } : sailor));
  };

  const activeCrew = roster.filter(s => s.onBoat);
  const currentSailor = roster.find(s => s.id === selectedSailorId);

  return (
    <div className="bg-slate-100 min-h-screen pb-10">
      {/* HEADER: Updated with z-50 and Mobile-Friendly Navigation */}
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
        
        {/* Navigation Tabs - FIXED FOR MOBILE (removed hidden md:flex) */}
        <div className="flex flex-wrap justify-center gap-3 md:gap-6 text-[10px] md:text-sm font-bold uppercase tracking-widest">
          <button 
            type="button"
            onClick={() => setActiveTab('dashboard')} 
            className={`pb-1 transition-colors touch-manipulation ${activeTab === 'dashboard' ? 'text-[#ED1C24] border-b-2 border-[#ED1C24]' : 'text-gray-300 hover:text-white'}`}
          >
            Athletes
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('tuning')} 
            className={`pb-1 transition-colors touch-manipulation ${activeTab === 'tuning' ? 'text-[#ED1C24] border-b-2 border-[#ED1C24]' : 'text-gray-300 hover:text-white'}`}
          >
            Log
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('guide')} 
            className={`pb-1 transition-colors touch-manipulation ${activeTab === 'guide' ? 'text-[#ED1C24] border-b-2 border-[#ED1C24]' : 'text-gray-300 hover:text-white'}`}
          >
            Guide
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('weather')} 
            className={`pb-1 transition-colors touch-manipulation ${activeTab === 'weather' ? 'text-[#ED1C24] border-b-2 border-[#ED1C24]' : 'text-gray-300 hover:text-white'}`}
          >
            Weather
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('tides')} 
            className={`pb-1 transition-colors touch-manipulation ${activeTab === 'tides' ? 'text-[#ED1C24] border-b-2 border-[#ED1C24]' : 'text-gray-300 hover:text-white'}`}
          >
            Tides
          </button>
        </div>
      </nav>

      <main className="container mx-auto mt-6 px-4">
        {/* Crew Management Section */}
        <div className="bg-white p-5 rounded-lg shadow-xl mb-6 border-t-4 border-[#1D1B44]">
          <h2 className="text-sm font-black uppercase tracking-widest mb-4 text-[#1D1B44]">Today's Active Crew</h2>
          <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-100 pb-5">
            {roster.map(sailor => (
              <button 
                key={sailor.id} 
                onClick={() => toggleBoatAssignment(sailor.id)}
                className={`px-3 py-2 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-sm ${
                  sailor.onBoat 
                  ? 'bg-[#ED1C24] text-white ring-2 ring-red-200' 
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              >
                {sailor.name.split(' ')[0]} {sailor.onBoat && '✓'}
              </button>
            ))}
          </div>
          
          {activeTab === 'dashboard' && (
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

        {/* Dynamic Tab Routing */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'dashboard' && <AthleteDashboard sailor={currentSailor} updateProfile={updateSailorProfile} />}
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