import React, { useState } from 'react';

export default function SolentTidesModule() {
  const [hwPortsmouth, setHwPortsmouth] = useState('12:00');
  const tideHours = Array.from({ length: 13 }, (_, i) => i - 6);

  return (
    <div className="bg-white p-6 rounded-lg shadow border-t-4 border-[#0A192F]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0A192F]">Solent Playbook (Winning Tides)</h2>
        <div><label className="font-bold text-red-600 mr-2">HW Portsmouth:</label><input type="time" value={hwPortsmouth} onChange={(e) => setHwPortsmouth(e.target.value)} className="border-2 border-red-200 p-1 rounded font-mono font-bold" /></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="bg-[#0A192F] text-white"><th className="p-3">Reference</th><th className="p-3">Book Page</th><th className="p-3">Stream Direction</th><th className="p-3">Strategy Notes</th></tr></thead>
          <tbody>
            {tideHours.map(hour => (
              <tr key={hour} className="border-b hover:bg-gray-50">
                <td className="p-3 font-bold text-red-600">{hour === 0 ? 'HW' : hour > 0 ? `HW +${hour}` : `HW ${hour}`}</td>
                <td className="p-3 text-gray-500 font-medium">Page {12 + hour + 6}</td>
                <td className="p-3"><select className="w-full"><option>East (Flood)</option><option>West (Ebb)</option><option>Slack</option></select></td>
                <td className="p-3"><input type="text" placeholder="e.g. Hug island shore" className="w-full" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}