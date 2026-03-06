import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { 
  Sun, Battery, Zap, Activity, AlertCircle, RefreshCw, 
  Gauge, Clock, Thermometer, Home, Moon, Cloud, CloudSun, 
  CloudMoon, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle,
  LayoutGrid, Settings
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

const AnimatedSolarPanel = ({ isActive, color }: { isActive: boolean, color: string }) => (
  <div className="relative w-20 h-20 flex items-center justify-center">
    <motion.div
      animate={isActive ? {
        boxShadow: [
          `0 0 0px ${color}20`,
          `0 0 20px ${color}40`,
          `0 0 0px ${color}20`
        ]
      } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      className={cn(
        "w-16 h-16 rounded-xl bg-[#050505] border flex items-center justify-center relative overflow-hidden",
        isActive ? `border-${color}/40` : "border-zinc-800/50"
      )}
      style={{ borderColor: isActive ? color : undefined }}
    >
      {/* Solar Panel Grid Pattern */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-px p-1 opacity-20">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-zinc-400/50 rounded-[1px]" />
        ))}
      </div>
      
      <Sun size={28} className={cn("relative z-10 transition-colors duration-500", isActive ? "text-amber-500" : "text-zinc-600")} />
      
      {/* Shine Animation */}
      {isActive && (
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />
      )}
    </motion.div>
  </div>
);

const SolarPowerNode = ({ isActive, color, power }: { isActive: boolean, color: string, power: number }) => (
  <div className="flex flex-col items-center relative w-24">
    <div className="absolute -top-12 flex flex-col items-center">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 whitespace-nowrap font-bold mb-0.5">Solar Power</div>
      <div className="text-amber-500 font-mono font-medium text-lg whitespace-nowrap leading-none">
        {power >= 1000 ? `${(power / 1000).toFixed(2)} kW` : `${power.toFixed(0)} W`}
      </div>
    </div>
    <motion.div 
      animate={isActive ? { 
        borderColor: [color, `${color}40`, color],
        boxShadow: [`0 0 10px ${color}20`, `0 0 20px ${color}40`, `0 0 10px ${color}20`]
      } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      className="w-16 h-16 rounded-xl bg-[#050505] border border-zinc-800 flex flex-col items-center justify-center z-10 relative overflow-hidden"
    >
      {/* Internal circuitry pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white" />
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-white" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-white" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-white" />
      </div>

      {/* Animated LEDs */}
      <div className="flex gap-1 mb-1">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            animate={isActive ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.2 }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
            className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-amber-500" : "bg-zinc-700")}
          />
        ))}
      </div>

      <Zap size={24} className={cn("transition-colors duration-500", isActive ? "text-amber-500" : "text-zinc-700")} />
      
      {/* Data flow lines */}
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border border-dashed border-amber-500/20 rounded-full"
          />
        </div>
      )}
    </motion.div>
  </div>
);

