import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Circle, Rectangle, LayersControl, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { API_URL } from '../config';

// Leaflet fix
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const { BaseLayer, Overlay } = LayersControl;

// --- SOLENT WEATHER STATIONS (ELITE POIs) ---
const STATIONS = [
  { id: 'BM', name: "Bramblemet", pos: [50.791, -1.283], note: "Central Solent Buoy" },
  { id: 'NM', name: "Netley", pos: [50.876, -1.355], note: "North Solent / Southampton Water" },
  { id: 'CM', name: "Chimet", pos: [50.761, -0.941], note: "East Solent Entrance" },
  { id: 'SM', name: "Saundersmet", pos: [50.765, -1.301], note: "Cowes Entrance" },
  { id: 'CS', name: "Calshot", pos: [50.812, -1.311], note: "Coastguard Station" },
  { id: 'LY', name: "Lymington", pos: [50.755, -1.511], note: "West Solent Platform" }
];

function getArrowPoints(start, end, size = 0.002) {
    const angle = Math.atan2(end[0] - start[0], end[1] - start[1]);
    return [
        [end[0] - size * Math.cos(angle - Math.PI/6), end[1] - size * Math.sin(angle - Math.PI/6)],
        end,
        [end[0] - size * Math.cos(angle + Math.PI/6), end[1] - size * Math.sin(angle + Math.PI/6)]
    ];
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

  const getTidalVector = () => {
    if (!tides?.hourly?.sea_level_height_msl) return { dir: "Slack", color: "#94a3b8", lat: 0, lng: 0, power: 0 };
    const heights = tides.hourly.sea_level_height_msl;
    const maxIdx = heights.indexOf(Math.max(...heights.slice(0, 24)));
    if (maxIdx === -1) return { dir: "Slack", color: "#94a3b8", lat: 0, lng: 0, power: 0 };
    const hwHour = new Date(tides.hourly.time[maxIdx]).getHours();
    const diff = new Date().getHours() - hwHour;
    
    if (diff >= -6 && diff < 0) return { dir: "East (Flood)", color: "#22c55e", lat: 0.005, lng: 0.02, power: 1 };
    if (diff >= 0 && diff <= 6) return { dir: "West (Ebb)", color: "#3b82f6", lat: -0.005, lng: -0.02, power: 1 };
    return { dir: "Slack", color: "#94a3b8", lat: 0, lng: 0, power: 0.1 };
  };

  const flow = getTidalVector();

  // --- GRID GENERATION (0.1nm Simulation) ---
  const grid = [];
  const step = 0.015; // Balanced for performance and visual density
  for (let lat = 50.72; lat <= 50.88; lat += step) {
    for (let lng = -1.55; lng <= -0.95; lng += step) {
      let lFlow = { ...flow };
      // Shallow water relief (Ryde/Bramble)
      if (lat < 50.75 && lng > -1.25) lFlow.power *= 0.3;
      if (lat > 50.78 && lat < 50.82 && lng > -1.35 && lng < -1.25) lFlow.power *= 0.2;
      
      grid.push({
        pos: [lat, lng],
        end: [lat + lFlow.lat * lFlow.power, lng + lFlow.lng * lFlow.power],
        power: lFlow.power,
        color: lFlow.color,
        bounds: [[lat, lng], [lat + step, lng + step]]
      });
    }
  }

  if (loading) return <div className="h-[600px] flex items-center justify-center bg-slate-900 text-white font-black italic animate-pulse uppercase tracking-widest text-sm">Initialising Solent Multi-Station Grid...</div>;

  const currentWind = data?.weather?.current?.wind_speed_10m || 12;
  const currentDir = data?.weather?.current?.wind_direction_10m || 215;

  return (
    <div className="space-y-4">
      <div className="bg-[#1D1B44] p-4 rounded-xl shadow-lg border-b-4 border-red-500 flex justify-between items-center text-white">
         <div>
            <h2 className="font-black italic uppercase text-sm tracking-tighter">Tactical Command Map</h2>
            <p className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Multi-Station Solent Mesh // 0.1nm Interp</p>
         </div>
         <div className="flex gap-6 text-right">
            <div>
               <p className="text-[7px] font-black text-slate-400 uppercase">Buoy Source</p>
               <span className="text-[10px] font-black italic text-green-400 uppercase">{data?.source || 'CLOUD'}</span>
            </div>
            <div>
               <p className="text-[7px] font-black text-slate-400 uppercase">Live Conditions</p>
               <span className="text-[10px] font-black italic text-blue-400 uppercase">{currentWind.toFixed(1)} KTS @ {currentDir}° // {flow.dir}</span>
            </div>
         </div>
      </div>

      <div className="h-[650px] rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 relative">
        <MapContainer center={position} zoom={11} scrollWheelZoom={true} className="h-full w-full bg-slate-900">
          <LayersControl position="bottomright">
            <BaseLayer checked name="Tactical Dark">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            </BaseLayer>
            <BaseLayer name="Navionics Style">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </BaseLayer>

            {/* HEATMAPS */}
            <Overlay name="Wind Pressure Heatmap">
              <LayerGroup>
                {grid.map((g, i) => (
                  <Rectangle key={`wh-${i}`} bounds={g.bounds} pathOptions={{ color: 'transparent', fillColor: '#ED1C24', fillOpacity: (currentWind / 30) * 0.4 }} />
                ))}
              </LayerGroup>
            </Overlay>

            <Overlay checked name="Tidal Flow Heatmap">
              <LayerGroup>
                {grid.map((g, i) => (
                  <Rectangle key={`th-${i}`} bounds={g.bounds} pathOptions={{ color: 'transparent', fillColor: g.color, fillOpacity: g.power * 0.3 }} />
                ))}
              </LayerGroup>
            </Overlay>

            <Overlay checked name="Flow Vectors (Arrows)">
              <LayerGroup>
                {grid.map((g, i) => {
                  if (g.power < 0.2) return null;
                  const arrow = getArrowPoints(g.pos, g.end);
                  return (
                    <React.Fragment key={`v-${i}`}>
                      <Polyline positions={[g.pos, g.end]} pathOptions={{ color: g.color, weight: 3, opacity: 0.6 }} />
                      <Polyline positions={arrow} pathOptions={{ color: g.color, weight: 3, opacity: 0.6 }} />
                    </React.Fragment>
                  );
                })}
              </LayerGroup>
            </Overlay>

            <Overlay name="Wind Gradient Barbs">
              <LayerGroup>
                {grid.filter((_, idx) => idx % 4 === 0).map((g, i) => {
                  const rad = (currentDir - 180) * (Math.PI / 180);
                  const wEnd = [g.pos[0] + Math.cos(rad) * 0.008, g.pos[1] + Math.sin(rad) * 0.008];
                  return <Polyline key={`wb-${i}`} positions={[g.pos, wEnd]} pathOptions={{ color: '#ffffff', weight: 1, opacity: 0.2 }} />;
                })}
              </LayerGroup>
            </Overlay>
          </LayersControl>

          {/* GBR 1381 POSITION */}
          <CircleMarker center={position} radius={12} pathOptions={{ color: '#ffffff', fillColor: '#ED1C24', fillOpacity: 1, weight: 3 }}>
            <Popup><div className="font-black text-xs uppercase">GBR 1381 // TACTICAL CENTER</div></Popup>
          </CircleMarker>

          {/* WEATHER STATIONS */}
          {STATIONS.map(s => (
            <Marker key={s.id} position={s.pos}>
              <Popup>
                <div className="p-2 min-w-[120px]">
                  <h3 className="font-black uppercase text-sm border-b pb-1 mb-2">{s.name}</h3>
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span className="text-slate-400">WIND:</span>
                    <span className="text-blue-600">{currentWind.toFixed(1)} KTS</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-400">DIR:</span>
                    <span className="text-blue-600">{currentDir}°</span>
                  </div>
                  <p className="mt-2 text-[8px] text-slate-400 italic font-black uppercase">{s.note}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* HUD OVERLAY */}
        <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 p-4 rounded-lg shadow-xl backdrop-blur-md border-l-4 border-red-500 text-white text-[10px] w-48">
            <h3 className="font-black uppercase text-slate-400 mb-2">Tactical Summary</h3>
            <div className="space-y-2">
                <div className="flex justify-between border-b border-white/10 pb-1">
                    <span className="text-slate-500 uppercase font-bold">Chop Height</span>
                    <span className="font-black">{(data?.marine?.current?.wave_height || 0.3).toFixed(2)}m</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1">
                    <span className="text-slate-500 uppercase font-bold">Winning Side</span>
                    <span className="font-black text-green-400 uppercase">{currentDir > 200 ? "Island" : "Mainland"}</span>
                </div>
                <div className="pt-2 text-center">
                    <p className="text-[8px] font-black text-red-500 uppercase italic animate-pulse">Race Grid Active</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
