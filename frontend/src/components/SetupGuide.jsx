import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

export default function SetupGuide({ activeCrew }) {
  const [guideData, setGuideData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculate total crew weight from the activeCrew passed via props
  const totalWeight = activeCrew.reduce((sum, s) => sum + (s.weight_kg || 0), 0);

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const response = await axios.get(`${API_URL}/guide`);
        setGuideData(response.data);
      } catch (err) {
        console.error("Error fetching tuning guide:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGuide();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden border-t-4 border-[#1D1B44]">
      {/* Header with Live Weight calculation */}
      <div className="bg-[#1D1B44] p-6 text-white flex justify-between items-center">
        <div>
          <h2 className="font-black uppercase italic tracking-widest text-lg">Rig Setup Guide</h2>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">GBR 1381 Class Standards</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Active Crew Weight</p>
          <p className="text-3xl font-black text-[#ED1C24] italic">{totalWeight.toFixed(0)} <span className="text-sm not-italic uppercase">KG</span></p>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <p className="text-center font-bold animate-pulse text-slate-400 uppercase">Fetching Targets...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {guideData.map((step) => (
              <div key={step.wind_range} className="border-2 border-slate-100 rounded-lg p-5 hover:border-[#ED1C24] transition-all group">
                <h3 className="text-[#1D1B44] font-black uppercase text-sm mb-4 border-b pb-2 italic group-hover:text-[#ED1C24]">
                  {step.wind_range}
                </h3>
                <div className="space-y-3">
                  <SettingRow label="Upper Shroud" value={step.upper_shroud} unit="PT2" />
                  <SettingRow label="Lower Shroud" value={step.lower_shroud} unit="PT2" />
                  <SettingRow label="Headstay" value={step.headstay} />
                  
                  <div className="mt-6 p-3 bg-slate-50 rounded text-center border border-slate-100">
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Recommended Jib</span>
                    <span className="font-black text-[#ED1C24] text-lg uppercase italic">{step.jib_selection}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-4 border-t border-slate-100">
        <p className="text-[9px] text-slate-400 font-bold uppercase text-center leading-tight">
          Note: Base settings assume 10 knots of wind. Adjust uppers +1 full turn for every 2 knots of additional sustained wind.
        </p>
      </div>
    </div>
  );
}

function SettingRow({ label, value, unit = "" }) {
  return (
    <div className="flex justify-between items-center text-xs font-bold">
      <span className="text-slate-400 uppercase tracking-tighter">{label}</span>
      <span className="text-[#1D1B44] font-black">{value} <span className="text-[10px] text-slate-400">{unit}</span></span>
    </div>
  );
}