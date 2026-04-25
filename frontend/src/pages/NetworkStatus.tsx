import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  Server, 
  Zap, 
  Database,
  Globe,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useAuth } from '../App';
import { Camera } from '../types';
import { motion } from 'motion/react';

const MetricCard = ({ title, value, unit, icon: Icon, trend, trendValue, color }: any) => (
  <div className="glass-card p-5 glass-card-hover border-l-2 border-l-white/10" style={{ borderLeftColor: color }}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg bg-white/5 ${color ? `text-[${color}]` : 'text-blue-500'}`} style={{ color }}>
        <Icon size={18} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trendValue}
        </div>
      )}
    </div>
    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">{title}</p>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-slate-500 font-medium">{unit}</span>
    </div>
  </div>
);

export default function NetworkStatus() {
  const { token, socket } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [latencyData, setLatencyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCameras();
    
    // Generate initial latency data
    const initialData = Array.from({ length: 20 }, (_, i) => ({
      time: i,
      latency: 10 + Math.random() * 15,
      jitter: 2 + Math.random() * 5
    }));
    setLatencyData(initialData);

    const interval = setInterval(() => {
      setLatencyData(prev => {
        const newData = [...prev.slice(1), {
          time: prev[prev.length - 1].time + 1,
          latency: 10 + Math.random() * 15,
          jitter: 2 + Math.random() * 5
        }];
        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [token]);

  const fetchCameras = async () => {
    try {
      const res = await fetch('/api/cameras', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCameras(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onlineCount = cameras.filter(c => c.status === 'online').length;
  const offlineCount = cameras.filter(c => c.status === 'offline').length;
  const avgLatency = (latencyData.reduce((acc, curr) => acc + curr.latency, 0) / latencyData.length).toFixed(1);

  if (loading) return null;

  return (
    <div className="space-y-8 pb-10">
      <header>
         <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Network Matrix Analysis</h2>
         <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Node connectivity & Backhaul telemetry</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Cluster Latency" 
          value={avgLatency} 
          unit="ms" 
          icon={Zap} 
          trend="down" 
          trendValue="2.4%" 
          color="#3b82f6" 
        />
        <MetricCard 
          title="Packet Loss" 
          value="0.02" 
          unit="%" 
          icon={Activity} 
          trend="up" 
          trendValue="0.01%" 
          color="#10b981" 
        />
        <MetricCard 
          title="Connected Nodes" 
          value={onlineCount} 
          unit={`/ ${cameras.length}`} 
          icon={Wifi} 
          color="#f59e0b" 
        />
        <MetricCard 
          title="Storage Delta" 
          value="84" 
          unit="GB/h" 
          icon={Database} 
          trend="up" 
          trendValue="12%" 
          color="#f43f5e" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Backhaul Latency Real-time</h3>
              <p className="text-[10px] text-slate-500 font-medium">Millisecond response time across core switch fabric</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500/30"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jitter</span>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 40]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d0d0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '10px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="latency" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={2} />
                <Area type="monotone" dataKey="jitter" stroke="#3b82f6" strokeOpacity={0.2} fill="transparent" strokeWidth={1} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card flex flex-col p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-6">Zone Health Index</h3>
          <div className="flex-1 space-y-6">
            {['Zone A-14', 'Zone B-02', 'Zone C-Server', 'Zone D-Logistics'].map((zone, idx) => {
              const status = idx === 1 ? 'warning' : 'healthy';
              return (
                <div key={zone} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{zone}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${status === 'healthy' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {status === 'healthy' ? 'Nominal' : 'Congested'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: status === 'healthy' ? '92%' : '45%' }}
                      className={`h-full ${status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-amber-500 shadow-[0_0_8px_#F59E0B]'}`}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-600 font-mono">
                    <span>{status === 'healthy' ? '1.2 GB/s' : '450 MB/s'}</span>
                    <span>{status === 'healthy' ? '0% LOSS' : '1.2% LOSS'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 pt-6 border-t border-white/5">
             <button className="w-full btn-action border-blue-500/20 text-blue-500 hover:bg-blue-600 hover:text-white">Run Global Diagnostics</button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-6">Node Connectivity Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
           {cameras.map(cam => (
             <div key={cam.id} className="p-3 rounded-lg bg-white/2 border border-white/5 flex flex-col items-center gap-2 group hover:bg-white/5 transition-all">
                <div className={`p-2 rounded flex items-center justify-center ${cam.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                   {cam.status === 'online' ? <Wifi size={14} /> : <WifiOff size={14} />}
                </div>
                <span className="text-[8px] font-bold uppercase text-slate-500 truncate w-full text-center">{cam.name}</span>
                <div className={`h-1 w-full rounded-full ${cam.status === 'online' ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} />
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
