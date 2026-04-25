import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Video, 
  AlertTriangle, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Wifi, 
  WifiOff, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  CloudLightning,
  X 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useAuth } from '../App';
import { Camera, Alert } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const MetricCard = ({ title, value, unit, icon: Icon, trend, trendValue, color, description }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="glass-card p-5 glass-card-hover group relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
      <Icon size={80} />
    </div>
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={`p-2.5 rounded-xl bg-white/5`} style={{ color }}>
        <Icon size={20} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trendValue}
        </div>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 mb-1">{title}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-white tracking-tighter">{value}</span>
        {unit && <span className="text-xs text-slate-500 font-bold uppercase">{unit}</span>}
      </div>
      {description && <p className="text-[10px] text-slate-600 font-medium mt-2">{description}</p>}
    </div>
  </motion.div>
);

export default function Dashboard() {
  const { token, socket } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [networkPoints, setNetworkPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemData();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleTelemetry = (data: any) => {
      setNetworkPoints(prev => {
        const newPoints = [...prev, { name: data.timeLabel, value: data.throughput }];
        if (newPoints.length > 30) return newPoints.slice(newPoints.length - 30);
        return newPoints;
      });
    };

    const handleAlert = (alert: any) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
    };

    const handleCameraUpdate = (update: any) => {
      setCameras(prev => prev.map(c => c.id === parseInt(update.id) ? { ...c, ...update } : c));
    };

    socket.on("network_telemetry", handleTelemetry);
    socket.on("new_alert", handleAlert);
    socket.on("camera_update", handleCameraUpdate);

    return () => {
      socket.off("network_telemetry", handleTelemetry);
      socket.off("new_alert", handleAlert);
      socket.off("camera_update", handleCameraUpdate);
    };
  }, [socket]);

  const loadSystemData = async () => {
    try {
      const statusRes = await fetch('/api/system-status', { headers: { Authorization: `Bearer ${token}` } });
      const data = await statusRes.json();
      setCameras(data.cameras || []);
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Dashboard: Data synchronization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onlineCams = cameras.filter(c => c.status === 'online').length;
  const highSeverityAlerts = alerts.filter(a => a.severity === 'high' && !a.is_acknowledged).length;

  if (loading) return null;

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <h2 className="text-2xl font-bold tracking-tight text-white">Central Operations Interface</h2>
             <div className="bg-blue-600/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Zone Alpha-14</div>
          </div>
          <p className="text-xs text-slate-500 font-medium">Real-time heuristic analysis of industrial node topology</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-action border-white/5 hover:border-white/10 text-slate-400">
            <Activity size={14} className="inline mr-2" />
            Node Diagnostics
          </button>
          <button className="btn-action bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20 hover:bg-blue-500">
            Export Sector Log
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Imaging Nodes" 
          value={cameras.length} 
          unit="Active" 
          icon={Video} 
          color="#3b82f6" 
          trend="up" 
          trendValue={`${onlineCams} Synchronized`} 
          description="Visual acquisition matrix status"
        />
        <MetricCard 
          title="Network Fabric" 
          value="99.8" 
          unit="%" 
          icon={Wifi} 
          color="#10b981" 
          trend="up" 
          trendValue="Nominal" 
          description="System-wide backhaul integrity"
        />
        <MetricCard 
          title="Active Intrusion" 
          value={highSeverityAlerts} 
          unit="Alerts" 
          icon={ShieldAlert} 
          color="#f43f5e" 
          trend={highSeverityAlerts > 0 ? "up" : "down"}
          trendValue={highSeverityAlerts > 0 ? "Priority 1" : "No Threats"} 
          description="IDS heuristic event count"
        />
        <MetricCard 
          title="Vault Capacity" 
          value="14.2" 
          unit="TB" 
          icon={Clock} 
          color="#f59e0b" 
          trend="down" 
          trendValue="16% Left" 
          description="Cold-storage archival delta"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Telemetry Chart */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">System Throughput Telemetry</h3>
              <p className="text-[10px] text-slate-500 font-medium font-mono uppercase tracking-widest mt-1">Real-time packet flow - Interface Eth-0/14</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10B981]" />
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Heuristics Alive</span>
            </div>
          </div>
          
          <div className="flex-1 h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={networkPoints.length > 0 ? networkPoints : Array.from({length: 30}, (_, i) => ({name: '', value: 150 + Math.random() * 50}))}>
                  <defs>
                    <linearGradient id="dashboardGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis hide domain={[0, 500]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050507', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                    itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fill="url(#dashboardGradient)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
             </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
             {[
               { label: 'Egress', val: '24.1 Gbps', color: 'text-blue-500' },
               { label: 'Ingress', val: '18.4 Gbps', color: 'text-emerald-500' },
               { label: 'Peak', val: '42.8 Gbps', color: 'text-amber-500' },
               { label: 'Uptime', val: '142d 12h', color: 'text-slate-500' }
             ].map(i => (
               <div key={i.label} className="text-center">
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">{i.label}</p>
                  <p className={`text-[11px] font-mono font-bold ${i.color}`}>{i.val}</p>
               </div>
             ))}
          </div>
        </div>

        {/* Node Index */}
        <div className="glass-card flex flex-col p-6 overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Tactical Nodes</h3>
            <Link to="/cameras" className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400">Expand Library</Link>
          </div>
          
          <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar">
            {cameras.slice(0, 10).map((cam) => (
              <motion.div 
                whileHover={{ x: 4 }}
                key={cam.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:border-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                    cam.status === 'online' ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' : 'bg-rose-500/5 border-rose-500/10 text-rose-500'
                  }`}>
                    {cam.status === 'online' ? <CheckCircle2 size={16} /> : <X size={16} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{cam.name}</p>
                    <p className="text-[9px] text-slate-600 font-mono mt-0.5">{cam.ip_simulated}</p>
                  </div>
                </div>
                <div className="text-right">
                   <div className={`status-pulse ${cam.status === 'online' ? 'status-pulse-online' : 'status-pulse-offline'} inline-block`} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Incidents and Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6 flex flex-col min-h-[300px]">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
               <AlertTriangle size={16} className="text-amber-500" />
               Critical Incident Desk
             </h3>
             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{highSeverityAlerts} Unresolved</span>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence initial={false}>
              {alerts.slice(0, 4).map((alert) => (
                <motion.div 
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 relative overflow-hidden group"
                >
                  <div className={`absolute top-0 left-0 h-full w-1 ${
                    alert.severity === 'high' ? 'bg-rose-500/50' : 
                    alert.severity === 'medium' ? 'bg-amber-500/50' : 'bg-blue-500/50'
                  }`} />
                  <div className="pt-1">
                     <span className="text-[10px] font-mono text-slate-600 font-bold">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <span className={`badge-severity ${
                         alert.severity === 'high' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                         alert.severity === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                       }`}>
                         {alert.type}
                       </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed truncate">{alert.description}</p>
                  </div>
                  <button className="self-center p-2 hover:bg-white/5 rounded-lg text-slate-600 hover:text-white transition-colors">
                     <ArrowUpRight size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {alerts.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-12">
                 <ShieldCheck size={48} className="mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Vector Anomalies</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
           <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white mb-8">Intelligence Vectoring</h3>
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Protocol Sync</span>
                       <span className="text-[9px] font-bold text-emerald-500">OPTIMAL</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} className="h-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Storage Redundancy</span>
                       <span className="text-[9px] font-bold text-amber-500">LOW</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '18%' }} className="h-full bg-amber-500 shadow-[0_0_8px_#F59E0B]" />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">IDS Heuristics</span>
                       <span className="text-[9px] font-bold text-blue-500">ACTIVE</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                    </div>
                 </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-white/[0.02] rounded-2xl border border-white/5 p-6 text-center">
                 <div className="w-20 h-20 rounded-full border-2 border-dashed border-blue-500/30 flex items-center justify-center mb-4 relative">
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin-slow" />
                    <span className="text-xl font-bold text-white">99</span>
                 </div>
                 <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mb-1">Stability Score</p>
                 <p className="text-[8px] text-slate-600 font-medium">Aggregated site-wide integrity metric</p>
              </div>
           </div>
           
           <div className="mt-10 p-5 rounded-2xl bg-blue-600/5 border border-blue-500/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-xl bg-blue-600/10 text-blue-500">
                    <CloudLightning size={20} />
                 </div>
                 <div>
                    <p className="text-xs font-bold text-white uppercase tracking-tight">Weather Node Sync</p>
                    <p className="text-[9px] text-slate-500 font-medium">External environmental monitoring active</p>
                 </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400">22°C</span>
           </div>
        </div>
      </div>
    </div>
  );
}

