import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AthleteDashboard from './components/AthleteDashboard';
import LiveConditions from './components/LiveConditions';
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

  // --- SAILOR ACTIONS ---
  const addSailor = async () => {
    const name = prompt("Enter New Sailor Name:");
    if (!name) return;
    await axios.post(`${API_URL}/athletes`, { name, weight_kg: 80, height_cm: 180, rhr: 60, max_hr: 190, vo2max: 50 });
    fetchData();
  };

  const deleteSailor = async (id) => {
    if (window.confirm("Remove this sailor from the fleet?")) {
      await axios.delete(`${API_URL}/athletes/${id}`);
      fetchData();
    }
  };

  // --- SAIL ACTIONS ---
  const addSail = async () => {
    const id = prompt("Enter Sail ID (e.g., J2-104):");
    const name = prompt("Enter Sail Description:");
    if (!id || !name) return;
    await axios.post(`${API_URL}/sails`, { id, name, type: 'Jib', hours_flown: 0 });
    fetchData();
  };

  const deleteSail = async (id) => {
    if (window.confirm(`Retire sail ${id}?`)) {
      await axios.delete(`${API_URL}/sails/${id}`);
      fetchData();
    }
  };

  const currentSailor = roster.find(s => s.id === selectedSailorId);

  if (loading) return <div className="min-h-screen bg-[#1D1B44] flex items-center justify-center text-white font-black italic uppercase">Syncing GBR 1381...</div>;

  return (
    <div className="bg-slate-100 min-h-screen pb-10">
      <nav className="bg-[#1D1B44] text-white p-4 shadow-lg flex justify-between items-center border-b-4 border-[#ED1C24]">
        <h1 className="text-xl font-black uppercase italic tracking-tighter">Lightfoot Racing</h1>
        <div className="flex gap-4 text-[10px] font-bold uppercase">
          {['dashboard', 'weather', 'fleet'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'text-[#ED1C24]' : 'text-slate-400'}>{tab}</button>
          ))}
        </div>
      </nav>

      <main className="container mx-auto mt-6 px-4">
        {activeTab === 'fleet' ? (
          <div className="space-y-6">
            {/* CREW MANAGEMENT */}
            <div className="bg-white p-6 rounded-xl shadow border-t-4 border-[#1D1B44]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-black uppercase italic text-[#1D1B44]">Crew Roster</h2>
                <button onClick={addSailor} className="bg-[#ED1C24] text-white px-3 py-1 rounded font-black text-[10px] uppercase">+ Add</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {roster.map(s => (
                  <div key={s.id} className="flex justify-between p-3 bg-slate-50 border rounded">
                    <span className="font-bold text-sm">{s.name}</span>
                    <button onClick={() => deleteSailor(s.id)} className="text-red-500 font-black text-[10px] uppercase">Remove</button>
                  </div>
                ))}
              </div>
            </div>

            {/* SAIL WARDROBE */}
            <div className="bg-white p-6 rounded-xl shadow border-t-4 border-blue-600">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-black uppercase italic text-[#1D1B44]">Sail Wardrobe</h2>
                <button onClick={addSail} className="bg-blue-600 text-white px-3 py-1 rounded font-black text-[10px] uppercase">+ Add</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sails.map(sail => (
                  <div key={sail.id} className="flex justify-between p-3 bg-slate-50 border rounded">
                    <div>
                      <p className="font-black text-blue-600 text-[10px] uppercase">{sail.id}</p>
                      <p className="font-bold text-sm">{sail.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{sail.hours_flown} HRS</p>
                    </div>
                    <button onClick={() => deleteSail(sail.id)} className="text-red-500 font-black text-[10px] uppercase">Retire</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {activeTab === 'dashboard' && (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Athlete:</span>
                  <select value={selectedSailorId} onChange={(e) => setSelectedSailorId(Number(e.target.value))} className="font-bold text-sm outline-none bg-transparent">
                    {roster.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <AthleteDashboard sailor={currentSailor} updateProfile={() => fetchData()} />
              </>
            )}
            {activeTab === 'weather' && <LiveConditions />}
          </div>
        )}
      </main>
    </div>
  );
}