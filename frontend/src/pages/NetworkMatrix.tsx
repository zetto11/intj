import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, 
  Cpu, 
  Globe, 
  Activity, 
  Zap, 
  ShieldCheck, 
  Signal, 
  Server,
  RefreshCw,
  Search,
  Filter,
  BarChart2
} from 'lucide-react';
import { useAuth } from '../App';
import { Camera, AccessPoint } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

const NodeCell: React.FC<{ node: any, type: string }> = ({ node, type }) => {
  const isOnline = node.status === 'online';
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(() => {
        setPulse(true);
        setTimeout(() => setPulse(false), 2000);
      }, 3000 + Math.random() * 5000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
      className={`relative p-3 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-2 transition-all cursor-default group overflow-hidden`}
    >
      {/* Background Pulse */}
      {isOnline && pulse && (
        <motion.div 
          initial={{ opacity: 0.5, scale: 0.5 }}
          animate={{ opacity: 0, scale: 2 }}
          className="absolute inset-0 bg-blue-500/20 rounded-full"
        />
      )}

      {/* Connection Line decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-1 bg-white/10" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-1 bg-white/10" />
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-px bg-white/10" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-px bg-white/10" />

      <div className={`p-1.5 rounded-md ${isOnline ? 'text-blue-400 bg-blue-500/10' : 'text-rose-500 bg-rose-500/10'}`}>
        {type === 'cam' ? <Signal size={14} /> : <Network size={14} />}
      </div>
      
      <div className="text-center w-full">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 truncate mb-1">
          {node.name}
        </p>
        <div className="flex items-center justify-center gap-1">
          <div className={`w-1 h-1 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_5px_#10B981]' : 'bg-rose-500 shadow-[0_0_5px_#F43F5E]'}`} />
          <span className={`text-[7px] font-mono ${isOnline ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isOnline ? 'LOCKED' : 'LINK LOST'}
          </span>
        </div>
      </div>

      {/* Hover Info */}
      <div className="absolute inset-0 bg-brand-bg/95 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
        <p className="text-[7px] font-mono text-slate-500 mb-1">{node.ip_simulated || '10.0.0.' + node.id}</p>
        <p className="text-[6px] text-blue-400 font-bold uppercase tracking-widest">MTU 1500</p>
        <p className="text-[6px] text-slate-600 mt-1">LATENCY: {isOnline ? '12ms' : 'N/A'}</p>
      </div>
    </motion.div>
  );
};

