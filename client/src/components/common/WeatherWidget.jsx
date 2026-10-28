import React, { useState, useEffect } from 'react';
import { Wind, Droplets, Thermometer, Loader2, AlertCircle, CloudLightning } from 'lucide-react';
import { weatherService } from '../../services/api';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function WeatherWidget({ district, state }) {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await weatherService.getWeather({
        district: district || 'Guntur',
        state: state || 'Andhra Pradesh'
      });
      setWeatherData(res.data?.data || null);
    } catch {
      setError('Could not load weather data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [district, state]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-5 flex items-center justify-center h-48">
        <Loader2 size={24} className="animate-spin text-white/70" />
      </div>
    );
  }

  if (error || !weatherData?.current) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-5 text-white/80 flex items-center gap-2">
        <AlertCircle size={18} />
        <span className="text-sm">{error || 'Weather unavailable'}</span>
      </div>
    );
  }

  const { current, forecast = [], rainAlert, source } = weatherData;

  return (
    <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 text-white shadow-lg space-y-4">
      {/* Rain Alert Banner */}
      {rainAlert?.willRain && (
        <div className="bg-amber-400/20 border border-amber-300/40 rounded-2xl p-3 flex items-start gap-2.5">
          <CloudLightning size={18} className="text-amber-300 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-extrabold text-amber-200 uppercase tracking-wider">Rain Alert</p>
            <p className="text-blue-50 mt-0.5">{rainAlert.advisory}</p>
          </div>
        </div>
      )}

      {/* Current Weather */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-blue-100">📍 {current.city}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-blue-100 uppercase font-semibold">
              {source === 'openweather' ? 'Live 30m Cache' : 'Regional Estimate'}
            </span>
          </div>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-5xl font-black">{Math.round(current.temp)}°</span>
            <span className="text-blue-200 mb-2 font-bold">C</span>
          </div>
          <p className="text-blue-100 text-sm capitalize font-medium">{current.description}</p>
        </div>
        <div className="mt-1">
          <img
            src={`https://openweathermap.org/img/wn/${current.icon || '02d'}@2x.png`}
            alt="weather"
            className="w-16 h-16"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/10 rounded-2xl p-2.5 text-center">
          <Droplets size={16} className="text-blue-200 mx-auto mb-1" />
          <p className="text-xs text-blue-100">Humidity</p>
          <p className="font-bold text-sm">{current.humidity}%</p>
        </div>
        <div className="bg-white/10 rounded-2xl p-2.5 text-center">
          <Wind size={16} className="text-blue-200 mx-auto mb-1" />
          <p className="text-xs text-blue-100">Wind</p>
          <p className="font-bold text-sm">{current.windSpeedKmh} km/h</p>
        </div>
        <div className="bg-white/10 rounded-2xl p-2.5 text-center">
          <Thermometer size={16} className="text-blue-200 mx-auto mb-1" />
          <p className="text-xs text-blue-100">Feels like</p>
          <p className="font-bold text-sm">{Math.round(current.feelsLike)}°C</p>
        </div>
      </div>

      {/* 5-day Forecast */}
      {forecast.length > 0 && (
        <div>
          <p className="text-[11px] text-blue-200 font-bold uppercase tracking-wider mb-2">5-Day Forecast</p>
          <div className="grid grid-cols-5 gap-1.5">
            {forecast.slice(0, 5).map((item, idx) => {
              const d = new Date((item.dt || Date.now() / 1000) * 1000);
              return (
                <div key={idx} className="bg-white/10 rounded-xl p-2 text-center">
                  <p className="text-[11px] font-bold text-blue-200">{DAYS[d.getDay()]}</p>
                  <img
                    src={`https://openweathermap.org/img/wn/${item.icon || '02d'}.png`}
                    alt=""
                    className="w-8 h-8 mx-auto"
                  />
                  <p className="text-xs font-extrabold">{Math.round(item.temp)}°</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
