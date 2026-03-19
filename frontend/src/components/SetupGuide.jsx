import React, { useState } from 'react';

export default function SetupGuide({ activeCrew }) {
  const [targetWind, setTargetWind] = useState(12);
  const [waveState, setWaveState] = useState('flat');

  const totalWeight = activeCrew.reduce((sum, sailor) => sum + sailor.weightKg, 0);
  const isLightCrew = totalWeight < 320; 

  const calculateTune = () => {
    let uppers = 0, lowers = 0, notes = [];
    if (targetWind < 8) { uppers -= 2; lowers -= 2; notes.push("Light air: Loosen rig to induce headstay sag."); }
    else if (targetWind > 14 && targetWind <= 18) { uppers += 2; lowers += 1.5; notes.push("Building breeze: Tighten rig to flatten sails."); }
    else if (targetWind > 18) { uppers += 4; lowers += 3; notes.push("Heavy air: Maximum tension. Depower heavily."); }
    else { notes.push("Base wind conditions."); }
    if (waveState === 'chop') { uppers -= 0.5; lowers -= 1; notes.push("Choppy water: Eased lowers slightly for punch."); }
    if (isLightCrew && targetWind > 12) { uppers += 1; lowers += 1; notes.push("Light Crew (<320kg): Added +1 turn to depower earlier."); }
    return { uppers: uppers > 0 ? `+${uppers}` : uppers, lowers: lowers > 0 ? `+${lowers}` : lowers, notes };
  };

  const rec = calculateTune();

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow border-t-4 border-red-600">
      <h2 className="text-2xl font-bold mb-6 text-[#0A192F]">Dynamic Rig Calculator</h2>
      
      <div className="bg-[#0A192F] text-white p-4 rounded-lg flex justify-between items-center mb-6">
        <div><span className="block text-sm font-bold uppercase text-red-500">Live Crew Weight</span><span className="text-3xl font-bold">{totalWeight} kg</span></div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div><label className="font-bold text-gray-700">Forecast Wind: {targetWind} kts</label><input type="range" min="0" max="30" value={targetWind} onChange={(e) => setTargetWind(Number(e.target.value))} className="w-full mt-2" /></div>
        <div><label className="font-bold text-gray-700">Wave State</label>
          <select value={waveState} onChange={(e) => setWaveState(e.target.value)} className="w-full mt-2">
            <option value="flat">Flat Water</option><option value="chop">Steep Chop</option>
          </select>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-bold text-[#0A192F] mb-4">Target Turns (from Base)</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-100 p-4 rounded-lg text-center"><span className="text-gray-500 font-bold">Uppers</span><span className="block text-4xl font-black text-red-600">{rec.uppers}</span></div>
          <div className="bg-gray-100 p-4 rounded-lg text-center"><span className="text-gray-500 font-bold">Lowers</span><span className="block text-4xl font-black text-red-600">{rec.lowers}</span></div>
        </div>
        <div className="bg-red-50 p-4 rounded border-l-4 border-red-500"><ul className="list-disc pl-5 text-red-900 font-medium">{rec.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>
      </div>
    </div>
  );
}