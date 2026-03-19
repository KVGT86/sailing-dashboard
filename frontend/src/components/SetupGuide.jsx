import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function SetupGuide({ activeCrew }) {
  const [guideData, setGuideData] = useState([]);
  const [loading, setLoading] = useState(true);

  const totalWeight = activeCrew.reduce((sum, s) => sum + (s.weight_kg || s.weightKg || 0), 0);

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
      <div className="bg-[#1D1B44] p-4 text-white flex justify-between items-center">
        <h2 className="font-black uppercase italic tracking-widest">Rig Setup Guide</h2>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-slate-400">Live Crew Weight</p>
          <p className="text-xl font-black text-[#ED1C24]">{totalWeight.toFixed(1)} KG</p>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <p className="text-center font-bold animate-pulse text-slate-400">Loading Fleet Targets...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {guideData.map((step) => (
              <div key={step.wind_range} className="border-2 border-slate-100 rounded-lg p-4 hover:border-[#ED1C24] transition-colors">
                <h3 className="text-[#1D1B44] font-black uppercase text-sm mb-3 border-b pb-2">{step.wind_range}</h3>
                <div className="space-y-2">
                  <SettingRow label="Uppers" value={step.upper_shroud} unit="PT2" />
                  <SettingRow label="Lowers" value={step.lower_shroud} unit="PT2" />
                  <SettingRow label="Headstay" value={step.headstay} />
                  <div className="mt-4 p-2 bg-slate-50 rounded text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Jib Selection</span>
                    <span className="font-black text-[#ED1C24]">{step.jib_selection}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({ label, value, unit = "" }) {
  return (
    <div className="flex justify-between text-xs font-bold">
      <span className="text-slate-500 uppercase">{label}</span>
      <span className="text-[#1D1B44]">{value} {unit}</span>
    </div>
  );
}