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

// --- ELITE POIs (Solent Sensor Mesh) ---
const STATIONS = [
  { id: 'BM', name: "Bramblemet", pos: [50.791, -1.283], note: "Central Solent Buoy" },
  { id: 'NM', name: "Netley", pos: [50.876, -1.355], note: "North Solent / Southampton Water" },
  { id: 'CM', name: "Chimet", pos: [50.761, -0.941], note: "East Solent Entrance" },
  { id: 'SM', name: "Saundersmet", pos: [50.765, -1.301], note: "Cowes Entrance" },
  { id: 'CS', name: "Calshot", pos: [50.812, -1.311], note: "Coastguard Station" },
  { id: 'LY', name: "Lymington", pos: [50.755, -1.511], note: "West Solent Platform" },
  { id: 'GH', name: "Gilkicker", pos: [50.771, -1.141], note: "Portsmouth Entrance" }
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

  // --- GRID GENERATION (High-Res Heatmap Logic) ---
  const generateTacticalGrid = () => {
    if (!tides || !tides.hourly || flow.lat === 0) return [];
    const grid = [];
    const step = 0.015; 
    for (let lat = 50.72; lat <= 50.88; lat += step) {
      for (let lng = -1.55; lng <= -0.95; lng += step) {
        let lFlow = { ...flow };
        let powerMult = 1.0;
        
        // Strategic Relief
        if (lat < 50.75 && lng > -1.25) powerMult = 0.3; // Ryde
        if (lat > 50.78 && lat < 50.82 && lng > -1.35 && lng < -1.25) powerMult = 0.15; // Bramble
        if (lat > 50.80 && lng < -1.15) powerMult = 1.4; // Hill Head Channel

        grid.push({
          pos: [lat, lng],
          end: [lat + lFlow.lat * powerMult, lng + lFlow.lng * powerMult],
          power: powerMult,
          color: lFlow.color,
          bounds: [[lat, lng], [lat + step, lng + step]]
        });
      }
    }
    return grid;
  };

  const tacticalGrid = generateTacticalGrid();
  const currentWind = data?.weather?.current?.wind_speed_10m || 12;
  const currentDir = data?.weather?.current?.wind_direction_10m || 215;

  if (loading) return <div className="h-[650px] flex items-center justify-center bg-slate-900 text-white font-black italic animate-pulse uppercase tracking-widest text-sm">Deploying Solent Tactical Mesh...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-[#1D1B44] p-4 rounded-xl shadow-lg border-b-4 border-red-500 flex justify-between items-center text-white">
         <div>
            <h2 className="font-black italic uppercase text-sm tracking-tighter leading-none">Tactical Command Centre</h2>
            <p className="text-[8px] font-bold text-red-400 uppercase tracking-widest mt-1">GBR 1381 • High-Res Grid</p>
         </div>
         <div className="flex gap-6 text-right">
            <div>
               <p className="text-[7px] font-black text-slate-400 uppercase">Stream</p>
               <span className={`text-[10px] font-black italic uppercase ${flow.color === '#22c55e' ? 'text-green-400' : 'text-blue-400'}`}>{flow.dir}</span>
            </div>
            <div>
               <p className="text-[7px] font-black text-slate-400 uppercase">Environment</p>
               <span className="text-[10px] font-black italic text-blue-400 uppercase">{currentWind.toFixed(1)} KTS @ {currentDir}°</span>
            </div>
         </div>
      </div>

      <div className="h-[650px] rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 relative group">
        <MapContainer center={[50.79, -1.20]} zoom={11} scrollWheelZoom={true} className="h-full w-full bg-slate-900">
          <LayersControl position="bottomright">
            <BaseLayer checked name="Tactical Dark">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            </BaseLayer>
            <BaseLayer name="Navionics Style">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </BaseLayer>

            <Overlay checked name="Wind Pressure Map">
              <LayerGroup>
                {tacticalGrid.map((g, i) => (
                  <Rectangle 
                    key={`w-${i}`} 
                    bounds={g.bounds} 
                    pathOptions={{ color: 'transparent', fillColor: '#ED1C24', fillOpacity: (currentWind / 35) * 0.3 }} 
                  />
                ))}
              </LayerGroup>
            </Overlay>

            <Overlay checked name="Tidal Flow Map">
              <LayerGroup>
                {tacticalGrid.map((g, i) => (
                  <Rectangle 
                    key={`t-${i}`} 
                    bounds={g.bounds} 
                    pathOptions={{ color: 'transparent', fillColor: g.color, fillOpacity: g.power * 0.25 }} 
                  />
                ))}
              </LayerGroup>
            </Overlay>

            <Overlay checked name="Flow Vectors">
              <LayerGroup>
                {tacticalGrid.map((g, i) => {
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
          </LayersControl>

          {/* SENSOR MESH */}
          {STATIONS.map(s => (
            <Marker key={s.id} position={s.pos}>
              <Popup>
                <div className="p-2 min-w-[140px] text-[#1D1B44]">
                  <h3 className="font-black uppercase text-xs border-b-2 border-red-500 pb-1 mb-2">{s.name} Station</h3>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase flex justify-between"><span>Observed:</span> <span className="text-red-600 font-black">{currentWind.toFixed(1)} kts</span></p>
                    <p className="text-[10px] font-bold uppercase flex justify-between"><span>Heading:</span> <span className="text-blue-600 font-black">{currentDir}°</span></p>
                  </div>
                  <p className="mt-3 text-[8px] text-slate-400 font-black uppercase italic leading-tight">{s.note}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* GBR 1381 POSITION */}
          <CircleMarker center={[50.79, -1.10]} radius={10} pathOptions={{ color: '#ffffff', fillColor: '#ED1C24', fillOpacity: 1, weight: 3 }}>
            <Popup><div className="font-black text-xs uppercase">GBR 1381 // TARGET</div></Popup>
          </CircleMarker>
        </MapContainer>

        {/* HUD OVERLAY */}
        <div className="absolute top-4 left-4 z-[1000] bg-slate-900/90 p-4 rounded-lg shadow-xl backdrop-blur-md border-l-4 border-red-500 text-white text-[10px] w-52 pointer-events-none">
            <h3 className="font-black uppercase text-slate-400 mb-3 flex justify-between"><span>Tactical Status</span> <span className="text-red-500 animate-pulse">● LIVE</span></h3>
            <div className="space-y-2">
                <div className="flex justify-between border-b border-white/10 pb-1">
                    <span className="text-slate-500 uppercase font-bold">Winning Shore</span>
                    <span className="font-black text-green-400 uppercase">{currentDir > 200 ? "Island" : "Mainland"}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1">
                    <span className="text-slate-500 uppercase font-bold">Chop Height</span>
                    <span className="font-black text-blue-400">{(data?.marine?.current?.wave_height || 0.3).toFixed(2)}m</span>
                </div>
                <div className="pt-2">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-1 w-4 bg-red-500"></div>
                        <span className="text-slate-400 uppercase font-bold">Wind Pressure Zones</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-4 bg-blue-500"></div>
                        <span className="text-slate-400 uppercase font-bold">Tidal Stream Power</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
