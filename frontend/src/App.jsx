import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AthleteDashboard from './components/AthleteDashboard';
import BoatTuningLog from './components/BoatTuningLog';
import SolentTidesModule from './components/SolentTidesModule';
import SetupGuide from './components/SetupGuide';
import LiveConditions from './components/LiveConditions';
import { API_URL } from './config';

export default function App() {
  const [roster, setRoster] = useState([]);
  const [selectedSailorId, setSelectedSailorId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA ---
  const fetchCrew = async () => {
    try {
      const response = await axios.get(`${API_URL}/athletes`);
      setRoster(response.data);
      if (response.data.length > 0 && !selectedSailorId) {
        setSelectedSailorId(response.data[0].id);
      }
    } catch (error) { console.error("Sync Error:", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCrew(); }, []);

  // --- ACTIONS ---
  const addSailor = async () => {
    const name = prompt("Enter New Sailor Name:");
    if (!name) return;

    // REMOVE: const newId = Date.now(); 
    
    const newSailor = { 
      name, // The database uses this to identify the person
      weight_kg: 80, 
      height_cm: 180, 
      rhr: 60, 
      max_hr: 190, 
      vo2max: 50 
    };

    try {
      await axios.post(`${API_URL}/athletes`, newSailor);
      fetchCrew(); // Refresh the list from the DB
    } catch (error) {
      alert("Error adding sailor. Name might already exist.");
    }
  };

  const deleteSailor = async (id) => {
    if (!window.confirm("Remove this sailor from GBR 1381?")) return;
    // Note: You'll need to add a DELETE route to your server.js (see below)
    await axios.delete(`${API_URL}/athletes/${id}`);
    fetchCrew();
  };

  const updateProfile = (id, stats) => {
    setRoster(prev => prev.map(s => s.id === id ? { ...s, ...stats } : s));
  };

  const currentSailor = roster.find(s => s.id === selectedSailorId);

  if (loading) return <div className="min-h-screen bg-[#1D1B44] flex items-center justify-center text-white font-black italic uppercase">Syncing Fleet...</div>;

  return (
    <div className="bg-slate-100 min-h-screen pb-10">
      <nav className="relative z-50 bg-[#1D1B44] text-white p-4 shadow-lg flex flex-col md:flex-row justify-between items-center border-b-4 border-[#ED1C24] gap-4">
        <div className="flex items-center space-x-4">
          <img src="/logo.png" alt="Logo" className="h-10 w-auto" onError={(e) => e.target.style.display = 'none'} />
          <h1 className="text-xl font-black uppercase italic">Lightfoot Racing</h1>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 text-[10px] md:text-sm font-bold uppercase">
          {['dashboard', 'tuning', 'guide', 'weather', 'fleet'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-1 ${activeTab === tab ? 'text-[#ED1C24] border-b-2 border-[#ED1C24]' : 'text-gray-400'}`}>
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto mt-6 px-4">
        {activeTab === 'fleet' ? (
          <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-[#1D1B44]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black uppercase italic text-[#1D1B44]">Fleet Management</h2>
              <button onClick={addSailor} className="bg-green-600 text-white px-4 py-2 rounded font-black text-xs uppercase">+ Add Sailor</button>
            </div>
            <div className="space-y-2">
              {roster.map(s => (
                <div key={s.id} className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100">
                  <span className="font-bold text-[#1D1B44]">{s.name}</span>
                  <button onClick={() => deleteSailor(s.id)} className="text-red-500 font-black text-[10px] uppercase">Remove</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Standard Dashboard view */}
            <div className="mb-6 flex items-center gap-3 bg-white p-4 rounded shadow">
              <span className="text-[10px] font-black uppercase text-slate-400">Selected Athlete:</span>
              <select value={selectedSailorId} onChange={(e) => setSelectedSailorId(Number(e.target.value))} className="font-bold text-[#1D1B44] outline-none">
                {roster.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'dashboard' && <AthleteDashboard sailor={currentSailor} updateProfile={updateProfile} />}
              {activeTab === 'tuning' && <BoatTuningLog activeCrew={roster.filter(s => s.onBoat)} />}
              {activeTab === 'guide' && <SetupGuide activeCrew={roster.filter(s => s.onBoat)} />}
              {activeTab === 'weather' && <LiveConditions />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}