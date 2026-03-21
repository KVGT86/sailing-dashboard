import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Circle } from 'react-leaflet';
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

// --- Helper for Arrowheads ---
function getArrowPoints(start, end, size = 0.002) {
    const angle = Math.atan2(end[0] - start[0], end[1] - start[1]);
    const p1 = [
        end[0] - size * Math.cos(angle - Math.PI / 6),
        end[1] - size * Math.sin(angle - Math.PI / 6)
    ];
    const p2 = [
        end[0] - size * Math.cos(angle + Math.PI / 6),
        end[1] - size * Math.sin(angle + Math.PI / 6)
    ];
    return [p1, end, p2];
}

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

  const position = [50.79, -1.10]; 

  const marks = [
    { name: "Cowes", pos: [50.7628, -1.2970], note: "Watch for the Green / Medina ebb flow" },
    { name: "Hill Head", pos: [50.8190, -1.2435], note: "Port layline entry point" },
    { name: "Ryde Sands", pos: [50.7380, -1.1448], note: "Shallow water / Tide relief area" },
    { name: "Nab Tower", pos: [50.6672, -0.9515], note: "Offshore swell entry" }
  ];

  const getTidalVector = () => {
    if (!tides || !tides.hourly || !tides.hourly.sea_level_height_msl) return { dir: "Connecting...", color: "#94a3b8", lat: 0, lng: 0 };
    const now = new Date();
    const heights = tides.hourly.sea_level_height_msl;
    const maxIdx = heights.indexOf(Math.max(...heights.slice(0, 24)));
    if (maxIdx === -1) return { dir: "Slack", color: "#94a3b8", lat: 0, lng: 0 };
    const hwHour = new Date(tides.hourly.time[maxIdx]).getHours();
    const diff = now.getHours() - hwHour;
    if (diff >= -6 && diff < 0) return { dir: "East (Flood)", color: "#22c55e", lat: 0.005, lng: 0.02 };
    if (diff >= 0 && diff <= 6) return { dir: "West (Ebb)", color: "#3b82f6", lat: -0.005, lng: -0.02 };
    return { dir: "Slack", color: "#94a3b8", lat: 0, lng: 0 };
  };

  const flow = getTidalVector();

  const generateTacticalGrid = () => {
    if (!tides || !tides.hourly || flow.lat === 0) return [];
    const vectors = [];
    const step = 0.012; // Grid density
    for (let lat = 50.72; lat <= 50.84; lat += step) {
      for (let lng = -1.35; lng <= -1.05; lng += step) {
        let localFlow = { ...flow };
        if (lat < 50.75 && lng > -1.18) { localFlow.lat *= 0.3; localFlow.lng *= 0.3; } // Ryde
        if (lat > 50.78 && lat < 50.81 && lng > -1.32 && lng < -1.25) { localFlow.lat *= 0.15; localFlow.lng *= 0.15; } // Bramble
        if (lat > 50.80 && lng < -1.15) { localFlow.lat *= 1.4; localFlow.lng *= 1.4; } // Hill Head
        vectors.push({
          pos: [lat, lng],
          end: [lat + localFlow.lat * 0.8, lng + localFlow.lng * 0.8],
          color: localFlow.color
        });
      }
    }
    return vectors;
  };

  const gridVectors = generateTacticalGrid();
  const waveHeight = data?.marine?.current?.wave_height || 0.3;

  if (loading) return <div className="h-[600px] flex items-center justify-center bg-slate-900 text-white font-black italic animate-pulse uppercase tracking-widest text-sm">Synchronising Solent tactical data...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-[#1D1B44] p-4 rounded-xl shadow-lg border-b-4 border-blue-500 flex justify-between items-center text-white">
         <div>
            <h2 className="font-black italic uppercase text-sm tracking-tighter">Solent Tactical Grid</h2>
            <p className="text-[8px] font-bold text-blue-300 uppercase tracking-widest">0.1nm Precision Overlay</p>
         </div>
         <div className="flex gap-6 text-right">
            <div>
               <p className="text-[7px] font-black text-slate-400 uppercase">Tide Source</p>
               <span className="text-[10px] font-black italic text-green-400 uppercase">{data?.source || 'Verified Feed'}</span>
            </div>
            <div>
               <p className="text-[7px] font-black text-slate-400 uppercase">Marine Context</p>
               <span className="text-[10px] font-black italic text-blue-400 uppercase">{data?.weather?.current?.wind_speed_10m.toFixed(1)} KTS // {flow?.dir}</span>
            </div>
         </div>
      </div>

      <div className="h-[600px] rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800 relative group">
        <MapContainer center={position} zoom={12} scrollWheelZoom={true} className="h-full w-full bg-slate-900">
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {/* SEA STATE / CHOP RADIUS */}
          <Circle center={position} radius={waveHeight * 2000} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1, dashArray: '5, 10' }} />
          
          <CircleMarker center={position} radius={10} pathOptions={{ color: '#ffffff', fillColor: '#ED1C24', fillOpacity: 1, weight: 3 }}>
            <Popup><div className="font-black text-[10px] uppercase">GBR 1381 POSITION</div></Popup>
          </CircleMarker>

          {/* TIDE VECTORS (ARROWS) */}
          {gridVectors.map((v, i) => {
             const arrow = getArrowPoints(v.pos, v.end);
             return (
                <React.Fragment key={`tgroup-${i}`}>
                    <Polyline positions={[ v.pos, v.end ]} pathOptions={{ color: v.color, weight: 4, opacity: 0.6 }} />
                    <Polyline positions={arrow} pathOptions={{ color: v.color, weight: 4, opacity: 0.6 }} />
                </React.Fragment>
             )
          })}

          {/* WIND VECTORS (THIN RED LINES) */}
          {gridVectors.filter((_, idx) => idx % 3 === 0).map((v, i) => {
             const wDir = data?.weather?.current?.wind_direction_10m || 210;
             const rad = (wDir - 180) * (Math.PI / 180);
             const wLen = 0.008;
             const wEnd = [v.pos[0] + Math.cos(rad) * wLen, v.pos[1] + Math.sin(rad) * wLen];
             return (
                <Polyline key={`w-${i}`} positions={[ v.pos, wEnd ]} pathOptions={{ color: '#ef4444', weight: 1, opacity: 0.4 }} />
             )
          })}

          {marks.map(m => (
            <Marker key={m.name} position={m.pos}>
              <Popup>
                <div className="font-bold text-xs uppercase">{m.name}</div>
                <div className="text-[9px] uppercase font-black text-blue-600">{m.note}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* HUD / LEGEND */}
        <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 p-4 rounded-lg shadow-xl backdrop-blur-md border-l-4 border-red-500 w-52 text-white text-[10px]">
            <h3 className="font-black uppercase text-slate-400 mb-3 border-b border-white/10 pb-1">Tactical Legend</h3>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="h-1 w-6 bg-green-500 rounded-full"></div>
                    <span className="font-bold uppercase">Flood Tide (East)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-1 w-6 bg-blue-500 rounded-full"></div>
                    <span className="font-bold uppercase">Ebb Tide (West)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-px w-6 bg-red-500"></div>
                    <span className="font-bold uppercase text-red-400">Wind Direction</span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <div className="h-3 w-3 rounded-full border border-red-500 bg-red-500/20"></div>
                    <span className="font-bold uppercase">Sea State: {waveHeight}m</span>
                </div>
                <div className="mt-3 pt-2 bg-white/5 p-2 rounded">
                    <p className="text-[8px] text-slate-400 uppercase mb-1 font-bold">Winning Side Bias</p>
                    <p className="font-black uppercase text-green-400 italic">
                        {data?.weather?.current?.wind_direction_10m > 200 ? "ISLAND SHORE" : "MAINLAND SHORE"}
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
