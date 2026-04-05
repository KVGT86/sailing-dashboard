import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, LayersControl, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { API_URL } from '../config';
import L from 'leaflet';

// --- CUSTOM SENSOR NODE ICON ---
const sensorIcon = L.divIcon({
  className: 'custom-sensor-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute h-4 w-4 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
      <div class="relative h-2 w-2 bg-cyan-500 rounded-full border border-white shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const STATIONS = [
  { id: 'BM', name: "Bramble Bank", pos: [50.791, -1.283], note: "VTS Primary Sensor" },
  { id: 'NM', name: "Netley", pos: [50.876, -1.355], note: "Upper Solent Node" },
  { id: 'CM', name: "Chimet", pos: [50.761, -0.941], note: "Eastern Entrance" },
  { id: 'SM', name: "Saundersmet", pos: [50.765, -1.301], note: "Cowes Deep Water" },
  { id: 'CS', name: "Calshot", pos: [50.812, -1.311], note: "Entrance Watch" },
  { id: 'LY', name: "Lymington", pos: [50.755, -1.511], note: "Western Gate" },
  { id: 'GH', name: "Gilkicker", pos: [50.771, -1.141], note: "Portsmouth Node" }
];

const RACE_AREA = [
  [50.81, -1.35], [50.81, -1.20], [50.76, -1.20], [50.76, -1.35]
];

export default function SolentMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnv = async () => {
      try {
        const res = await axios.get(`${API_URL}/solent`);
        setData(res.data);
      } catch (err) { 
        console.error("Map Sync Failed", err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchEnv();
    const interval = setInterval(fetchEnv, 600000); // 10 mins
    return () => clearInterval(interval);
  }, []);

  const getTidalVector = () => {
    const tides = data?.tide_data;
    const heights = tides?.hourly?.sea_level_height_msl;
    const times = tides?.hourly?.time;

    if (!Array.isArray(heights) || heights.length === 0) {
      return { dir: "Slack", color: "#94a3b8", lat: 0, lng: 0, label: "DATA OFFLINE" };
    }

    const daySnapshot = heights.slice(0, 24);
    const maxIdx = heights.indexOf(Math.max(...daySnapshot));
    const hwTime = new Date(times[maxIdx]);
    const now = new Date();
    let diff = (now - hwTime) / (1000 * 60 * 60);
    while (diff > 6.2) diff -= 12.4;
    while (diff < -6.2) diff += 12.4;

    if (diff >= -6 && diff < -0.5) return { dir: "Flood", label: "FLOODING", color: "#22c55e", lat: 0.008, lng: 0.025 };
    if (diff >= 0.5 && diff <= 6) return { dir: "Ebb", label: "EBBING", color: "#3b82f6", lat: -0.008, lng: -0.025 };
    return { dir: "Slack", label: "SLACK WATER", color: "#94a3b8", lat: 0, lng: 0 };
  };

  const flow = getTidalVector();
  const currentWind = data?.wind_speed || 12;
  const currentDir = data?.wind_dir || 215;

  const generateTacticalGrid = () => {
    const grid = [];
    const step = 0.02; 
    for (let lat = 50.70; lat <= 50.90; lat += step) {
      for (let lng = -1.60; lng <= -0.90; lng += step) {
        const rad = (currentDir - 180) * (Math.PI / 180);
        const wEnd = [lat + 0.01 * Math.cos(rad), lng + 0.01 * Math.sin(rad)];
        grid.push({
          pos: [lat, lng],
          windEnd: wEnd,
          tideColor: flow.color,
          tideOpacity: (Math.abs(flow.lat) > 0 ? 0.15 : 0.05)
        });
      }
    }
    return grid;
  };

  const grid = generateTacticalGrid();

  if (loading && !data) return <div className="h-[750px] flex items-center justify-center bg-[#0b1121] text-cyan-400 font-black italic animate-pulse uppercase tracking-[0.3em]">Syncing Tactical Mesh...</div>;

  return (
    <div className="relative group overflow-hidden rounded-3xl border-4 border-slate-800 shadow-2xl">
      {/* HUD OVERLAY */}
      <div className="absolute top-6 left-6 z-[1000] bg-slate-900/95 p-6 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/10 text-white w-64 pointer-events-none">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
            <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400">Solent Overview</h3>
            <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
        </div>
        
        <div className="space-y-4">
            <div>
                <p className="text-[8px] font-black text-slate-500 uppercase">Live Telemetry Source</p>
                <p className="text-xs font-black italic text-cyan-400 uppercase leading-none mt-1">{data?.source || "Ingestion Worker"}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase">Velocity</p>
                    <p className="text-xl font-black italic text-white leading-none mt-1">{Number(currentWind || 0).toFixed(1)}<span className="text-[8px] ml-1 uppercase">kts</span></p>
                </div>
                <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase">Heading</p>
                    <p className="text-xl font-black italic text-white leading-none mt-1">{currentDir}°</p>
                </div>
            </div>

            <div className={`p-3 rounded-lg border-l-4 transition-all ${flow.color === '#22c55e' ? 'bg-green-500/10 border-green-500' : 'bg-blue-500/10 border-blue-500'}`}>
                <p className="text-[8px] font-black text-slate-400 uppercase">Tidal Gate</p>
                <p className="text-sm font-black italic text-white uppercase mt-1">{flow.label}</p>
            </div>
        </div>
      </div>

      <MapContainer center={[50.79, -1.25]} zoom={11} className="h-[750px] w-full bg-[#0b1121]">
        <LayersControl position="bottomright">
          <LayersControl.BaseLayer checked name="Tactical Dark">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay checked name="Race Boundary">
            <Polygon positions={RACE_AREA} pathOptions={{ color: '#ED1C24', dashArray: '10, 10', fillColor: '#ED1C24', fillOpacity: 0.05 }} />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Wind Flow Vectors">
            <LayerGroup>
              {grid.map((g, i) => (
                <Polyline key={`w-${i}`} positions={[g.pos, g.windEnd]} pathOptions={{ color: '#ffffff', weight: 1, opacity: 0.2 }} />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Tidal Heatmap">
            <LayerGroup>
              {grid.map((g, i) => (
                <Marker key={`t-${i}`} position={g.pos} icon={L.divIcon({
                  className: 'bg-transparent',
                  html: `<div style="background-color: ${g.tideColor}; opacity: ${g.tideOpacity}; width: 20px; height: 20px; border-radius: 2px;"></div>`
                })} />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>

        {STATIONS.map(s => (
          <Marker key={s.id} position={s.pos} icon={sensorIcon}>
            <Popup>
              <div className="p-3 bg-slate-900 text-white rounded-lg min-w-[120px]">
                <h4 className="font-black uppercase text-xs text-cyan-400 border-b border-white/10 pb-1 mb-2">{s.name}</h4>
                <div className="flex justify-between text-[10px] font-bold">
                   <span className="text-slate-400">Wind:</span>
                   <span>{Number(currentWind || 0).toFixed(1)} kts</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                   <span className="text-slate-400">Dir:</span>
                   <span>{currentDir}°</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
