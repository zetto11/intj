import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, User as UserIcon, Loader2, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'operator' | 'viewer'>('viewer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const navigate = useNavigate();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setBackendStatus('online');
        else setBackendStatus('offline');
      } catch (err) {
        setBackendStatus('offline');
      }
    };
    checkHealth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 relative overflow-hidden font-inter">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.05, 0.08, 0.05]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-emerald-600 rounded-full blur-[120px]" 
        />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="inline-flex p-4 bg-emerald-600 rounded-2xl mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)] relative group"
          >
            <ShieldCheck className="text-white relative z-10" size={32} />
            <div className="absolute inset-0 bg-white rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-black tracking-[0.2em] text-white uppercase mb-2"
          >
            NEXUS REGISTRATION
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]"
          >
            Initialize Operator Credentials • Node 0-7
          </motion.p>
        </div>

        <div className="glass-card p-10 bg-brand-bg/50 backdrop-blur-3xl border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.6)] rounded-[2.5rem]">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Proposed Identifier</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-700 font-medium"
                    placeholder="NEW_ID_SEQUENCE"
                    required
                  />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Access Passphrase</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-700 font-medium"
                    placeholder="SECURE_KEY_STRING"
                    required
                  />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3 ml-1">Functional Clearance</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['admin', 'operator', 'viewer'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                        role === r 
                          ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' 
                          : 'bg-black/20 border-white/5 text-slate-600 hover:border-white/10'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </motion.div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                >
                  <div className="p-1.5 bg-rose-500/20 rounded-lg">
                    <AlertTriangle size={14} />
                  </div>
                  <span>Registry Error: {error}</span>
                </motion.div>
              )}

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(16,185,129,0.2)] hover:shadow-[0_20px_60px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <span>Commit to Repository</span>
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <ShieldCheck size={32} />
              </motion.div>
              <h2 className="text-white font-bold text-lg mb-2">Registry Successful</h2>
              <p className="text-slate-500 text-xs mb-8">Operator identity has been verified and stored in the tactical decentralized ledger.</p>
              <div className="flex items-center justify-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                Redirecting to Auth Node <Loader2 size={12} className="animate-spin" />
              </div>
            </div>
          )}

          <div className="mt-10 pt-10 border-t border-white/5 text-center flex flex-col gap-4">
            <Link 
              to="/login" 
              className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              Identified? Access Sink <ChevronRight size={14} />
            </Link>
            <p className="text-[8px] text-slate-600 leading-relaxed uppercase tracking-[0.3em] font-black opacity-40">
              Authorized personnel only. Registry logs are immutable.<br/>
              Vector seed: 0x{Math.random().toString(16).slice(2, 10).toUpperCase()}
            </p>
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10 flex justify-center gap-10"
        >
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                backendStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_10px_#10B981]' : 
                backendStatus === 'offline' ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 
                'bg-slate-500'
              }`} />
              <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">
                {backendStatus === 'online' ? 'SINK_ESTABLISHED' : backendStatus === 'offline' ? 'SINK_UNREACHABLE' : 'ESTABLISHING_LINK...'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6] animate-pulse" />
              <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">RSA_FIPS_COMPLIANT</span>
            </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
