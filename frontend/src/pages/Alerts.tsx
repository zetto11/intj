import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Alert } from '../types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  Filter,
  Search,
  ChevronRight,
  MoreVertical,
  Activity,
  Info,
  X,
  Target,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Alerts() {
  const { token, user, socket } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  useEffect(() => {
    fetchAlerts();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = (newAlert: Alert) => {
      // Add new alert to the start of the list
      setAlerts(prev => {
        // Prevent duplicates if fetching and socket collide
        const exists = prev.some(a => a.id === newAlert.id);
        if (exists) return prev;
        return [newAlert, ...prev];
      });
    };

    socket.on('new_alert', handleNewAlert);
    return () => {
      socket.off('new_alert', handleNewAlert);
    };
  }, [socket]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (id: number) => {
    try {
      const res = await fetch(`/api/alerts/${id}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_acknowledged: true } : a));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const acknowledgeAll = async () => {
    if (!window.confirm("Acknowledge all active alerts?")) return;
    try {
      const res = await fetch('/api/alerts/acknowledge-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAlerts(prev => prev.map(a => ({ ...a, is_acknowledged: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.severity === filter);

  if (loading) return null;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Security Intelligence Ledger</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
             Incident tracking node | Active: {alerts.filter(a => !a.is_acknowledged).length}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           {alerts.some(a => a.severity === 'high' && !a.is_acknowledged) && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-3 text-[10px] bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl text-rose-500 font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(244,63,94,0.1)]"
              >
                <ShieldAlert size={16} className="animate-pulse" />
                CRITICAL THREAT VECTORS DETECTED
              </motion.div>
           )}
           {user?.role === 'admin' && alerts.some(a => !a.is_acknowledged) && (
              <button 
                onClick={acknowledgeAll}
                className="btn-action bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
              >
                Clear All Logs
              </button>
           )}
           <button className="btn-action">Purge Database</button>
        </div>
      </header>

      <div className="glass-card overflow-hidden bg-brand-bg/50 backdrop-blur-2xl">
        <div className="p-4 border-b border-white/5 flex flex-col lg:flex-row gap-6 items-center justify-between bg-white/[0.02]">
             <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 overflow-hidden">
                {['all', 'high', 'medium', 'low'].map((f) => (
                  <button
                   key={f}
                   onClick={() => setFilter(f as any)}
                   className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                     filter === f 
                       ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                       : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
                   }`}
                  >
                    {f}
                  </button>
                ))}
             </div>
             
             <div className="relative w-full lg:w-72 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="FILTER BY INCIDENT HASH..." 
                  className="input-soc w-full h-12 pl-12 bg-black/20 border-white/5 rounded-xl uppercase tracking-widest font-black text-[10px]"
                />
             </div>
        </div>

        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white/[0.01]">
                <th className="px-8 py-5 text-[9px] uppercase tracking-[0.3em] text-slate-600 font-black border-b border-white/5">Link Status</th>
                <th className="px-8 py-5 text-[9px] uppercase tracking-[0.3em] text-slate-600 font-black border-b border-white/5">Vector Type</th>
                <th className="px-8 py-5 text-[9px] uppercase tracking-[0.3em] text-slate-600 font-black border-b border-white/5">Clearance</th>
                <th className="px-8 py-5 text-[9px] uppercase tracking-[0.3em] text-slate-600 font-black border-b border-white/5">Dossier Narrative</th>
                <th className="px-8 py-5 text-[9px] uppercase tracking-[0.3em] text-slate-600 font-black border-b border-white/5 text-right">Time Index</th>
                <th className="px-8 py-5 text-[9px] uppercase tracking-[0.3em] text-slate-600 font-black border-b border-white/5 text-right">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              <AnimatePresence mode="popLayout">
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map((alert) => (
                    <motion.tr 
                      key={alert.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ 
                        opacity: { duration: 0.3 },
                        x: { type: "spring", stiffness: 400, damping: 30 }
                      }}
                      className={`group cursor-pointer hover:bg-white/[0.02] transition-all duration-300 ${alert.is_acknowledged ? 'opacity-40 grayscale-[0.5]' : ''}`}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <td className="px-8 py-5">
                        <div className={`flex items-center gap-3 ${alert.is_acknowledged ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {alert.is_acknowledged ? <CheckCircle2 size={16} /> : <Activity size={16} className="animate-pulse" />}
                           <span className="text-[10px] font-black uppercase tracking-[0.15em]">{alert.is_acknowledged ? 'VERIFIED' : 'ACTIVE'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="font-mono text-[11px] text-blue-500 font-bold tracking-widest">{alert.type}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          alert.severity === 'high' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                          alert.severity === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }`}>
                          {alert.severity}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs text-slate-300 font-medium max-w-sm truncate group-hover:text-white transition-colors uppercase tracking-[0.05em]">{alert.description}</p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="text-[10px] text-slate-500 font-mono font-bold">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {!alert.is_acknowledged ? (
                           <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              acknowledgeAlert(alert.id);
                            }}
                            className="btn-action text-[9px] font-black uppercase tracking-widest border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white"
                           >
                             Clear Vector
                           </button>
                        ) : (
                          <div className="flex justify-end pr-3">
                             <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight size={14} className="text-slate-700" />
                             </div>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                       <div className="flex flex-col items-center opacity-20">
                          <CheckCircle2 size={40} className="mb-4" />
                          <h3 className="text-lg font-black uppercase tracking-[0.4em]">Grid Status: Optimal</h3>
                          <p className="text-[10px] uppercase tracking-widest mt-2 font-bold">INTEGRITY VERIFIED | NO THREATS RETRIEVED</p>
                       </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {selectedAlert && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedAlert(null)}
               className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-3xl glass-card overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] bg-brand-bg rounded-[2.5rem] border-white/10"
            >
              {/* Tactical Grid Background */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                 <div className="grid grid-cols-12 h-full w-full">
                    {Array.from({length: 12}).map((_, i) => <div key={i} className="border-r border-white/50" />)}
                 </div>
              </div>

              {/* Status Header Bar */}
              <div className={`h-1.5 w-full ${
                selectedAlert.severity === 'high' ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' :
                selectedAlert.severity === 'medium' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' :
                'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
              }`} />

              <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] relative">
                <div className="flex items-center gap-6">
                  <div className={`p-4 rounded-2xl shadow-xl ${
                    selectedAlert.severity === 'high' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' :
                    selectedAlert.severity === 'medium' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                    'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                  }`}>
                    <ShieldAlert size={28} className={selectedAlert.severity === 'high' ? 'animate-pulse' : ''} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-black uppercase tracking-[0.25em] text-white">Incident Dossier</h3>
                      <span className="px-2 py-0.5 rounded text-[8px] font-black bg-white/5 border border-white/10 text-slate-500 tracking-[0.2em]">v1.0.42</span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-[0.2em] flex items-center gap-3">
                       <span className="text-blue-500">VECTOR_{selectedAlert.id.toString().padStart(4, '0')}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-800" />
                       <span>HASH: {Math.random().toString(16).slice(2, 10).toUpperCase()}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedAlert(null)}
                  className="p-3.5 hover:bg-white/5 rounded-2xl text-slate-600 hover:text-white transition-all border border-transparent hover:border-white/10 group"
                >
                  <X size={24} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              <div className="p-10 space-y-10 relative">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-12 space-y-4">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
                       <Activity size={12} className="text-blue-500" />
                       Narrative Analysis
                    </div>
                    <div className="p-8 rounded-3xl bg-black/40 border border-white/5 shadow-inner relative group overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-blue-600/30" />
                       <p className="text-lg font-bold text-white leading-relaxed tracking-tight relative z-10">{selectedAlert.description}</p>
                       <p className="mt-6 text-[11px] text-slate-500 leading-relaxed font-medium uppercase tracking-widest bg-white/[0.02] p-4 rounded-xl border border-white/5 group-hover:text-slate-400 transition-colors">
                          "{selectedAlert.explanation || 'Protocol AI identifies no supplementary metadata for this incident vector. Manual audit suggested.'}"
                       </p>
                    </div>
                  </div>

                  <div className="lg:col-span-6 space-y-6">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
                       <Clock size={12} className="text-emerald-500" />
                       Temporal Dynamics
                    </div>
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                       <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Acquisition</span>
                          <span className="text-[11px] font-mono font-bold text-white">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Drift / Offset</span>
                          <span className="text-[11px] font-mono font-bold text-emerald-500">+1.24ms (SYNC)</span>
                       </div>
                       <div className="flex justify-between items-center py-2">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Event Chain ID</span>
                          <span className="text-[11px] font-mono font-bold text-blue-500">TX_{Math.random().toString(36).slice(2, 8).toUpperCase()}</span>
                       </div>
                    </div>
                  </div>

                  <div className="lg:col-span-6 space-y-6">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
                       <Target size={12} className="text-rose-500" />
                       Target Topology
                    </div>
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                       <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Node Identity</span>
                          <span className="text-[11px] font-mono font-bold text-white">{selectedAlert.affected_entity || 'SYSTEM_CORE'}</span>
                       </div>
                       <div className="flex justify-between items-center py-2 border-b border-white/5">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Risk Factor</span>
                          <span className={`text-[11px] font-mono font-bold ${
                            selectedAlert.severity === 'high' ? 'text-rose-500' : 'text-blue-500'
                          }`}>{(Math.random() * 0.9 + 0.1).toFixed(2)} [SIGMA]</span>
                       </div>
                       <div className="flex justify-between items-center py-2">
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Clearance Req</span>
                          <span className="text-[11px] font-mono font-bold text-slate-300">LEVEL_03</span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="pt-10 flex justify-between items-center gap-10 border-t border-white/5">
                  <div className="flex items-center gap-4 group cursor-help">
                     <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Info size={16} className="text-blue-500 group-hover:text-inherit" />
                     </div>
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] group-hover:text-slate-400 transition-colors">Protocol A-42 Directive Active</span>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setSelectedAlert(null)}
                      className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 hover:text-white transition-colors py-3 px-6"
                    >
                      Escape Ledger
                    </button>
                    {!selectedAlert.is_acknowledged && (
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgeAlert(selectedAlert.id);
                          setSelectedAlert(prev => prev ? { ...prev, is_acknowledged: true } : null);
                        }}
                        className="px-12 py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(37,99,235,0.2)] hover:shadow-[0_20px_60px_rgba(37,99,235,0.4)] transition-all flex items-center gap-4"
                      >
                        <ShieldCheck size={18} />
                        <span>Acknowledge & Finalize</span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

