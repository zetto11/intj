import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { AccessLog } from '../types';
import { 
  FileText, 
  History, 
  Search, 
  Download, 
  Calendar,
  User as UserIcon,
  Video,
  Clock,
  Eye,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Logs() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.camera_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return null;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
             <History className="text-white" size={24} />
           </div>
           <div>
             <h2 className="text-2xl font-bold tracking-tight text-white mb-1">System Audit Ledger</h2>
             <p className="text-xs text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                Immutable trace of all node interactions
             </p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <button className="btn-action bg-white/[0.02] border-white/5 hover:bg-white/[0.05] flex items-center gap-2 text-white px-6">
             <Download size={16} />
             <span>Export Dataset</span>
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <Search size={14} className="text-blue-500" />
              Node Filtration
            </h4>
            <div className="space-y-6">
               <div>
                  <label className="text-[9px] uppercase font-black text-slate-700 block mb-2 tracking-[0.2em]">Target Entity</label>
                  <input 
                    type="text" 
                    placeholder="Reference fragment..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-soc w-full h-11 px-4 bg-transparent border-white/5 text-[11px] uppercase tracking-widest placeholder:text-slate-800"
                  />
               </div>
               <div>
                  <label className="text-[9px] uppercase font-black text-slate-700 block mb-2 tracking-[0.2em]">Temporal Bound</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors" size={14} />
                    <input 
                      type="text" 
                      value="Cycle: 24h Sliding" 
                      readOnly
                      className="input-soc w-full h-11 pl-12 bg-transparent border-white/5 text-[11px] uppercase tracking-widest text-slate-500 cursor-help"
                    />
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-blue-600/[0.03] border border-blue-600/10 rounded-2xl p-6 relative overflow-hidden group">
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <ShieldAlert size={100} />
             </div>
             <div className="flex items-center gap-3 mb-4 relative z-10">
                <ShieldAlert size={18} className="text-blue-500" />
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Governance</h4>
             </div>
             <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest relative z-10 italic">
               Protocol TRACE-9 enabled. All transactions cryptographically anchored to kernel-time.
             </p>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredLogs.map((log) => (
                <motion.div 
                  key={log.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="glass-card p-4 flex items-center justify-between hover:border-white/10 group transition-all duration-300 cursor-pointer bg-white/[0.01]"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg ${
                      log.action.includes('BLOCK') ? 'bg-rose-500/10 text-rose-500 shadow-rose-500/10 border border-rose-500/20' : 
                      log.action.includes('VIEW') ? 'bg-blue-500/10 text-blue-500 shadow-blue-500/10 border border-blue-500/20' :
                      log.action.includes('ACKNOWLEDGE') ? 'bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10 border border-emerald-500/20' :
                      'bg-slate-500/10 text-slate-500 shadow-slate-500/5 border border-slate-500/10'
                    }`}>
                      {log.action.includes('VIEW') ? <Eye size={20} /> : log.action.includes('BLOCK') ? <ShieldAlert size={20} /> : <FileText size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-4">
                         <span className="text-xs font-black text-white uppercase tracking-tight group-hover:text-blue-500 transition-colors">{log.action.replace('_', ' ')}</span>
                         <span className="text-[9px] text-slate-700 font-black uppercase tracking-[0.2em] px-2 py-1 bg-white/[0.03] rounded-lg border border-white/5">AUTH: {log.username}</span>
                      </div>
                      <div className="flex items-center gap-6 mt-2 opacity-60">
                         <div className="flex items-center text-[10px] text-slate-400 uppercase font-black tracking-widest">
                            <Video size={12} className="mr-2 text-blue-500" />
                            {log.camera_name || 'KERNELS_HUB'}
                         </div>
                         <div className="flex items-center text-[10px] text-slate-400 uppercase font-mono tracking-[0.1em]">
                            <Clock size={12} className="mr-2 text-slate-600" />
                            {new Date(log.timestamp).toLocaleTimeString()}
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-[9px] font-mono text-slate-800 font-bold uppercase tracking-widest hidden md:block">TX-HASH: 0x{log.id.toString(16).toUpperCase()}</span>
                    <button className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-white transition-all bg-white/5 rounded-xl border border-white/10">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {filteredLogs.length === 0 && (
              <div className="py-32 flex flex-col items-center justify-center opacity-10 text-center">
                <History size={64} className="mb-6" />
                <h3 className="text-xl font-black uppercase tracking-[0.5em]">Ledger Void</h3>
                <p className="text-xs uppercase tracking-widest mt-2">No transactions identified in current search space</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