const PowerFlow = ({ 
  pvPower, pv1Power, pv2Power, pv1Voltage, pv2Voltage, 
  loadPower, pCharge, pDischarge, soc, 
  invTemp, batTemp, cellDelta, cycleCount,
  vBat, fEps
}: any) => {
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
    <div className="flex flex-col items-center justify-center py-2 relative w-full max-w-md mx-auto scale-[0.85] sm:scale-100 origin-top">
      
      {/* ROW 1: PV Nodes */}
      <div className="flex justify-between w-full px-4 relative z-10">
        <div className="flex flex-col items-center relative w-24">
          <AnimatedSolarPanel isActive={Math.abs(pv1Power) > 2} color={colors.amber} />
          <div className="flex flex-col items-center mt-2">
            <span className="text-amber-500 font-mono font-medium text-sm whitespace-nowrap">{formatWatts(pv1Power)}</span>
            <span className="text-amber-500/50 font-mono text-[10px] whitespace-nowrap">{pv1Voltage.toFixed(1)}V</span>
          </div>
        </div>

        <div className="flex flex-col items-center relative w-24">
          <AnimatedSolarPanel isActive={Math.abs(pv2Power) > 2} color={colors.amber} />
          <div className="flex flex-col items-center mt-2">
            <span className="text-amber-500 font-mono font-medium text-sm whitespace-nowrap">{formatWatts(pv2Power)}</span>
            <span className="text-amber-500/50 font-mono text-[10px] whitespace-nowrap">{pv2Voltage.toFixed(1)}V</span>
          </div>
        </div>
      </div>

      {/* ROW 2: Total Solar Node */}
      <div className="relative z-10 mt-12 mb-16">
        <SolarPowerNode isActive={isPVActive} color={colors.amber} power={pvPower} />

        {/* Horizontal Lines connected to sides of Total Solar */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[-112px] w-[112px] h-1.5 z-0">
          <div className={cn("w-full h-full rounded-full", Math.abs(pv1Power) > 2 ? "flow-line text-amber-500 bg-amber-500/10" : "bg-zinc-800/50")} />
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-[-112px] w-[112px] h-1.5 z-0">
          <div className={cn("w-full h-full rounded-full", Math.abs(pv2Power) > 2 ? "flow-line-reverse text-amber-500 bg-amber-500/10" : "bg-zinc-800/50")} />
        </div>

        {/* Vertical Lines up to PV1 & PV2 */}
        <div className="absolute top-1/2 left-[-112px] w-1.5 h-[64px] -translate-x-1/2 -translate-y-full z-0">
          <div className={cn("w-full h-full rounded-full", Math.abs(pv1Power) > 2 ? "flow-line-vertical text-amber-500 bg-amber-500/10" : "bg-zinc-800/50")} />
        </div>
        <div className="absolute top-1/2 right-[-112px] w-1.5 h-[64px] translate-x-1/2 -translate-y-full z-0">
          <div className={cn("w-full h-full rounded-full", Math.abs(pv2Power) > 2 ? "flow-line-vertical text-amber-500 bg-amber-500/10" : "bg-zinc-800/50")} />
        </div>

        {/* Vertical Line down to Inverter */}
        <div className="absolute bottom-[-64px] left-1/2 -translate-x-1/2 w-1.5 h-[64px] z-0">
          <div className={cn("w-full h-full rounded-full", isPVActive ? "flow-line-vertical text-amber-500 bg-amber-500/10" : "bg-zinc-800/50")} />
        </div>
      </div>

      {/* ROW 3: Inverter */}
      <div className="relative z-10 mb-8">
        <div className="w-[100px] h-[100px] rounded-2xl bg-[#050505] border border-zinc-800/50 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.9)] relative overflow-hidden">
          <svg width="90" height="90" viewBox="0 0 100 100" className="absolute inset-auto">
            <g className={cn("origin-center transition-all duration-500", isActive ? "animate-slow-spin" : "")}>
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 8" className="text-zinc-700" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray="10 10" className="text-zinc-800" />
            </g>
            <g className={cn("origin-center transition-all duration-500", isActive ? "animate-slow-spin-reverse" : "")}>
              <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="text-zinc-600" />
              <polygon points="50,14 54,22 46,22" fill="currentColor" className={isActive ? "text-emerald-500/40" : "text-zinc-700"} />
              <polygon points="50,86 46,78 54,78" fill="currentColor" className={isActive ? "text-emerald-500/40" : "text-zinc-700"} />
              <polygon points="14,50 22,46 22,54" fill="currentColor" className={isActive ? "text-emerald-500/40" : "text-zinc-700"} />
              <polygon points="86,50 78,54 78,46" fill="currentColor" className={isActive ? "text-emerald-500/40" : "text-zinc-700"} />
            </g>
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
        <div className="flex flex-col items-center gap-1 mt-3 absolute -bottom-12 left-1/2 -translate-x-1/2 w-40">
          <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400 text-center">EG4 6000XP Inverter</div>
          <div className="flex items-center gap-1 bg-rose-500/5 px-2 py-0.5 rounded-full border border-rose-500/10 text-[9px] font-mono text-rose-500/80">
            <Thermometer size={10} />
            <span>{invTemp.toFixed(1)}°C</span>
          </div>
        </div>

        {/* Horizontal Lines connected to sides of Inverter */}
        <div className="absolute top-1/2 -translate-y-1/2 left-[-110px] w-[110px] h-1.5 z-0">
          <div className={cn("w-full h-full rounded-full", 
            isCharging ? "flow-line-reverse text-emerald-500 bg-emerald-500/10" : 
            isDischarging ? "flow-line text-emerald-500 bg-emerald-500/10" : "bg-zinc-800/50"
          )} />
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-[-110px] w-[110px] h-1.5 z-0">
          <div className={cn("w-full h-full rounded-full", 
            isLoadActive ? "flow-line text-cyan-500 bg-cyan-500/10" : "bg-zinc-800/50"
          )} />
        </div>

        {/* Vertical Lines down to Battery & Load */}
        <div className="absolute top-1/2 left-[-110px] w-1.5 h-[80px] -translate-x-1/2 z-0">
          <div className={cn("w-full h-full rounded-full", 
            isCharging ? "flow-line-vertical text-emerald-500 bg-emerald-500/10" : 
            isDischarging ? "flow-line-vertical-reverse text-emerald-500 bg-emerald-500/10" : "bg-zinc-800/50"
          )} />
        </div>
        <div className="absolute top-1/2 right-[-110px] w-1.5 h-[80px] translate-x-1/2 z-0">
          <div className={cn("w-full h-full rounded-full", 
            isLoadActive ? "flow-line-vertical text-cyan-500 bg-cyan-500/10" : "bg-zinc-800/50"
          )} />
        </div>
      </div>

      {/* ROW 4: Battery & Load Nodes */}
      <div className="flex justify-between w-full px-4 relative z-10">
        {/* Battery */}
        <div className="flex flex-col items-center w-24">
          <div className="w-16 h-16 rounded-full bg-[#050505] border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-2 shadow-[0_0_20px_rgba(16,185,129,0.1)] relative">
            <Battery size={32} />
          </div>
          <div className="flex flex-col items-center">
            <div className="text-emerald-500 font-mono font-semibold text-lg leading-none">{formatWatts(batteryPower)}</div>
            <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5 font-bold">
              {isCharging ? 'Charging' : isDischarging ? 'Discharging' : 'Idle'}
            </div>
            <div className="flex gap-2 mt-1">
              <span className="text-[9px] font-mono text-emerald-400/90">{vBat.toFixed(1)}V</span>
              <span className="text-[9px] font-mono text-emerald-400/90">{soc.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Load */}
        <div className="flex flex-col items-center w-24">
          <div className="w-16 h-16 rounded-full bg-[#050505] border border-cyan-500/30 flex items-center justify-center text-cyan-500 mb-2 shadow-[0_0_15px_rgba(6,182,212,0.1)] relative">
            <Home size={32} />
            <div className="absolute -bottom-1 bg-[#0a0a0a] px-1.5 py-0.5 text-[8px] font-mono text-cyan-500/80 rounded-full border border-cyan-500/20 shadow-sm">
              {fEps.toFixed(1)}Hz
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-cyan-500 font-mono font-semibold text-lg leading-none">{formatWatts(loadPower)}</div>
            <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5 font-bold">House Load</div>
          </div>
        </div>
      </div>

    </div>
  );
};

