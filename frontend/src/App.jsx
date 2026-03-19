import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AthleteDashboard from './components/AthleteDashboard';
import LiveConditions from './components/LiveConditions';
import SetupGuide from './components/SetupGuide';
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

  // --- NICER CREW TOGGLE (Syncs to DB) ---
  const toggleOnBoat = async (sailor) => {
    try {
      const updatedSailor = { ...sailor, on_boat: !sailor.on_boat };
      // Immediately update local UI for speed
      setRoster(prev => prev.map(s => s.id === sailor.id ? updatedSailor : s));
      // Save to Postgres
      await axios.post(`${API_URL}/athletes`, updatedSailor);
    } catch (error) {
      alert("Failed to sync crew status.");
      fetchData(); // Rollback on error
    }
  };

  const activeCrew = roster.filter(s => s.on_boat);
  const currentSailor = roster.find(s => s.id === selectedSailorId);

  if (loading) return <div className="min-h-screen bg-[#1D1B44] flex items-center justify-center text-white font-black italic uppercase">Syncing GBR 1381...</div>;

  return (
    <div className="bg-slate-100 min-h-screen pb-10">
      <nav className="bg-[#1D1B44] text-white p-4 shadow-lg flex justify-between items-center border-b-4 border-[#ED1C24]">
        <h1 className="text-xl font-black uppercase italic tracking-tighter">Lightfoot Racing</h1>
        <div className="flex gap-4 text-[10px] font-bold uppercase">
          {['dashboard', 'guide', 'weather', 'sails', 'fleet'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'text-[#ED1C24]' : 'text-slate-400'}>{tab}</button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto mt-6 px-4">
        
        {/* TOP LEVEL CREW SELECTOR (Available on most tabs) */}
        {activeTab !== 'fleet' && (
          <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap items-center gap-3 border-l-4 border-[#ED1C24]">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-2">On Boat today:</span>
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

        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && (
            <>
              <div className="mb-4 flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Athlete Profile:</span>
                <select value={selectedSailorId} onChange={(e) => setSelectedSailorId(Number(e.target.value))} className="font-bold text-sm outline-none bg-transparent">
                  {roster.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <AthleteDashboard sailor={currentSailor} updateProfile={() => fetchData()} />
            </>
          )}

          {activeTab === 'guide' && <SetupGuide activeCrew={activeCrew} />}
          
          {activeTab === 'weather' && <LiveConditions />}

          {/* RESTORED SAIL TRACKER PAGE */}
          {activeTab === 'sails' && (
            <div className="bg-white p-6 rounded-xl shadow-xl border-t-4 border-blue-600">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black uppercase italic text-[#1D1B44]">Sail Wardrobe</h2>
                <button onClick={() => {/* Add Sail Logic */}} className="bg-blue-600 text-white px-3 py-1 rounded font-black text-[10px] uppercase">+ Add Sail</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sails.map(sail => (
                  <div key={sail.id} className="p-4 border rounded-lg bg-slate-50 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 h-1 w-full ${sail.hours_flown > 50 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    <p className="font-black text-blue-600 text-[10px] uppercase">{sail.id}</p>
                    <h3 className="font-bold text-[#1D1B44]">{sail.name}</h3>
                    <p className="text-sm font-black mt-2">{sail.hours_flown} <span className="text-[10px] text-slate-400 uppercase">Hours on Clock</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fleet' && (
             <div className="bg-white p-6 rounded-xl shadow border-t-4 border-[#1D1B44]">
                <h2 className="font-black uppercase italic text-[#1D1B44] mb-4">Roster Management</h2>
                {/* Add/Delete Sailor logic here */}
             </div>
          )}
        </div>
      </main>
    </div>
  );
}