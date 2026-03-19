import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AthleteDashboard from './components/AthleteDashboard';
import LiveConditions from './components/LiveConditions';
import SetupGuide from './components/SetupGuide';
import SailTracker from './components/SailTracker'; // New Component
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
  const currentSailor = roster.find(s => s.id === selectedSailorId);

  if (loading) return <div className="min-h-screen bg-[#1D1B44] flex items-center justify-center text-white font-black italic uppercase animate-pulse">Syncing GBR 1381...</div>;

  return (
    <div className="bg-slate-100 min-h-screen pb-10">
      {/* NAVBAR WITH LOGO */}
      <nav className="bg-[#1D1B44] text-white p-4 shadow-lg flex justify-between items-center border-b-4 border-[#ED1C24] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter leading-none">Lightfoot Racing</h1>
            <p className="text-[8px] font-bold tracking-widest text-[#ED1C24] uppercase">GBR 1381 • Performance</p>
          </div>
        </div>
        <div className="flex gap-3 md:gap-5 text-[10px] font-black uppercase overflow-x-auto">
          {['dashboard', 'guide', 'weather', 'sails', 'fleet'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'text-[#ED1C24]' : 'text-slate-400 hover:text-white'}>
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto mt-6 px-4">
        {/* GLOBAL CREW SELECTOR */}
        {activeTab !== 'fleet' && (
          <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap items-center gap-3 border-l-4 border-[#ED1C24]">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-2">On Boat Today:</span>
            {roster.map(s => (
              <button
                key={s.id}
                onClick={() => toggleOnBoat(s)}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                  s.on_boat ? 'bg-[#ED1C24] text-white shadow-md scale-105' : 'bg-slate-100 text-slate-400 opacity-60'
                }`}
              >
                {s.name.split(' ')[0]} {s.on_boat ? '✓' : '+'}
              </button>
            ))}
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {activeTab === 'dashboard' && (
            <>
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Profile:</span>
                <select value={selectedSailorId} onChange={(e) => setSelectedSailorId(Number(e.target.value))} className="font-bold text-sm bg-transparent outline-none">
                  {roster.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <AthleteDashboard sailor={currentSailor} updateProfile={fetchData} />
            </>
          )}

          {activeTab === 'guide' && <SetupGuide activeCrew={activeCrew} />}
          {activeTab === 'weather' && <LiveConditions />}
          {activeTab === 'sails' && <SailTracker sails={sails} refresh={fetchData} />}

          {activeTab === 'fleet' && (
             <div className="bg-white p-6 rounded-xl shadow border-t-4 border-[#1D1B44]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-black uppercase italic text-[#1D1B44]">Fleet Roster</h2>
                  <button onClick={addSailor} className="bg-[#ED1C24] text-white px-4 py-2 rounded font-black text-xs uppercase shadow-lg">+ Add Sailor</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roster.map(s => (
                    <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 border rounded-lg">
                      <span className="font-black text-[#1D1B44]">{s.name}</span>
                      <button onClick={() => deleteSailor(s.id)} className="text-[#ED1C24] font-black text-[10px] uppercase hover:underline">Remove</button>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}