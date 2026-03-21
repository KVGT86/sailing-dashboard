import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { API_URL } from '../config';

// Leaflet fix for default icon
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function SolentMap() {
  const [data, setData] = useState(null);
  const [tides, setTides] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnv = async () => {
      try {
        const [envRes, tideRes] = await Promise.all([
          axios.get(`${API_URL}/solent`),
          axios.get(`${API_URL}/tides/solent`)
        ]);
        setData(envRes.data);
        setTides(tideRes.data);
      } catch (err) { console.error("Map Sync Failed", err); }
      finally { setLoading(false); }
    };
    fetchEnv();
  }, []);

  const position = [50.79, -1.10]; // Portsmouth / Eastern Solent

  // Strategic Markers
  const marks = [
    { name: "Cowes", pos: [50.7628, -1.2970], note: "Watch for the Green / Medina ebb flow" },
    { name: "Hill Head", pos: [50.8190, -1.2435], note: "Port layline entry point" },
    { name: "Ryde Sands", pos: [50.7380, -1.1448], note: "Shallow water / Tide relief area" },
    { name: "Nab Tower", pos: [50.6672, -0.9515], note: "Offshore swell entry" }
  ];

  // Current Tidal Flow Logic (Simple Solent Vector Approximation)
  const getTidalVector = () => {
    if (!tides || !tides.hourly || !tides.hourly.sea_level_height_msl) return { dir: "Connecting...", color: "gray", lat: 0, lng: 0 };
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find HW (Max height in 24h window)
    const heights = tides.hourly.sea_level_height_msl;
    const maxIdx = heights.indexOf(Math.max(...heights.slice(0, 24)));
    if (maxIdx === -1) return { dir: "Slack", color: "gray", lat: 0, lng: 0 };
    
    const hwHour = new Date(tides.hourly.time[maxIdx]).getHours();
    const diff = currentHour - hwHour;
    
    // Flood: HW -6 to HW (East), Ebb: HW to HW +6 (West)
    if (diff >= -6 && diff < 0) return { dir: "East (Flood)", color: "green", lat: 0.005, lng: 0.02 };
    if (diff >= 0 && diff <= 6) return { dir: "West (Ebb)", color: "blue", lat: -0.005, lng: -0.02 };
    return { dir: "Slack", color: "gray", lat: 0, lng: 0 };
  };

  const flow = getTidalVector();

  if (loading) return <div className="h-[500px] flex items-center justify-center bg-slate-900 text-white font-black italic animate-pulse uppercase">Initialising Tactical Grid...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-lg border-t-4 border-blue-600 flex justify-between items-center">
         <div>
            <h2 className="font-black italic uppercase text-slate-800">Solent Tactical Map</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Live Wind & Tide Vectors</p>
         </div>
         <div className="flex gap-4 text-right">
            <div>
               <p className="text-[8px] font-black text-slate-400 uppercase">Tidal Flow</p>
               <span className={`text-sm font-black italic uppercase ${flow?.color === 'green' ? 'text-green-600' : 'text-blue-600'}`}>{flow?.dir || 'Slack'}</span>
            </div>
            <div>
               <p className="text-[8px] font-black text-slate-400 uppercase">Live Wind</p>
               <span className="text-xl font-black italic text-blue-600">{data?.weather?.current?.wind_speed_10m || 12} KTS</span>
               <p className="text-[8px] font-bold text-slate-400 uppercase">@{data?.weather?.current?.wind_direction_10m || 210}°</p>
            </div>
         </div>
      </div>

      <div className="h-[500px] rounded-xl overflow-hidden shadow-2xl border-4 border-white relative">
        <MapContainer center={position} zoom={11} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <CircleMarker center={position} radius={20} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }}>
            <Popup>
               <div className="font-black italic uppercase">GBR 1381 POSITION</div>
               <p className="text-xs">Chop: {data?.marine?.current?.wave_height || 0.3}m</p>
            </Popup>
          </CircleMarker>

          {/* Tidal Flow Vectors at Strategic Points */}
          {[ [50.78, -1.25], [50.74, -1.15], [50.80, -1.05] ].map((pos, i) => (
             flow && flow.lat !== 0 && (
               <Polyline 
                 key={i}
                 positions={[ pos, [pos[0] + flow.lat, pos[1] + flow.lng] ]}
                 pathOptions={{ color: flow.color, weight: 6, opacity: 0.6 }}
               />
             )
          ))}

          {marks.map(m => (
            <Marker key={m.name} position={m.pos}>
              <Popup>
                <div className="font-bold">{m.name}</div>
                <div className="text-[10px] uppercase font-black text-blue-600">{m.note}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* HUD OVERLAY */}
        <div className="absolute top-4 right-4 z-[1000] bg-white/90 p-4 rounded-lg shadow backdrop-blur-md border-l-4 border-red-500 w-48">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2">Tactical Summary</h3>
            <div className="space-y-2">
                <HUDItem label="Sea State" val={`${data?.marine?.current?.wave_height || 0.3}m`} />
                <HUDItem label="Cloud Cover" val="Clear" />
                <HUDItem label="Winning Side" val={data?.weather?.current?.wind_direction_10m > 200 ? "ISLAND" : "MAINLAND"} color="text-green-600" />
            </div>
        </div>
      </div>
    </div>
  );
}

function HUDItem({ label, val, color = "text-slate-800" }) {
    return (
        <div className="flex justify-between border-b border-slate-100 pb-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
            <span className={`text-[10px] font-black uppercase ${color}`}>{val}</span>
        </div>
    )
}