export default function NetworkMatrix() {
  const { token } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [packets, setPackets] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [camRes, apRes] = await Promise.all([
          fetch('/api/cameras', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/access-points', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const [camData, apData] = await Promise.all([camRes.json(), apRes.json()]);
        setCameras(Array.isArray(camData) ? camData : []);
        setAccessPoints(Array.isArray(apData) ? apData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Packet Simulation
    const interval = setInterval(() => {
      const protocols = ['TCP', 'UDP', 'ICMP', 'HTTP/S', 'RTSP', 'MQTT'];
      const actions = ['PUSH', 'ACK', 'SYN', 'GET', 'STREAM', 'AUTH'];
      const newPacket = {
        id: Math.random().toString(36).substr(2, 9),
        protocol: protocols[Math.floor(Math.random() * protocols.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        size: Math.floor(Math.random() * 1400) + 64,
        dest: 'NODE-' + Math.floor(Math.random() * 20),
        time: new Date().toLocaleTimeString(),
      };
      setPackets(prev => [newPacket, ...prev.slice(0, 7)]);
    }, 1500);

    return () => clearInterval(interval);
  }, [token]);

  const filteredNodes = useMemo(() => {
    const all = [
      ...cameras.map(c => ({ ...c, type: 'cam' as const })),
      ...accessPoints.map(a => ({ ...a, type: 'ap' as const }))
    ];
    if (!searchTerm) return all;
    return all.filter(n => n.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [cameras, accessPoints, searchTerm]);

  const stats = useMemo(() => {
    const online = filteredNodes.filter(n => n.status === 'online').length;
    return {
      online,
      total: filteredNodes.length,
      perc: ((online / filteredNodes.length) * 100).toFixed(1)
    };
  }, [filteredNodes]);

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      time: i + ':00',
      load: 30 + Math.random() * 50,
      overhead: 10 + Math.random() * 20
    }));
  }, []);

  if (loading) return null;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-black tracking-tighter text-white mb-1 flex items-center gap-3">
             <div className="p-1 px-2 border border-blue-500/20 bg-blue-500/10 rounded text-blue-500 text-xs">SYS:04</div>
             NETWORK TOPOLOGY MATRIX
           </h2>
           <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">Subnet 10.0.0.0/24 | Encrypted Backhaul Protocol</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
            <input 
              type="text" 
              placeholder="LOCATE NODE ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/[0.02] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-bold text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/30 transition-all w-64 uppercase tracking-widest"
            />
          </div>
          <button className="p-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-slate-500 transition-colors">
            <Filter size={16} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Statistics Column */}
        <div className="space-y-6">
          <div className="glass-card p-6 border-l-2 border-l-blue-500">
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin-slow" />
              Real-time Synthesis
            </p>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-black text-white">{stats.perc}%</span>
                  <span className="text-[10px] font-bold text-blue-500 mb-1">STABLE</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.perc}%` }}
                    className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                </div>
                <p className="text-[8px] text-slate-600 mt-2 font-mono uppercase tracking-widest">Aggregate Node Integrity</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <p className="text-xl font-black text-white">{stats.online}</p>
                  <p className="text-[8px] text-slate-600 uppercase font-bold tracking-widest">Nodes Active</p>
                </div>
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <p className="text-xl font-black text-rose-500">{stats.total - stats.online}</p>
                  <p className="text-[8px] text-slate-600 uppercase font-bold tracking-widest">Link Lost</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-6">Traffic Inspector</h3>
             <div className="space-y-4 font-mono">
               <AnimatePresence initial={false}>
                 {packets.map((p) => (
                   <motion.div 
                     key={p.id}
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="text-[9px] flex items-center justify-between border-l border-white/10 pl-3 leading-none py-1 group hover:border-blue-500/50 transition-colors"
                   >
                     <div className="flex flex-col">
                       <span className="text-blue-400 font-bold">{p.protocol}::{p.action}</span>
                       <span className="text-slate-600 text-[7px] mt-0.5">{p.dest} ({p.size}b)</span>
                     </div>
                     <span className="text-slate-700 group-hover:text-slate-500">{p.time}</span>
                   </motion.div>
                 ))}
               </AnimatePresence>
             </div>
             <div className="mt-6 pt-4 border-t border-white/5 flex justify-center">
               <span className="text-[7px] text-slate-600 uppercase tracking-[0.3em] animate-pulse">Scanning Port 80...</span>
             </div>
          </div>
        </div>

        {/* Matrix Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-8 min-h-[500px]">
             <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-6">
                 <div>
                   <h3 className="text-sm font-black uppercase tracking-wider text-white">Topological Matrix View</h3>
                   <p className="text-[10px] text-slate-500 font-medium">Node distribution across Layer-2 Switch Fabric</p>
                 </div>
                 <div className="h-8 w-px bg-white/5 ml-4" />
                 <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded bg-blue-500"></div>
                       <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Active Link</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded bg-rose-500"></div>
                       <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Dropped</span>
                    </div>
                 </div>
               </div>
               
               <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500 text-[10px] font-black uppercase tracking-widest animate-flicker">
                 LIVE TELEMETRY
               </div>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredNodes.map(node => (
                  <NodeCell key={node.id} node={node} type={node.type} />
                ))}
                
                {/* Empty slots to fill matrix and look techy */}
                {Array.from({ length: Math.max(0, 18 - filteredNodes.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-3 rounded-xl border border-dashed border-white/5 bg-transparent flex flex-col items-center justify-center opacity-20">
                    <div className="p-1.5 rounded-md text-slate-700">
                      <Cpu size={14} />
                    </div>
                    <div className="text-center w-full mt-2">
                      <div className="h-1 w-8 bg-white/10 rounded-full mx-auto" />
                    </div>
                  </div>
                ))}
             </div>

             <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-white/5 pt-8">
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                     <Zap size={12} className="text-blue-500" />
                     Backhaul Load
                   </p>
                   <div className="h-[120px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                         <defs>
                           <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <Area type="monotone" dataKey="load" stroke="#3b82f6" fill="url(#colorLoad)" strokeWidth={2} />
                         <Area type="monotone" dataKey="overhead" stroke="#10b981" fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                <div className="md:col-span-2 flex flex-col justify-center">
                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      {[
                        { label: 'Latency (Avg)', value: '14.2ms', sub: '±2ms Jitter', icon: Activity, color: 'text-blue-500' },
                        { label: 'Uptime', value: '99.98%', sub: 'Last 7 Days', icon: ShieldCheck, color: 'text-emerald-500' },
                        { label: 'Throughput', value: '4.8 Gbps', sub: '82% of Bandwidth', icon: Server, color: 'text-amber-500' },
                        { label: 'Global Sink', value: 'Online', sub: 'Master DC-1', icon: Globe, color: 'text-blue-500' }
                      ].map((stat, i) => (
                        <div key={i} className="space-y-1">
                           <stat.icon size={14} className={`${stat.color} mb-2`} />
                           <p className="text-[10px] font-black uppercase tracking-widest text-white">{stat.value}</p>
                           <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">{stat.label}</p>
                           <p className="text-[7px] font-medium text-slate-700">{stat.sub}</p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
