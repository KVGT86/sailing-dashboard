import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function Settings({ roster }) {
  const [fileContent, setFileContent] = useState(null);
  const [selectedSailor, setSelectedSailor] = useState(roster[0]?.name || '');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        setFileContent(json);
      } catch (err) {
        alert("Invalid JSON file. Please provide a Garmin export JSON.");
      }
    };
    reader.readAsText(file);
  };

  const syncGarmin = async () => {
    if (!fileContent || !selectedSailor) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/garmin/upload`, {
        sailor_name: selectedSailor,
        activities: fileContent.activities || []
      });
      alert("Garmin Cloud Sync Successful for " + selectedSailor);
    } catch (err) {
      alert("Sync Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-slate-800">
        <h2 className="font-black italic uppercase text-slate-800 mb-4">Garmin Tactical Sync</h2>
        <p className="text-xs text-slate-500 mb-6 uppercase font-bold tracking-tight">Upload athlete readiness telemetry for Grand Prix planning.</p>
        
        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Target Athlete</label>
            <select 
              value={selectedSailor} 
              onChange={(e) => setSelectedSailor(e.target.value)}
              className="w-full p-2 border-2 border-slate-100 rounded font-bold"
            >
              {roster.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div className="border-2 border-dashed border-slate-200 p-8 rounded-xl text-center hover:border-blue-400 transition-colors bg-slate-50">
            <input 
              type="file" 
              accept=".json" 
              onChange={handleFileUpload}
              className="hidden" 
              id="garmin-up" 
            />
            <label htmlFor="garmin-up" className="cursor-pointer">
              <div className="text-4xl mb-2">📁</div>
              <p className="text-[10px] font-black uppercase text-slate-600">Click to Select Garmin Export (.json)</p>
              {fileContent && <p className="text-xs font-black text-green-600 mt-2 uppercase italic">✓ File Ready: {fileContent.activities?.length || 0} Sessions Found</p>}
            </label>
          </div>

          <button 
            onClick={syncGarmin}
            disabled={!fileContent || loading}
            className={`w-full p-4 rounded-lg font-black uppercase italic tracking-widest shadow-lg transition-all ${
              !fileContent ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-slate-800 active:scale-95'
            }`}
          >
            {loading ? 'SYNCING...' : 'PUSH TO GBR 1381 CLOUD'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-[#ED1C24]">
        <h2 className="font-black italic uppercase text-slate-800 mb-4">System Configurations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <ConfigItem label="Base Crew Weight" val="320kg" sub="J/70 Standard" />
           <ConfigItem label="AI Bias Threshold" val="± 5 units" sub="Learning Sensitivity" />
           <ConfigItem label="Marine API Lat" val="50.79" sub="Solent Core" />
           <ConfigItem label="Marine API Lon" val="-1.10" sub="Solent Core" />
        </div>
      </div>
    </div>
  );
}

function ConfigItem({ label, val, sub }) {
    return (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
            <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{label}</p>
                <p className="text-lg font-black text-slate-800 italic uppercase">{val}</p>
                <p className="text-[8px] text-slate-400 uppercase font-black">{sub}</p>
            </div>
            <button className="text-[10px] font-black text-blue-600 uppercase hover:underline">Edit</button>
        </div>
    )
}