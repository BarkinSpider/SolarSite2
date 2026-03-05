import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { 
  Sun, Battery, Zap, Activity, AlertCircle, RefreshCw, 
  Gauge, Clock, Thermometer, Home, Moon, Cloud, CloudSun, 
  CloudMoon, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle
} from 'lucide-react';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types for Prometheus data
interface MetricData {
  metric: { [key: string]: string };
  value: [number, string];
}

interface RangeMetricData {
  metric: { [key: string]: string };
  values: [number, string][];
}

const REFRESH_INTERVAL = 60000; // 1 minute refresh for 4-minute data updates

const colors = {
  emerald: '#10b981',
  amber: '#f59e0b',
  cyan: '#06b6d4',
  purple: '#a855f7',
  rose: '#f43f5e',
  blue: '#3b82f6',
  zinc: '#a1a1aa'
};

const PowerFlow = ({ pvPower, pv1Power, pv2Power, loadPower, pCharge, pDischarge, soc }: any) => {
  const isCharging = Math.abs(pCharge) > 2;
  const isDischarging = Math.abs(pDischarge) > 2;
  const batteryPower = isCharging ? pCharge : isDischarging ? pDischarge : 0;
  const isLoadActive = Math.abs(loadPower) > 2;
  const isPVActive = Math.abs(pvPower) > 2;
  const isActive = isPVActive || isLoadActive || isCharging || isDischarging;
  
  const formatWatts = (w: number) => {
    if (w >= 1000) return `${(w / 1000).toFixed(2)} kW`;
    return `${w.toFixed(0)} W`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-2 relative w-full">
      {/* Solar Row */}
      <div className="flex items-center justify-center w-full max-w-xl z-10 mb-12 mt-4">
        {/* PV 1 Node */}
        <div className="flex flex-col items-center relative w-12">
          <div className="absolute -top-6 text-amber-500/80 font-mono font-medium text-xs whitespace-nowrap">{formatWatts(pv1Power)}</div>
          <div className="w-10 h-10 rounded-full bg-[#050505] flex items-center justify-center z-10 border border-amber-500/20">
            <Sun size={18} className="text-amber-500/70" />
          </div>
          <div className="absolute -bottom-5 text-[8px] uppercase tracking-widest text-zinc-500 whitespace-nowrap">PV 1</div>
        </div>

        {/* Line PV1 -> Total */}
        <div className="flex-1 flex items-center justify-center px-2">
           <div className={cn(
             "h-1.5 w-full rounded-full relative transition-colors duration-500",
             Math.abs(pv1Power) > 2 ? "flow-line text-amber-500 bg-amber-500/10" : "bg-zinc-800/50"
           )} />
        </div>

        {/* Total Solar Node */}
        <div className="flex flex-col items-center relative w-16">
          <div className="absolute -top-10 text-[14px] uppercase tracking-widest font-semibold text-zinc-500 whitespace-nowrap">Live Power Flow</div>
          <div className="w-16 h-16 rounded-full bg-[#050505] flex items-center justify-center z-10 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
            <Sun size={32} className="text-amber-500" />
          </div>
          <div className="absolute -bottom-7 text-amber-500 font-mono font-medium text-lg whitespace-nowrap">{formatWatts(pvPower)}</div>
          <div className="absolute -bottom-11 text-[9px] uppercase tracking-widest text-zinc-500 whitespace-nowrap">Total Solar</div>
        </div>

        {/* Line PV2 -> Total */}
        <div className="flex-1 flex items-center justify-center px-2">
           <div className={cn(
             "h-1.5 w-full rounded-full relative transition-colors duration-500",
             Math.abs(pv2Power) > 2 ? "flow-line-reverse text-amber-500 bg-amber-500/10" : "bg-zinc-800/50"
           )} />
        </div>

        {/* PV 2 Node */}
        <div className="flex flex-col items-center relative w-12">
          <div className="absolute -top-6 text-amber-500/80 font-mono font-medium text-xs whitespace-nowrap">{formatWatts(pv2Power)}</div>
          <div className="w-10 h-10 rounded-full bg-[#050505] flex items-center justify-center z-10 border border-amber-500/20">
            <Sun size={18} className="text-amber-500/70" />
          </div>
          <div className="absolute -bottom-5 text-[8px] uppercase tracking-widest text-zinc-500 whitespace-nowrap">PV 2</div>
        </div>
      </div>

      {/* Vertical Line to Inverter */}
      <div className={cn(
        "w-1.5 h-12 rounded-full relative transition-colors duration-500",
        isPVActive ? "flow-line-vertical text-amber-500 bg-amber-500/10" : "bg-zinc-800/50"
      )} />

      {/* Middle Row: Battery - Inverter - Load */}
      <div className="flex items-center justify-center w-full max-w-3xl z-10">
        {/* Battery Node */}
        <div className="flex flex-col items-center w-36">
          <div className="w-16 h-16 rounded-full bg-[#050505] border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-2 shadow-[0_0_20px_rgba(16,185,129,0.1)] relative">
            <Battery size={32} />
            <div className="absolute -bottom-2 bg-[#0a0a0a] px-2 py-0.5 text-[10px] font-mono text-emerald-500 rounded-full border border-emerald-500/20">
              {soc.toFixed(1)}%
            </div>
          </div>
          <div className="text-emerald-500 font-mono font-medium text-lg mt-2">{formatWatts(batteryPower)}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
            {isCharging ? 'Charging' : isDischarging ? 'Discharging' : 'Idle'}
          </div>
        </div>

        {/* Horizontal Line Inverter <-> Battery */}
        <div className="flex-1 flex items-center justify-center px-1">
           <div className={cn(
             "h-1.5 w-full rounded-full relative transition-colors duration-500",
             isCharging ? "flow-line-reverse text-emerald-500 bg-emerald-500/10" : 
             isDischarging ? "flow-line text-emerald-500 bg-emerald-500/10" : "bg-zinc-800/50"
           )} />
        </div>

        {/* Inverter Node */}
        <div className="flex flex-col items-center w-48">
          <div className="w-[120px] h-[120px] rounded-2xl bg-[#050505] border border-zinc-800/50 flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.9)] relative z-20 overflow-hidden">
            <svg width="112" height="112" viewBox="0 0 100 100" className="absolute inset-auto">
              {/* Outer dashed ring */}
              <g className={cn("origin-center transition-all duration-500", isActive ? "animate-slow-spin" : "")}>
                <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 8" className="text-zinc-700" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="10 10" className="text-zinc-800" />
              </g>
              {/* Inner rotating elements */}
              <g className={cn("origin-center transition-all duration-500", isActive ? "animate-slow-spin-reverse" : "")}>
                <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="text-zinc-600" />
                <polygon points="50,14 54,22 46,22" fill="currentColor" className={isActive ? "text-emerald-500/40" : "text-zinc-700"} />
                <polygon points="50,86 46,78 54,78" fill="currentColor" className={isActive ? "text-emerald-500/40" : "text-zinc-700"} />
                <polygon points="14,50 22,46 22,54" fill="currentColor" className={isActive ? "text-emerald-500/40" : "text-zinc-700"} />
                <polygon points="86,50 78,54 78,46" fill="currentColor" className={isActive ? "text-emerald-500/40" : "text-zinc-700"} />
              </g>
              {/* Central Sine Wave (DC to AC conversion) */}
              <path 
                d="M 32 50 Q 41 30 50 50 T 68 50" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4" 
                strokeLinecap="round"
                className={cn("transition-colors duration-500", isActive ? "text-emerald-400" : "text-zinc-600")} 
              />
            </svg>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-3 text-center">EG4 6000XP Inverter</div>
        </div>

        {/* Horizontal Line Inverter -> Load */}
        <div className="flex-1 flex items-center justify-center px-1">
           <div className={cn(
             "h-1.5 w-full rounded-full relative transition-colors duration-500",
             isLoadActive ? "flow-line text-cyan-500 bg-cyan-500/10" : "bg-zinc-800/50"
           )} />
        </div>

        {/* Load Node */}
        <div className="flex flex-col items-center w-36">
          <div className="w-16 h-16 rounded-full bg-[#050505] border border-cyan-500/30 flex items-center justify-center text-cyan-500 mb-2 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
            <Home size={32} />
          </div>
          <div className="text-cyan-500 font-mono font-medium text-lg">{formatWatts(loadPower)}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">Home Load</div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, unit, icon: Icon, colorClass, strokeColor, data, dataKey }: any) => {
  return (
    <div className="widget-card p-4 flex flex-col gap-3 group">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl bg-white/5", colorClass)}>
            <Icon size={20} />
          </div>
          <span className="text-xs uppercase tracking-widest font-semibold text-zinc-400">{title}</span>
        </div>
        <div className="text-right flex items-baseline gap-1">
          <span className="text-2xl font-mono font-medium text-white">{value}</span>
          {unit && <span className="text-xs font-mono text-zinc-500">{unit}</span>}
        </div>
      </div>
      <div className="h-10 w-full opacity-40 group-hover:opacity-100 transition-opacity duration-500">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={strokeColor} 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const getWeatherIcon = (code: number, isDay: number) => {
  const size = 24;
  if (code === 0) return isDay ? <Sun size={size} className="text-amber-400 animate-[spin_10s_linear_infinite]" /> : <Moon size={size} className="text-blue-200 animate-pulse" />;
  if (code === 1 || code === 2) return isDay ? <CloudSun size={size} className="text-amber-200 animate-pulse" /> : <CloudMoon size={size} className="text-blue-200 animate-pulse" />;
  if (code === 3) return <Cloud size={size} className="text-zinc-400 animate-[bounce_4s_infinite]" />;
  if (code === 45 || code === 48) return <CloudFog size={size} className="text-zinc-300 animate-pulse" />;
  if (code >= 51 && code <= 55) return <CloudDrizzle size={size} className="text-blue-300 animate-pulse" />;
  if (code >= 61 && code <= 65) return <CloudRain size={size} className="text-blue-400 animate-[bounce_2s_infinite]" />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} className="text-white animate-pulse" />;
  if (code >= 80 && code <= 82) return <CloudRain size={size} className="text-blue-500 animate-[bounce_2s_infinite]" />;
  if (code >= 85 && code <= 86) return <CloudSnow size={size} className="text-white animate-pulse" />;
  if (code >= 95) return <CloudLightning size={size} className="text-amber-400 animate-pulse" />;
  return <Cloud size={size} className="text-zinc-400" />;
};

export default function App() {
  const [metrics, setMetrics] = useState<string[]>([]);
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({});
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number; isDay: number } | null>(null);
  const [timeUntilUpdate, setTimeUntilUpdate] = useState(REFRESH_INTERVAL);

  // Countdown timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilUpdate(prev => {
        if (prev <= 1000) return REFRESH_INTERVAL;
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Coordinates for 94044 USA (Pacifica, CA)
        const res = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=37.6229&longitude=-122.4854&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit');
        setWeather({
          temp: res.data.current.temperature_2m,
          code: res.data.current.weather_code,
          isDay: res.data.current.is_day
        });
      } catch (e) {
        console.error("Failed to fetch weather", e);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000); // 15 mins
    return () => clearInterval(interval);
  }, []);

  // Fetch metric names starting with eg4
  useEffect(() => {
    const fetchMetricNames = async () => {
      try {
        const res = await axios.get('/api/metrics');
        if (res.data.status === 'success') {
          setMetrics(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch metrics', err);
        setError('Could not connect to Prometheus server.');
      }
    };
    fetchMetricNames();
  }, []);

  // Fetch current values and history
  const fetchData = async () => {
    setLoading(true);
    try {
      // 0. Test basic connectivity
      const testRes = await axios.get('/api/query', { params: { query: '1+1' } });
      if (testRes.data.status !== 'success') {
        throw new Error(`Prometheus basic test failed: ${JSON.stringify(testRes.data)}`);
      }

      // 1. Fetch current values for all eg4 metrics
      const currentRes = await axios.get('/api/query', {
        params: { query: '{__name__=~"eg4.*"}' }
      });

      if (currentRes.data.status === 'success') {
        const values: Record<string, number> = {};
        const results = currentRes.data.data.result;
        
        if (results.length > 0) {
          results.forEach((res: any) => {
            const val = res.value ? res.value[1] : (res.values ? res.values[res.values.length - 1][1] : '0');
            values[res.metric.__name__] = parseFloat(val);
          });
          setCurrentValues(values);
          setError(null);
        }
      } else {
        const errorMsg = currentRes.data.error || JSON.stringify(currentRes.data);
        setError(`Prometheus API Error: ${errorMsg}`);
      }

      // 2. Fetch history for key metrics (last 3 hours)
      const now = Math.floor(Date.now() / 1000);
      const start = now - 3 * 3600;
      const step = '240s'; // 4-minute steps to match data resolution

      const historyQueries = [
        { name: 'pv_power', query: 'eg4_ppv1 + eg4_ppv2' },
        { name: 'battery_power', query: 'eg4_pcharge - eg4_pdischarge' },
        { name: 'load_power', query: 'eg4_seps' },
        { name: 'soc', query: 'eg4_soc_percent' },
        { name: 'battery_voltage', query: 'eg4_vbat' },
        { name: 'cycles', query: 'eg4_bmscyclecnt' },
        { name: 'cell_delta', query: '(eg4_bmsmaxcellvolt - eg4_bmsmincellvolt) * 1000' },
        { name: 'inv_temp', query: 'eg4_tinner' },
        { name: 'min_cell_temp', query: 'eg4_bmsmincelltemp' },
        { name: 'today_energy', query: 'eg4_epv1day + eg4_epv2day' }
      ];

      const historyResults = await Promise.all(
        historyQueries.map(q => 
          axios.get('/api/query_range', {
            params: { query: q.query, start, end: now, step }
          })
        )
      );

      const timeMap: Record<number, any> = {};
      historyResults.forEach((res, idx) => {
        if (res.data.status === 'success' && res.data.data.result.length > 0) {
          const series = res.data.data.result[0].values;
          series.forEach(([time, val]: [number, string]) => {
            if (!timeMap[time]) timeMap[time] = { time };
            timeMap[time][historyQueries[idx].name] = parseFloat(val);
          });
        }
      });

      const formattedHistory = Object.values(timeMap).sort((a, b) => a.time - b.time);
      setHistoryData(formattedHistory);
      setLastUpdated(new Date());
      setTimeUntilUpdate(REFRESH_INTERVAL);
      setError(null);
    } catch (err: any) {
      console.error('Data fetch error', err);
      const msg = err.response?.data?.error || err.message;
      setError(`Connection Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (unix: number) => {
    return new Date(unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getVal = (keys: string[]) => {
    for (const key of keys) {
      if (currentValues[key] !== undefined) return currentValues[key];
    }
    const found = Object.keys(currentValues).find(k => keys.some(search => k.includes(search)));
    return found ? currentValues[found] : undefined;
  };

  const pChargeRaw = getVal(['eg4_pcharge', 'eg4_battery_charge_power']) || 0;
  const pDischargeRaw = getVal(['eg4_pdischarge', 'eg4_battery_discharge_power']) || 0;
  const pBatterySigned = getVal(['eg4_battery_power', 'eg4_p_battery', 'eg4_battery_watts', 'eg4_p_bat']);
  
  let pCharge = pChargeRaw;
  let pDischarge = pDischargeRaw;
  
  if (pBatterySigned !== undefined && pCharge === 0 && pDischarge === 0) {
    if (pBatterySigned > 0) pCharge = pBatterySigned;
    else if (pBatterySigned < 0) pDischarge = Math.abs(pBatterySigned);
  }

  const pv1Power = currentValues['eg4_ppv1'] || getVal(['eg4_pv1_power', 'eg4_ppv1']) || 0;
  const pv2Power = currentValues['eg4_ppv2'] || getVal(['eg4_pv2_power', 'eg4_ppv2']) || 0;
  const pvPower = pv1Power + pv2Power || getVal(['eg4_pv_power_watts', 'eg4_pv_watts', 'eg4_solar_power', 'eg4_ppv']) || 0;
  const loadPower = getVal(['eg4_seps', 'eg4_load_power_watts', 'eg4_load_watts', 'eg4_house_load', 'eg4_p_load']) || 0;
  const soc = getVal(['eg4_soc_percent', 'eg4_battery_soc', 'eg4_soc']) || 0;
  const todayEnergy = (currentValues['eg4_epv1day'] || 0) + (currentValues['eg4_epv2day'] || 0);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans p-2 md:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 pb-4">
          <div className="flex items-center gap-6">
            <div className="cube-container hidden sm:block">
              <div className="cube">
                <div className="cube-face face-front text-amber-500"><Sun size={26} /></div>
                <div className="cube-face face-back text-emerald-500"><Battery size={26} /></div>
                <div className="cube-face face-right text-blue-500"><Zap size={26} /></div>
                <div className="cube-face face-left text-purple-500"><Activity size={26} /></div>
                <div className="cube-face face-top text-rose-500"><RefreshCw size={26} /></div>
                <div className="cube-face face-bottom text-cyan-500"><Gauge size={26} /></div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-2">
                Chateau Lake <span className="font-semibold text-zinc-400">Solar Telemetry</span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs font-mono text-zinc-500">
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  SYSTEM ONLINE
                </span>
                <span className="hidden md:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <Activity size={14} />
                  oracle.inetd.com:9090
                </span>
                <span className="hidden md:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {lastUpdated.toLocaleTimeString()}
                </span>
                {weather && (
                  <>
                    <span className="hidden md:inline">•</span>
                    <span className="flex items-center gap-2 text-sm font-medium text-white">
                      {getWeatherIcon(weather.code, weather.isDay)}
                      {weather.temp.toFixed(1)}°F
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            {/* Circular Countdown Timer */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">Next Update</span>
              <div className="relative w-16 h-16 flex items-center justify-center" title={`Next update in ${Math.ceil(timeUntilUpdate / 1000)}s`}>
                
                {/* Explosion Animation */}
                {timeUntilUpdate <= 1000 && (
                  <>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0.8 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full bg-emerald-500/30 blur-md z-0"
                    />
                    <motion.div
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border-2 border-emerald-400 z-0"
                    />
                  </>
                )}

                <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path
                    className="text-zinc-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  {/* Progress Circle */}
                  <path
                    className="text-emerald-500 transition-all duration-1000 ease-linear"
                    strokeDasharray={`${(timeUntilUpdate / REFRESH_INTERVAL) * 100}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center relative z-10">
                  <span className="text-sm font-mono font-medium text-zinc-300">
                    {Math.ceil(timeUntilUpdate / 1000)}s
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                fetchData();
                setTimeUntilUpdate(REFRESH_INTERVAL);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors h-10"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400">
            <AlertCircle size={18} />
            <p className="text-xs">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: Power Flow & Distribution (Spans 2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="widget-card relative overflow-hidden min-h-[400px]"
            >
              {/* Background Area Chart */}
              <div className="absolute inset-0 z-0 opacity-50">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.amber} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors.amber} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.cyan} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors.cyan} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={formatTime} 
                      stroke="#52525b" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#52525b" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}W`}
                    />
                    <Area 
                      type="stepAfter" 
                      dataKey="pv_power" 
                      stroke={colors.amber} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorPv)" 
                      name="PV Power"
                    />
                    <Area 
                      type="stepAfter" 
                      dataKey="load_power" 
                      stroke={colors.cyan} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorLoad)" 
                      name="Load Power"
                    />
                    <Line 
                      type="stepAfter" 
                      dataKey="battery_power" 
                      stroke={colors.emerald} 
                      strokeWidth={2}
                      dot={false}
                      name="Battery Power"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Foreground Power Flow */}
              <div className="relative z-10 p-4 bg-[#050505]/60 backdrop-blur-[2px] h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 flex items-center gap-1.5">
                    <Activity size={14} />
                    Live Power Flow & Distribution (3H)
                  </h2>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-400">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>PV</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-400">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span>Load</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-400">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Batt</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <PowerFlow pvPower={pvPower} pv1Power={pv1Power} pv2Power={pv2Power} loadPower={loadPower} pCharge={pCharge} pDischarge={pDischarge} soc={soc} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Key Metrics Grid */}
          <div className="space-y-3">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <MetricCard 
                title="Battery SOC" 
                value={soc ? soc.toFixed(1) : '--'} 
                unit="%" 
                icon={Battery} 
                colorClass="text-emerald-500" 
                strokeColor={colors.emerald}
                data={historyData} 
                dataKey="soc" 
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <MetricCard 
                title="Today's Yield" 
                value={todayEnergy ? todayEnergy.toFixed(1) : '--'} 
                unit="kWh" 
                icon={Sun} 
                colorClass="text-amber-500" 
                strokeColor={colors.amber}
                data={historyData} 
                dataKey="today_energy" 
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <MetricCard 
                title="Battery Voltage" 
                value={getVal(['eg4_vbat']) ? getVal(['eg4_vbat'])?.toFixed(2) : '--'} 
                unit="V" 
                icon={Zap} 
                colorClass="text-purple-500" 
                strokeColor={colors.purple}
                data={historyData} 
                dataKey="battery_voltage" 
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <MetricCard 
                title="Inverter Temp" 
                value={getVal(['eg4_tinner', 'eg4_temp_inv', 'eg4_inverter_temp']) ? getVal(['eg4_tinner', 'eg4_temp_inv', 'eg4_inverter_temp'])?.toFixed(1) : '--'} 
                unit="°C" 
                icon={Thermometer} 
                colorClass="text-rose-500" 
                strokeColor={colors.rose}
                data={historyData} 
                dataKey="inv_temp" 
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
              <MetricCard 
                title="Cell Delta" 
                value={(getVal(['eg4_bmsmaxcellvolt']) && getVal(['eg4_bmsmincellvolt'])) ? ((getVal(['eg4_bmsmaxcellvolt'])! - getVal(['eg4_bmsmincellvolt'])!) * 1000).toFixed(1) : '--'} 
                unit="mV" 
                icon={Gauge} 
                colorClass="text-blue-500" 
                strokeColor={colors.blue}
                data={historyData} 
                dataKey="cell_delta" 
              />
            </motion.div>
          </div>
        </div>

        {/* Bottom: Raw Telemetry */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="widget-card"
        >
          <div className="p-4 border-b border-white/[0.02] flex items-center justify-between">
            <h2 className="text-[10px] uppercase tracking-widest font-semibold text-zinc-500 flex items-center gap-1.5">
              <Activity size={14} />
              Raw Telemetry
            </h2>
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest">{Object.keys(currentValues).length} Parameters Active</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-2 border-b border-white/[0.02] bg-white/[0.01] text-[9px] uppercase tracking-widest font-semibold text-zinc-500 sticky top-0 backdrop-blur-md z-10">
              <div>Metric Name</div>
              <div className="text-right">Value</div>
              <div>Status</div>
            </div>
            <div className="divide-y divide-white/[0.02]">
              {Object.entries(currentValues).sort().map(([name, val]) => (
                <div key={name} className="data-row px-4">
                  <div className="font-mono text-[10px] text-zinc-400">{name}</div>
                  <div className="text-right font-mono text-[10px] font-medium text-white">{val.toLocaleString()}</div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500">Nominal</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="pt-4 pb-2 flex flex-col md:flex-row justify-between items-center gap-3 text-[9px] text-zinc-600 uppercase tracking-[0.2em]">
          <div>EG4 Solar Monitoring System v2.0.0</div>
          <div className="flex gap-6">
            <span>System ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
            <span>Node: context.inetd.com</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

