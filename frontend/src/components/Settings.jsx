import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function Settings({ roster }) {
  const [fileData, setFileData] = useState(null);
  const [selectedSailor, setSelectedSailor] = useState(roster[0]?.name || '');
  const [uploadType, setUploadType] = useState('wellness'); // wellness or activity
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      // For .fit files, we store the base64 string to send to the parser
      const base64 = event.target.result.split(',')[1];
      setFileData(base64);
    };
    reader.readAsDataURL(file);
  };

  const [syncSummary, setSyncSummary] = useState(null);

  const syncGarmin = async () => {
    if (!fileData || !selectedSailor) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/garmin/upload`, {
        sailor_name: selectedSailor,
        fit_data: fileData,
        type: uploadType
      });
      setSyncSummary(res.data.summary);
      setFileData(null);
    } catch (err) {
      alert("Sync Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const [multiplier, setMultiplier] = useState(1.0);

  const saveCalibration = async () => {
    try {
      await axios.post(`${API_URL}/system/calibrate`, { multiplier });
      alert("Calibration saved. GBR 1381 Engine recalibrated.");
    } catch (e) { alert("Failed to save calibration."); }
  };

  return (
    <div className="space-y-6">
      {/* CALIBRATION HUD */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
        <h2 className="font-black italic uppercase text-slate-800 mb-4">Tactical Calibration</h2>
        <p className="text-[10px] text-slate-500 mb-6 uppercase font-bold tracking-tight">Sync the digital model with your real-world observations.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Wind Speed Multiplier</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="0.5" max="3.0" step="0.1" 
                value={multiplier} 
                onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                className="flex-1 accent-red-600"
              />
              <span className="text-xl font-black italic text-red-600 w-12">{multiplier}x</span>
            </div>
            <p className="text-[8px] text-slate-400 mt-2 italic font-bold">Use 2.0x if Chimet reports 5kts and app says 2.5kts.</p>
          </div>
          <button 
            onClick={saveCalibration}
            className="bg-red-600 text-white p-4 rounded-lg font-black uppercase italic tracking-widest shadow-lg hover:bg-[#1D1B44] transition-all"
          >
            Apply Recalibration
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-slate-800">
        <h2 className="font-black italic uppercase text-slate-800 mb-4">Garmin Tactical Sync (.FIT)</h2>
        
        {syncSummary && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl animate-in fade-in zoom-in duration-300">
             <h3 className="text-xs font-black uppercase text-green-700 mb-2">Sync Report: {selectedSailor}</h3>
             <div className="grid grid-cols-3 gap-4">
                <div>
                   <p className="text-[8px] font-bold text-green-600 uppercase">Readiness</p>
                   <p className="text-xl font-black text-green-800">{syncSummary.readiness}</p>
                </div>
                <div>
                   <p className="text-[8px] font-bold text-green-600 uppercase">Body Battery</p>
                   <p className="text-xl font-black text-green-800">{syncSummary.battery}%</p>
                </div>
                <div>
                   <p className="text-[8px] font-bold text-green-600 uppercase">Recovery</p>
                   <p className="text-xl font-black text-green-800">{syncSummary.recovery}h</p>
                </div>
             </div>
             <p className="mt-2 text-[9px] font-bold text-green-600 italic uppercase">{syncSummary.notes}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                <h3 className="text-[10px] font-black uppercase text-blue-800 mb-1">Wellness Data</h3>
                <p className="text-[10px] text-blue-600 leading-tight">Syncs Sleep, Body Battery, and HRV for readiness assessment.</p>
                <button onClick={() => setUploadType('wellness')} className={`mt-3 px-3 py-1 rounded text-[10px] font-black uppercase ${uploadType === 'wellness' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border border-blue-600'}`}>Select</button>
            </div>
            <div className="p-4 bg-orange-50 border-l-4 border-orange-600 rounded">
                <h3 className="text-[10px] font-black uppercase text-orange-800 mb-1">Activity Data</h3>
                <p className="text-[10px] text-orange-600 leading-tight">Syncs HR intensity and RPE from sailing/training sessions.</p>
                <button onClick={() => setUploadType('activity')} className={`mt-3 px-3 py-1 rounded text-[10px] font-black uppercase ${uploadType === 'activity' ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 border border-orange-600'}`}>Select</button>
            </div>
        </div>

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
              accept=".fit" 
              onChange={handleFileUpload}
              className="hidden" 
              id="garmin-up" 
            />
            <label htmlFor="garmin-up" className="cursor-pointer">
              <div className="text-4xl mb-2">⌚</div>
              <p className="text-[10px] font-black uppercase text-slate-600">Select Garmin {uploadType} File (.fit)</p>
              {fileData && <p className="text-xs font-black text-green-600 mt-2 uppercase italic">✓ FIT FILE LOADED</p>}
            </label>
          </div>

          <button 
            onClick={syncGarmin}
            disabled={!fileData || loading}
            className={`w-full p-4 rounded-lg font-black uppercase italic tracking-widest shadow-lg transition-all ${
              !fileData ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-slate-800 active:scale-95'
            }`}
          >
            {loading ? 'SYNCING...' : `PUSH ${uploadType.toUpperCase()} TO CLOUD`}
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