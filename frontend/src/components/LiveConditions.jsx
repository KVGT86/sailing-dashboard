import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wind, Thermometer, Waves, Compass, Droplets, MapPin } from 'lucide-react';

export default function LiveConditions() {
  const [weather, setWeather] = useState(null);
  const [tides, setTides] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // Solent Coordinates (Bramble Bank / Portsmouth)
  const LAT = 50.8;
  const LON = -1.1;

  useEffect(() => {
    const fetchLiveConditions = async () => {
      try {
        // Fetch from our new free Open-Meteo and RSS endpoints
        const [weatherRes, tideRes] = await Promise.all([
          axios.get(`http://localhost:5222/api/weather/current?lat=${LAT}&lon=${LON}`),
          axios.get(`http://localhost:5222/api/tides/portsmouth`)
        ]);

        const current = weatherRes.data.current;

        setWeather({
          windSpeed: current.wind_speed_10m.toFixed(1),
          windGust: current.wind_gusts_10m ? current.wind_gusts_10m.toFixed(1) : '--',
          windDirection: current.wind_direction_10m,
          temp: Math.round(current.temperature_2m),
          humidity: current.relative_humidity_2m
        });

        setTides(tideRes.data.extremes);

      } catch (error) {
        console.error("API Fetch Error:", error);
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveConditions();
  }, []);

  if (isLoading) return <div className="p-6 text-[#0A192F] font-bold text-xl animate-pulse">Fetching Free Marine Data...</div>;

  if (apiError || !weather || !tides) return (
    <div className="p-6 max-w-2xl mx-auto mt-10 bg-red-50 border-l-4 border-red-600 rounded">
      <h3 className="text-xl font-bold text-red-800">Connection Failed</h3>
      <p className="text-red-700 mt-2 font-medium">Please ensure your Node.js backend server is running on port 5000.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-[#0A192F] text-white p-6 rounded-xl shadow-lg flex justify-between items-center border-b-4 border-red-600">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wide flex items-center gap-2">
            <MapPin className="text-red-500" /> Solent Live Conditions
          </h2>
          <p className="text-gray-400 font-medium mt-1">Powered by Open-Meteo & TideTimes (Free Tier)</p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-sm font-bold text-gray-400 uppercase">Status</div>
          <div className="text-green-400 font-bold flex items-center gap-1">
            <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span> Free Sensors Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* WIND CARD */}
        <div className="bg-white p-6 rounded-xl shadow border-t-4 border-[#0A192F] flex flex-col items-center justify-center text-center">
          <Wind size={40} className="text-[#0A192F] mb-3" />
          <h3 className="text-sm font-bold text-gray-500 uppercase">Surface Wind</h3>
          <div className="text-5xl font-black text-[#0A192F] my-2">
            {weather.windSpeed} <span className="text-xl text-gray-500 font-bold">kts</span>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="bg-red-50 px-3 py-1 rounded border border-red-200">
              <span className="block text-[10px] font-bold text-red-600 uppercase">Gusts</span>
              <span className="font-bold text-red-700">{weather.windGust !== '--' ? `${weather.windGust} kts` : '--'}</span>
            </div>
            <div className="bg-gray-100 px-3 py-1 rounded border border-gray-200 flex items-center gap-2">
              <div>
                <span className="block text-[10px] font-bold text-gray-500 uppercase">Direction</span>
                <span className="font-bold text-[#0A192F]">{weather.windDirection}°</span>
              </div>
              <Compass size={20} className="text-gray-400" style={{ transform: `rotate(${weather.windDirection}deg)` }} />
            </div>
          </div>
        </div>

        {/* ATMOSPHERE CARD */}
        <div className="bg-white p-6 rounded-xl shadow border-t-4 border-red-600 flex flex-col items-center justify-center text-center">
          <Thermometer size={40} className="text-red-600 mb-3" />
          <h3 className="text-sm font-bold text-gray-500 uppercase">Air Temp</h3>
          <div className="text-5xl font-black text-[#0A192F] my-2">
            {weather.temp}°<span className="text-xl text-gray-500 font-bold">C</span>
          </div>
          <div className="mt-2 bg-blue-50 px-3 py-1 rounded border border-blue-200 flex items-center gap-2">
            <Droplets size={16} className="text-blue-500" />
            <div>
              <span className="block text-[10px] font-bold text-blue-800 uppercase">Humidity</span>
              <span className="font-bold text-blue-900">{weather.humidity}%</span>
            </div>
          </div>
        </div>

        {/* TIDES CARD */}
        <div className="bg-white p-6 rounded-xl shadow border-t-4 border-[#0A192F]">
          <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
            <Waves size={24} className="text-[#0A192F]" />
            <h3 className="text-lg font-bold text-[#0A192F] uppercase">Today's Tides (Portsmouth)</h3>
          </div>
          <div className="space-y-3">
            {tides && tides.map((tide, index) => (
              <div key={index} className={`flex justify-between items-center p-3 rounded font-bold ${tide.type === 'High' ? 'bg-[#0A192F] text-white' : 'bg-gray-100 text-[#0A192F]'}`}>
                <span>{tide.type} Water</span>
                <span className="text-lg">{tide.time}</span>
                <span className={`${tide.type === 'High' ? 'text-red-400' : 'text-gray-500'}`}>{tide.height}m</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}