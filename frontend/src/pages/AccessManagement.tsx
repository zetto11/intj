import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { User as UserType, Shield, UserPlus, Trash2, Key, Users as UsersIcon, Search, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { motion } from 'motion/react';

export default function AccessManagement() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
             <Shield className="text-white" size={24} />
           </div>
           <div>
             <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Credential Authority</h2>
             <p className="text-xs text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                Global personnel hierarchy management Active
             </p>
           </div>
        </div>
        <button className="btn-action bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20 hover:bg-blue-500 flex items-center gap-2 px-6">
          <UserPlus size={16} />
          <span>Provision Node Access</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="glass-card overflow-hidden bg-brand-bg/50 backdrop-blur-2xl">
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
               <div className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <UsersIcon size={16} className="text-blue-500" />
                  <span>Authorized Operators</span>
               </div>
               <div className="relative group">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-500 transition-colors" />
                  <input type="text" placeholder="FILTER..." className="input-soc w-48 h-10 pl-10 pr-4 bg-transparent border-white/5 text-[10px] font-black tracking-widest" />
               </div>
            </div>
            
            <div className="divide-y divide-white/5">
               {users.map((user) => (
                 <motion.div 
                    layout
                    key={user.id} 
                    className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all group cursor-pointer"
                 >
                    <div className="flex items-center gap-6">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-110 transition-transform ${
                         user.role === 'admin' ? 'bg-blue-600/10 text-blue-400 shadow-blue-500/10 border border-blue-600/20' : 'bg-white/[0.03] text-slate-600 border border-white/5'
                       }`}>
                         {user.username[0].toUpperCase()}
                       </div>
                       <div>
                          <p className="text-sm font-black text-white uppercase tracking-tight group-hover:text-blue-500 transition-colors">{user.username}</p>
                          <div className="flex items-center gap-4 mt-1.5">
                             <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                               user.role === 'admin' ? 'bg-blue-600/10 text-blue-400 border-blue-600/20' : 'bg-black/40 text-slate-700 border-white/5'
                             }`}>
                               LEVEL: {user.role.toUpperCase()}
                             </span>
                             <span className="text-[10px] text-slate-800 font-mono font-bold tracking-widest">0x{user.id.toString(16).toUpperCase()}</span>
                          </div>
                       </div>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                       <button className="p-3 text-slate-600 hover:text-white bg-white/5 rounded-xl border border-white/10 hover:bg-blue-600/20 hover:border-blue-500/30 transition-all"><Key size={16} /></button>
                       <button className="p-3 text-slate-600 hover:text-rose-500 bg-white/5 rounded-xl border border-white/10 hover:bg-rose-500/20 hover:border-rose-500/30 transition-all"><Trash2 size={16} /></button>
                    </div>
                 </motion.div>
               ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="glass-card p-8">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                <ShieldCheck className="text-emerald-500" size={16} />
                Security Directives
              </h3>
              <div className="space-y-6">
                 {[
                   { label: 'Remote Node Control', enabled: true },
                   { label: 'Live Data Inspection', enabled: true },
                   { label: 'Audit Export Policy', enabled: false },
                   { label: 'System Lockdown', enabled: true }
                 ].map((p, i) => (
                   <div key={i} className="flex items-center justify-between group">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">{p.label}</span>
                      <div className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${p.enabled ? 'bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-900 border border-white/5'}`}>
                         <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${p.enabled ? 'left-6' : 'left-1 opacity-20'}`} />
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-blue-600/[0.03] border border-blue-600/10 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                 <Shield size={120} />
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-tight mb-4 relative z-10">Clearance Notice</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest relative z-10 italic">
                Operational status: Administrative Override active. Metadata capture protocol initialized for all hierarchy changes.
              </p>
              <div className="mt-8 pt-8 border-t border-blue-600/10 flex items-center gap-3 text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] relative z-10">
                <ShieldCheck size={16} />
                Sector-A Root Privileges
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