const SystemOverview = ({ 
  currentValues, 
  soc, 
  vBat, 
  invTemp, 
  cycleCount, 
  fEps,
  timeUntilUpdate,
  loading,
  onRefresh
}: { 
  currentValues: Record<string, number>,
  soc: number,
  vBat: number,
  invTemp: number,
  cycleCount: number,
  fEps: number,
  timeUntilUpdate: number,
  loading: boolean,
  onRefresh: () => void
}) => {
  const categorize = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('volt') || n.startsWith('eg4_v')) return 'Voltage';
    if (n.includes('amp') || n.startsWith('eg4_i')) return 'Current';
    if (n.includes('power') || n.includes('watt') || n.startsWith('eg4_p') || n.startsWith('eg4_s')) return 'Power';
    if (n.includes('temp') || n.startsWith('eg4_t')) return 'Temperature';
    if (n.includes('soc') || n.includes('percent')) return 'Percentage';
    if (n.includes('freq') || n.startsWith('eg4_f')) return 'Frequency';
    if (n.includes('energy') || n.includes('yield') || n.startsWith('eg4_e')) return 'Energy';
    return 'System';
  };

  const categories: Record<string, [string, number][]> = {};
  Object.entries(currentValues).forEach(([name, val]) => {
    const cat = categorize(name);
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push([name, val]);
  });

  const icons: Record<string, any> = {
    'Voltage': Gauge,
    'Current': Activity,
    'Power': Zap,
    'Temperature': Thermometer,
    'Percentage': Battery,
    'Frequency': RefreshCw,
    'Energy': Sun,
    'System': Settings
  };

  const colors: Record<string, string> = {
    'Voltage': 'text-purple-400',
    'Current': 'text-blue-400',
    'Power': 'text-amber-400',
    'Temperature': 'text-rose-400',
    'Percentage': 'text-emerald-400',
    'Frequency': 'text-cyan-400',
    'Energy': 'text-amber-500',
    'System': 'text-zinc-400'
  };

  // Key metrics to highlight at the top
  const keyMetrics = [
    { value: soc, label: 'SOC', unit: '%', icon: Battery, color: 'text-emerald-500' },
    { value: vBat, label: 'Battery', unit: 'V', icon: Zap, color: 'text-purple-500' },
    { value: invTemp, label: 'Inverter', unit: '°C', icon: Thermometer, color: 'text-rose-500' },
    { 
      value: Math.ceil(timeUntilUpdate / 1000), 
      label: 'Update', 
      unit: 's', 
      icon: RefreshCw, 
      color: 'text-amber-500',
      isTimer: true 
    },
    { value: cycleCount, label: 'Cycles', unit: '', icon: RefreshCw, color: 'text-blue-500' },
    { value: fEps, label: 'Grid', unit: 'Hz', icon: Activity, color: 'text-cyan-500' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="widget-card"
    >
      {/* Key Metrics Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-white/5 border-b border-white/5 bg-white/[0.01]">
        {keyMetrics.map((m, idx) => (
          <div key={idx} className="p-2 md:p-3 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-2 text-[8px] uppercase tracking-widest text-zinc-500">
              <m.icon size={10} className={cn(m.color, m.isTimer && loading && 'animate-spin')} />
              {m.label}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-mono font-bold text-white">
                {m.value !== undefined ? (m.isTimer ? m.value : m.value.toFixed(1)) : '--'}
              </span>
              <span className="text-[9px] font-mono text-zinc-600">{m.unit}</span>
              {m.isTimer && (
                <button 
                  onClick={onRefresh}
                  className="ml-1 p-1 hover:bg-white/10 rounded transition-colors text-zinc-500 hover:text-white"
                  title="Refresh Data"
                >
                  <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-2.5 md:p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/[0.01]">
        <h2 className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 flex items-center gap-2">
          <LayoutGrid size={14} />
          System Parameters Overview
        </h2>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
           {Object.keys(categories).sort().map(cat => (
             <div key={cat} className="flex items-center gap-1">
               <div className={cn("w-1 h-1 md:w-1.5 md:h-1.5 rounded-full", colors[cat]?.replace('text-', 'bg-') || 'bg-zinc-500')} />
               <span className="text-[7px] md:text-[8px] uppercase tracking-widest text-zinc-600">{cat}</span>
             </div>
           ))}
        </div>
      </div>
      <div className="p-2.5 md:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-x-4 md:gap-x-8 gap-y-4 md:gap-y-6">
        {Object.entries(categories).sort().map(([cat, metrics]) => {
          const Icon = icons[cat] || Settings;
          return (
            <div key={cat} className="space-y-2.5">
              <div className="flex items-center gap-2 pb-1.5 border-b border-white/5">
                <Icon size={12} className={colors[cat] || 'text-zinc-400'} />
                <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400">{cat}</span>
              </div>
              <div className="space-y-1.5">
                {metrics.sort().map(([name, val]) => (
                  <div key={name} className="flex justify-between items-center group">
                    <span className="text-[9px] text-zinc-500 truncate mr-2 group-hover:text-zinc-300 transition-colors" title={name}>
                      {name.replace('eg4_', '').replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-white px-1 py-0.5 rounded bg-white/[0.02] border border-white/[0.03]">
                      {val.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
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

      // 2. Fetch history for key metrics (last 48 hours)
      const now = Math.floor(Date.now() / 1000);
      const start = now - 48 * 3600;
      const step = '450s'; // 7.5-minute steps for 48 hours (4x resolution)

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
  const pv1Voltage = getVal(['eg4_vpv1', 'eg4_pv1_voltage']) || 0;
  const pv2Voltage = getVal(['eg4_vpv2', 'eg4_pv2_voltage']) || 0;
  const pvPower = pv1Power + pv2Power || getVal(['eg4_pv_power_watts', 'eg4_pv_watts', 'eg4_solar_power', 'eg4_ppv']) || 0;
  const loadPower = getVal(['eg4_seps', 'eg4_load_power_watts', 'eg4_load_watts', 'eg4_house_load', 'eg4_p_load']) || 0;
  const soc = getVal(['eg4_soc_percent', 'eg4_battery_soc', 'eg4_soc']) || 0;
  const invTemp = getVal(['eg4_tinner', 'eg4_temp_inv', 'eg4_inverter_temp']) || 0;
  const batTemp = getVal(['eg4_bmsmincelltemp', 'eg4_temp_bat', 'eg4_battery_temp']) || 0;
  const cycleCount = getVal(['eg4_bmscyclecnt', 'eg4_battery_cycles']) || 0;
  const vBat = getVal(['eg4_vbat', 'eg4_battery_voltage', 'eg4_v_bat']) || 0;
  const fEps = getVal(['eg4_feps', 'eg4_output_frequency', 'eg4_f_eps']) || 0;
  const cellDelta = (getVal(['eg4_bmsmaxcellvolt']) && getVal(['eg4_bmsmincellvolt'])) 
    ? (getVal(['eg4_bmsmaxcellvolt'])! - getVal(['eg4_bmsmincellvolt'])!) * 1000 
    : 0;
  const todayEnergy = (currentValues['eg4_epv1day'] || 0) + (currentValues['eg4_epv2day'] || 0);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans p-2 sm:p-5">
      <div className="max-w-7xl mx-auto space-y-2 md:space-y-4">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-3 pb-1">
          <div className="flex items-center gap-2 md:gap-6">
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
              <h1 className="text-2xl md:text-4xl font-light tracking-tight text-white mb-1 md:mb-2">
                Chateau Lake <span className="font-semibold text-zinc-400">Solar Telemetry</span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs font-mono text-zinc-500">
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
        </header>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400">
            <AlertCircle size={18} />
            <p className="text-xs">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col gap-1.5 md:gap-2">
          {/* Top Row: Power Flow */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="widget-card relative overflow-hidden flex flex-col"
          >
            {/* Power Flow Visualization */}
            <div className="flex-1 flex items-center justify-center p-1 md:p-5 relative z-10 overflow-hidden">
              <div className="w-full max-w-full overflow-x-auto no-scrollbar">
                <PowerFlow 
                  pvPower={pvPower} 
                  pv1Power={pv1Power} 
                  pv2Power={pv2Power} 
                  pv1Voltage={pv1Voltage}
                  pv2Voltage={pv2Voltage}
                  loadPower={loadPower} 
                  pCharge={pCharge} 
                  pDischarge={pDischarge} 
                  soc={soc}
                  invTemp={invTemp}
                  batTemp={batTemp}
                  cellDelta={cellDelta}
                  cycleCount={cycleCount}
                  vBat={vBat}
                  fEps={fEps}
                />
              </div>
            </div>

            {/* Header Area */}
            <div className="p-2.5 md:p-5 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-3 bg-[#050505]/40 backdrop-blur-sm relative z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Activity size={18} />
                </div>
                <div>
                  <h2 className="text-xs md:text-sm font-bold text-white uppercase tracking-widest">Live Power Flow</h2>
                  <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-tighter">Real-time distribution & conversion</p>
                </div>
              </div>
              <div className="flex gap-3 md:gap-4">
                <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-400">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500" />
                  <span>PV</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-400">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-cyan-500" />
                  <span>Load</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] uppercase tracking-widest text-zinc-400">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500" />
                  <span>Batt</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Middle Row: Historical Graph */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="widget-card h-[520px] md:h-[640px] relative overflow-hidden flex flex-col"
          >
            <div className="p-2.5 md:p-5 border-b border-white/5 flex items-center justify-between bg-[#050505]/20">
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-zinc-500">48H Power Distribution</span>
              <span className="text-[8px] md:text-[9px] text-zinc-600 font-mono">Step: 7.5m</span>
            </div>
            <div className="flex-1 p-2 md:p-5 opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a0a0a', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontFamily: 'monospace'
                    }}
                    itemStyle={{ padding: '2px 0' }}
                    labelFormatter={(label) => `Time: ${formatTime(label)}`}
                    formatter={(value: number, name: string) => [`${value.toFixed(0)} W`, name.replace('_', ' ').toUpperCase()]}
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
                  <Area 
                    type="stepAfter" 
                    dataKey="battery_power" 
                    stroke={colors.emerald} 
                    strokeWidth={2}
                    fillOpacity={0} 
                    dot={false}
                    name="Battery Power"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Bottom Row: Compact System Overview */}
          <SystemOverview 
            currentValues={currentValues} 
            soc={soc}
            vBat={vBat}
            invTemp={invTemp}
            cycleCount={cycleCount}
            fEps={fEps}
            timeUntilUpdate={timeUntilUpdate}
            loading={loading}
            onRefresh={() => {
              fetchData();
              setTimeUntilUpdate(REFRESH_INTERVAL);
            }}
          />
        </div>

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

