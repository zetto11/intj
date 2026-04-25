import React from 'react';
import { 
  BarChart3, 
  BrainCircuit, 
  TrendingUp, 
  AlertOctagon, 
  Search, 
  Cpu,
  Fingerprint,
  Zap,
  ChevronRight
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { motion } from 'motion/react';

const behavioralData = [
  { subject: 'Zone A', A: 120, B: 110, fullMark: 150 },
  { subject: 'Zone B', A: 98, B: 130, fullMark: 150 },
  { subject: 'Zone C', A: 86, B: 130, fullMark: 150 },
  { subject: 'Zone D', A: 99, B: 100, fullMark: 150 },
  { subject: 'Zone E', A: 85, B: 90, fullMark: 150 },
  { subject: 'Zone F', A: 65, B: 85, fullMark: 150 },
];

const scatterData = [
  { x: 10, y: 30, z: 200 },
  { x: 12, y: 40, z: 260 },
  { x: 15, y: 20, z: 400 },
  { x: 20, y: 50, z: 500 },
  { x: 25, y: 60, z: 300 },
  { x: 30, y: 30, z: 200 },
  { x: 40, y: 80, z: 100 },
];

export default function AnomalyDetection() {
  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
             <BrainCircuit className="text-white" size={24} />
           </div>
           <div>
             <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Heuristic Intelligence Engine</h2>
             <p className="text-xs text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981] animate-pulse" />
                Zone Analysis / Neural Correlation Profile Active
             </p>
           </div>
        </div>
        <div className="flex gap-4">
           <button className="btn-action">Retrain Model</button>
           <button className="btn-action bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20 hover:bg-blue-500">Global Scan</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Spatio-Temporal Density</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Real-time zone activity vectors</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest animate-pulse">Live Inference</span>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={behavioralData}>
                <PolarGrid stroke="#26262B" strokeOpacity={0.5} />
                <PolarAngleAxis dataKey="subject" stroke="#4b5563" fontSize={10} fontWeight={700} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} hide />
                <Radar name="Baseline" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} strokeWidth={1} />
                <Radar name="Active" dataKey="B" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(5, 5, 7, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', color: '#fff', fontSize: '10px', borderRadius: '12px' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-8 flex flex-col justify-between">
           <div>
              <div className="mb-10">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Event Correlation Clusters</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Statistical anomaly grouping</p>
              </div>
              <div className="h-[250px] mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#26262B" vertical={false} opacity={0.3} />
                    <XAxis type="number" dataKey="x" hide />
                    <YAxis type="number" dataKey="y" hide />
                    <ZAxis type="number" dataKey="z" range={[50, 600]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(5, 5, 7, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px' }} />
                    <Scatter name="Anomalies" data={scatterData} fill="#ef4444" fillOpacity={0.5} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/5">
              {[
                { label: 'Inference Precision', value: '94.2%', icon: Cpu, color: 'text-blue-500' },
                { label: 'Heuristic Drift', value: '0.04%', icon: Zap, color: 'text-amber-500' }
              ].map((m, i) => (
                <div key={i} className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl group hover:border-white/10 transition-colors">
                   <div className="flex items-center gap-3 text-slate-500 mb-2">
                     <div className="p-2 bg-black/40 rounded-lg group-hover:text-white transition-colors">
                        <m.icon size={14} className={m.color} />
                     </div>
                     <span className="text-[9px] font-black uppercase tracking-[0.2em]">{m.label}</span>
                   </div>
                   <div className="text-2xl font-black text-white tracking-widest font-mono">{m.value}</div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Motion Vector Delta", desc: "Abnormal directional velocity detected in Sector 4", status: "Tracking", severity: "medium" },
          { title: "Node Payload Spike", desc: "Unusual data throughput detected on Node-12", status: "Verified", severity: "low" },
          { title: "MAC Spoofing Attempt", desc: "Impersonation protocol identified on VLAN 20", status: "Blocked", severity: "high" }
        ].map((anomaly, i) => (
          <motion.div 
            key={i} 
            whileHover={{ y: -4 }}
            className="glass-card p-6 group cursor-pointer border-white/5 hover:border-white/10 bg-white/[0.01]"
          >
             <div className={`w-12 h-12 rounded-2xl mb-6 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
               anomaly.severity === 'high' ? 'bg-rose-500/10 text-rose-500 shadow-rose-500/10 border border-rose-500/20' : 
               anomaly.severity === 'medium' ? 'bg-blue-500/10 text-blue-500 shadow-blue-500/10 border border-blue-500/20' :
               'bg-slate-500/10 text-slate-700 shadow-slate-500/5 border border-slate-500/10'
             }`}>
               <AlertOctagon size={24} />
             </div>
             <h4 className="text-sm font-black text-white uppercase tracking-tight mb-3 group-hover:text-blue-500 transition-colors">{anomaly.title}</h4>
             <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-8 uppercase tracking-widest">{anomaly.desc}</p>
             <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg ${
                   anomaly.status === 'Blocked' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-black/40 text-slate-600 border border-white/5'
                }`}>{anomaly.status}</span>
                <div className="text-[10px] text-slate-700 font-black uppercase flex items-center gap-2 group-hover:text-white transition-colors tracking-widest">
                   Vector Case <ChevronRight size={14} />
                </div>
             </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

