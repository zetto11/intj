import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Camera } from '../types';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Eye, 
  ShieldAlert, 
  MoreHorizontal, 
  Clock, 
  MapPin,
  Lock,
  Unlock,
  Radio,
  WifiOff,
  Wifi,
  X,
  Activity,
  Maximize2,
  Trash2,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const normalizeStreamUrl = (url: string, forceVideo = false) => {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (!forceVideo) return trimmed;
  if (/\/video\/?$/i.test(trimmed)) return trimmed.replace(/\/+$/, '');
  if (/^https?:\/\/[^/]+$/i.test(trimmed)) return `${trimmed}/video`;
  return trimmed;
};

const formatUptimeHHMMSS = (totalSeconds: number) => {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

// Camera Feed Component
const CameraFeed = ({
  camera,
  onClose,
  streamFailed,
  onStreamError,
  onStreamLoad,
}: {
  camera: Camera,
  onClose: () => void,
  streamFailed: boolean,
  onStreamError: () => void,
  onStreamLoad: () => void
}) => {
  const { token } = useAuth();
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString());
  const [streamLive, setStreamLive] = useState(false);
  const canRenderStream = !!camera.ip_simulated && !camera.is_blocked && !streamFailed;
  const resolvedStatus = streamLive && !camera.is_blocked ? 'online' : 'offline';
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [captureMessage, setCaptureMessage] = useState<string | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [streamSrc, setStreamSrc] = useState(normalizeStreamUrl(camera.ip_simulated));
  const [triedVideoFallback, setTriedVideoFallback] = useState(false);
  const uptimeSeconds = Math.max(
    0,
    Math.floor(
      Number(
        camera.uptime_seconds ??
        ((camera.uptime_hours ?? 0) * 3600)
      )
    )
  );

  useEffect(() => {
    const timer = setInterval(() => setTimestamp(new Date().toLocaleTimeString()), 1000);
    return () => {
       clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setStreamLive(false);
    setStreamSrc(normalizeStreamUrl(camera.ip_simulated));
    setTriedVideoFallback(false);
  }, [camera.id, camera.ip_simulated]);

  const handleCaptureFrame = async () => {
    try {
      setIsCapturing(true);
      setCaptureMessage(null);
      const res = await fetch(`/api/cameras/${camera.id}/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to capture frame');
      setCaptureMessage(`Saved to cam_screens/${data.file_name}`);
    } catch (err: any) {
      setCaptureMessage(err.message || 'Failed to capture frame');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleVectorAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setAnalysisMessage(null);
      const res = await fetch(`/api/cameras/${camera.id}/vector-analysis`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Vector analysis failed');
      setAnalysisMessage(`${String(data.severity).toUpperCase()} • Risk ${data.risk_score}: ${data.summary}`);
    } catch (err: any) {
      setAnalysisMessage(err.message || 'Vector analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative w-full max-w-5xl glass-card overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10"
      >
        {/* Top Header */}
        <div className="p-4 flex justify-between items-center bg-white/[0.03] border-b border-white/5 relative z-10">
          <div className="flex items-center gap-4">
            <div className={`status-pulse ${resolvedStatus === 'online' ? 'status-pulse-online' : 'status-pulse-offline'}`}></div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight leading-none">{camera.name}</h3>
              <p className="text-[10px] text-slate-500 font-mono mt-1.5 uppercase tracking-widest">Global Node Identifier: 0x{camera.id.toString(16).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">IP ADDRESS</span>
                <span className="text-[10px] text-blue-500 font-mono font-bold tracking-widest">{camera.ip_simulated}</span>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all">
               <X size={20} />
             </button>
          </div>
        </div>

        {/* FEED AREA */}
        <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden group">
          {camera.is_blocked ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/10 text-center p-12 z-20">
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                 <Lock size={40} className="text-rose-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-[0.4em]">Node Restricted</h2>
              <p className="text-slate-500 text-xs font-medium max-w-sm leading-relaxed uppercase tracking-widest">Authorization error: Administrative protocol override. Access denied by Security Clearance Level 5.</p>
              <div className="mt-10 flex gap-4">
                 <button className="btn-action border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white">Emergency Override</button>
                 <button onClick={onClose} className="btn-action">Return to Hub</button>
              </div>
            </div>
          ) : !canRenderStream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-bg text-center z-20">
              <WifiOff size={60} className="text-slate-700 mb-6" />
              <h2 className="text-xl font-black text-slate-500 mb-2 uppercase tracking-[0.3em]">No Signal</h2>
              <p className="text-slate-600 text-[10px] font-mono tracking-widest">Camera offline or unreachable</p>
            </div>
          ) : (
            <>
               <img
                 src={streamSrc}
                 className="w-full h-full object-cover"
                 alt={camera.name}
                 onError={() => {
                   if (!triedVideoFallback) {
                     const fallback = normalizeStreamUrl(camera.ip_simulated, true);
                     if (fallback && fallback !== streamSrc) {
                       setTriedVideoFallback(true);
                       setStreamSrc(fallback);
                       return;
                     }
                   }
                   setStreamLive(false);
                   onStreamError();
                 }}
                 onLoad={() => {
                   setStreamLive(true);
                   onStreamLoad();
                 }}
               />
               <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,transparent_50%,rgba(0,0,0,0.4)_100%)]" />
               <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
               
               <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-6 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                <div className="flex justify-between items-end">
                    <div className="text-[10px] text-white/50 font-mono tracking-widest leading-relaxed uppercase">
                      SECURE FEED ● {new Date().toISOString().split('T')[0]} {timestamp}<br/>
                      ENCODING: HEVC H.265 / GCM-256 / 4K-ULTRA<br/>
                      METRIC: 12.4 Mbps / 32ms LATENCY
                    </div>
                    <div className="flex gap-3">
                        <button
                          onClick={handleCaptureFrame}
                          disabled={isCapturing}
                          className="btn-action bg-white/5 border-white/10 hover:bg-white/10 text-white disabled:opacity-50"
                        >
                          {isCapturing ? 'Capturing...' : 'Capture Frame'}
                        </button>
                        <button
                          onClick={handleVectorAnalysis}
                          disabled={isAnalyzing}
                          className="btn-action bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                          {isAnalyzing ? 'Analyzing...' : 'Vector Analysis'}
                        </button>
                    </div>
                </div>
                {(captureMessage || analysisMessage) && (
                  <div className="mt-4 space-y-1">
                    {captureMessage && <p className="text-[10px] text-emerald-400 font-mono">{captureMessage}</p>}
                    {analysisMessage && <p className="text-[10px] text-blue-300 font-mono">{analysisMessage}</p>}
                  </div>
                )}
              </div>
            </>
          )}
          
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/5 opacity-40">
             <div className="grid grid-cols-4 grid-rows-4 w-full h-full opacity-20">
                {Array.from({length: 16}).map((_, i) => <div key={i} className="border-[0.5px] border-white/20" />)}
             </div>
          </div>
          
          {/* Overlay scanning line */}
          {canRenderStream && (
            <motion.div 
               animate={{ top: ['0%', '100%'] }}
               transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
               className="absolute left-0 right-0 h-px bg-blue-500/30 shadow-[0_0_15px_#3b82f6] z-10 pointer-events-none"
            />
          )}

          <div className="absolute top-6 left-6 p-3 glass-card bg-black/40 border-white/10 backdrop-blur-md">
             <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${resolvedStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="text-[10px] font-mono font-black text-white tracking-[0.2em] uppercase">{camera.name} • {camera.zone}</span>
             </div>
          </div>
        </div>

        {/* Tactical Info Panel */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 bg-brand-bg">
           <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Node Telemetry</h4>
              <div className="grid grid-cols-2 gap-4">
                 {[
                   { label: 'Signal', val: camera.signal_percent != null ? `${camera.signal_percent}%` : 'N/A', color: 'text-emerald-500' },
                   { label: 'Uptime', val: formatUptimeHHMMSS(uptimeSeconds), color: 'text-blue-400' },
                   { label: 'Thermal', val: camera.thermal_celsius != null ? `${Number(camera.thermal_celsius).toFixed(1)}°C` : 'N/A', color: 'text-amber-500' },
                   { label: 'Load', val: camera.load_percent != null ? `${camera.load_percent}%` : 'N/A', color: 'text-slate-400' }
                 ].map(i => (
                   <div key={i.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">{i.label}</p>
                      <p className={`text-[11px] font-mono font-bold ${i.color}`}>{i.val}</p>
                   </div>
                 ))}
              </div>
           </div>
           <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Storage Archive</h4>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <Clock size={14} className="text-blue-500" />
                       <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Retain Cycle</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">
                      {camera.retain_days_remaining != null ? `${camera.retain_days_remaining} Days Remaining` : 'N/A'}
                    </span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, camera.retain_days_remaining != null ? (camera.retain_days_remaining / 30) * 100 : 0))}%` }}
                      className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"
                    />
                 </div>
                 <p className="text-[9px] text-slate-600 font-medium leading-relaxed">
                   {camera.storage_node_label && camera.storage_used_tb != null
                     ? `Storage cluster node ${camera.storage_node_label} identifying ${Number(camera.storage_used_tb).toFixed(2)}TB of proprietary vector data for this node.`
                     : 'No storage telemetry available for this node yet.'}
                 </p>
              </div>
           </div>
           <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Access Vectors</h4>
              <div className="space-y-2">
                 {['ADMIN_ROOT', 'OPERATOR_4', 'AUDIT_SYSTEM'].map(who => (
                   <div key={who} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.01] border border-white/5">
                      <div className="flex items-center gap-2">
                         <div className="w-1 h-1 rounded-full bg-blue-500" />
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{who}</span>
                      </div>
                      <span className="text-[8px] font-mono text-slate-700">AUTHORIZED</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

interface CameraCardProps {
  camera: Camera;
  onClick: () => void | Promise<void>;
  onBlock: () => void | Promise<void>;
  onEdit: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  isAdmin: boolean;
  viewMode: 'grid' | 'list';
  onStreamStatusChange: (status: 'online' | 'offline') => void;
}

function CameraCard({ camera, onClick, onBlock, onEdit, onDelete, isAdmin, viewMode, onStreamStatusChange }: CameraCardProps) {
  const [streamFailed, setStreamFailed] = useState(false);
  const [streamState, setStreamState] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const canRenderStream = !!camera.ip_simulated && !camera.is_blocked && !streamFailed;
  const retryTimerRef = useRef<number | null>(null);
  const backendStatus: 'online' | 'offline' = camera.status === 'online' && !camera.is_blocked ? 'online' : 'offline';
  const resolvedStatus: 'online' | 'offline' = camera.is_blocked
    ? 'offline'
    : streamState === 'unknown'
      ? backendStatus
      : streamState;
  const isListMode = viewMode === 'list';
  const [streamSrc, setStreamSrc] = useState(normalizeStreamUrl(camera.ip_simulated));
  const [triedVideoFallback, setTriedVideoFallback] = useState(false);

  useEffect(() => {
    setStreamFailed(false);
    setStreamState('unknown');
    setStreamSrc(normalizeStreamUrl(camera.ip_simulated));
    setTriedVideoFallback(false);
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [camera.ip_simulated, camera.status, camera.is_blocked]);

  useEffect(() => () => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  return (
    <motion.div
        whileHover={{ y: -4 }}
        className={`glass-card glass-card-hover overflow-hidden group relative ${isListMode ? 'w-full flex flex-row' : 'h-full flex flex-col'} ${camera.is_blocked ? 'border-rose-500/30 bg-rose-500/[0.02]' : ''}`}
    >
        {/* Status Badge */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
            <div className={`w-2 h-2 rounded-full ${resolvedStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">{resolvedStatus}</span>
        </div>

        {/* Zone Badge */}
        <div className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
            <MapPin size={12} className="text-blue-500" />
        </div>

        {/* Media Preview */}
        <div className={`${isListMode ? 'w-80 min-w-80 border-r border-white/5' : 'aspect-[16/10] border-b border-white/5'} bg-[#050507] relative cursor-pointer overflow-hidden`} onClick={onClick}>
            {canRenderStream ? (
                <>
                <img 
                    src={streamSrc}
                    className="w-full h-full object-cover transition-all duration-1000 opacity-60 group-hover:opacity-100 group-hover:scale-110"
                    alt={camera.name}
                    onError={() => {
                      if (!triedVideoFallback) {
                        const fallback = normalizeStreamUrl(camera.ip_simulated, true);
                        if (fallback && fallback !== streamSrc) {
                          setTriedVideoFallback(true);
                          setStreamSrc(fallback);
                          return;
                        }
                      }
                      setStreamFailed(true);
                      setStreamState('offline');
                      onStreamStatusChange('offline');
                      if (retryTimerRef.current) {
                        window.clearTimeout(retryTimerRef.current);
                      }
                      retryTimerRef.current = window.setTimeout(() => {
                        setStreamFailed(false);
                        setStreamSrc((prev) => {
                          const base = String(prev || '').split('?')[0];
                          return `${base}?retry=${Date.now()}`;
                        });
                      }, 3000);
                    }}
                    onLoad={() => {
                      setStreamFailed(false);
                      setStreamState('online');
                      onStreamStatusChange('online');
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="absolute bottom-4 left-4">
                        <div className="flex items-center gap-2">
                           <Activity size={12} className="text-emerald-500 animate-pulse" />
                           <span className="text-[9px] font-bold text-white uppercase tracking-widest font-mono">Stream Active: 12.4 Mbps</span>
                        </div>
                    </div>
                </div>
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    {camera.is_blocked ? (
                        <>
                        <Lock size={32} className="text-rose-500 mb-3 opacity-50" />
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Blocked</span>
                        </>
                    ) : (
                        <>
                        <WifiOff size={32} className="text-slate-800 mb-3" />
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Camera offline or unreachable</span>
                        </>
                    )}
                </div>
            )}
            <div className="absolute left-4 bottom-4 px-2.5 py-1 rounded bg-black/60 border border-white/10 text-[10px] text-white font-semibold">
              {camera.name} • {camera.zone}
            </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-grow flex flex-col min-w-0">
            <div className="flex justify-between items-start mb-4">
                <div className="min-w-0 flex-1 pr-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-tight truncate group-hover:text-blue-500 transition-colors">{camera.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 opacity-60">
                        <Radio size={10} className="text-slate-400" />
                        <span className="text-[9px] text-slate-400 font-mono tracking-widest">{camera.ip_simulated}</span>
                    </div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{camera.zone}</span>
                </div>
            </div>

            <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Last Handshake</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">{new Date(camera.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                   <div className="h-4 w-px bg-white/5" />
                   <div className="text-right">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Security Pool</span>
                      <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                         <div className="w-1 h-1 rounded-full bg-blue-500" />
                         <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Vector A1</span>
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                    {isAdmin ? (
                        <>
                          <button 
                              onClick={(e) => { e.stopPropagation(); onBlock(); }}
                              className={`flex-1 btn-action ${
                                  camera.is_blocked 
                                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white' 
                                      : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white'
                              }`}
                          >
                              {camera.is_blocked ? 'Sync Node' : 'Block Sink'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-2.5 bg-amber-600/10 text-amber-500 border border-amber-500/20 hover:bg-amber-600 hover:text-white rounded-lg transition-all"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-2.5 bg-rose-600/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                    ) : (
                        <div className="flex-1 py-1 px-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-center gap-2">
                             <Lock size={12} className="text-slate-700" />
                             <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Restricted</span>
                        </div>
                    )}
                    <button 
                        onClick={onClick}
                        className="p-2.5 bg-blue-600/10 text-blue-500 border border-blue-500/20 hover:bg-blue-600 hover:text-white rounded-lg transition-all"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    </motion.div>
  );
};

export default function Cameras() {
  const { token, user, socket } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [streamErrors, setStreamErrors] = useState<Record<number, boolean>>({});
  const [liveStatus, setLiveStatus] = useState<Record<number, 'online' | 'offline'>>({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', ip_simulated: '', zone: 'Gate' });
  const [createError, setCreateError] = useState('');
  const [editCamera, setEditCamera] = useState<Camera | null>(null);
  const [editForm, setEditForm] = useState({ name: '', ip_simulated: '', zone: 'Gate' });
  const [editError, setEditError] = useState('');
  const [deleteCameraTarget, setDeleteCameraTarget] = useState<Camera | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectedCameras, setDetectedCameras] = useState<Array<{ name: string; ip_simulated: string; zone: string }>>([]);
  const [scanMessage, setScanMessage] = useState('');
  const [scanStats, setScanStats] = useState<{ scanned: number; found: number; duration_ms: number } | null>(null);

  useEffect(() => {
    fetchCameras();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const onTelemetry = (payload: any) => {
      setCameras(prev =>
        prev.map(cam =>
          cam.id === payload.camera_id
            ? {
                ...cam,
                signal_percent: payload.signal_percent,
                uptime_seconds: payload.uptime_seconds,
                uptime_hours: payload.uptime_hours,
                thermal_celsius: payload.thermal_celsius,
                load_percent: payload.load_percent,
                storage_used_tb: payload.storage_used_tb,
                retain_days_remaining: payload.retain_days_remaining,
                status: payload.status === 'online' ? 'online' : 'offline',
              }
            : cam
        )
      );
    };
    socket.on('camera_telemetry_update', onTelemetry);
    return () => {
      socket.off('camera_telemetry_update', onTelemetry);
    };
  }, [socket]);

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

  const toggleBlock = async (id: number, blocked: boolean) => {
    try {
      const res = await fetch(`/api/cameras/${id}/block`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ blocked: !blocked }),
      });
      if (res.ok) fetchCameras();
    } catch (err) {
      console.error(err);
    }
  };

  const handleView = async (camera: Camera) => {
    try {
      await fetch('/api/logs/view', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ camera_id: camera.id }),
      });
      setSelectedCamera(camera);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCamera = async () => {
    const name = form.name.trim();
    const ip = form.ip_simulated.trim();
    const zone = form.zone.trim();
    if (!name || !ip || !zone) {
      setCreateError('All fields are required.');
      return;
    }
    if (!ip.toLowerCase().startsWith('http')) {
      setCreateError('ip_simulated must start with http.');
      return;
    }

    try {
      setCreateError('');
      const res = await fetch('/api/cameras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          ip_simulated: ip,
          zone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data?.error || 'Failed to add camera.');
        return;
      }
      setShowModal(false);
      setForm({ name: '', ip_simulated: '', zone: 'Gate' });
      fetchCameras();
    } catch (err) {
      console.error(err);
      setCreateError('Failed to add camera.');
    }
  };

  const handleDetectCamera = async () => {
    let ticker: ReturnType<typeof setInterval> | null = null;
    try {
      setDetecting(true);
      setDetectedCameras([]);
      setScanStats(null);
      const messages = [
        'Scanning network...',
        'Analyzing network topology...',
        'Detecting live video streams...',
        'Identifying security nodes...',
      ];
      let idx = 0;
      setScanMessage(messages[idx]);
      ticker = setInterval(() => {
        idx = (idx + 1) % messages.length;
        setScanMessage(messages[idx]);
      }, 700);

      const res = await fetch('/api/cameras/discover', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setDetectedCameras([]);
        return;
      }
      const detected = Array.isArray(data) ? data : Array.isArray(data?.cameras) ? data.cameras : [];
      setDetectedCameras(detected);
      if (!Array.isArray(data)) {
        setScanStats({
          scanned: Number(data?.scanned || 0),
          found: Number(data?.found || detected.length),
          duration_ms: Number(data?.duration_ms || 0),
        });
      } else {
        setScanStats({ scanned: 0, found: detected.length, duration_ms: 0 });
      }
    } catch (err) {
      console.error(err);
      setDetectedCameras([]);
      setScanStats(null);
    } finally {
      if (ticker) clearInterval(ticker);
      setDetecting(false);
    }
  };

  const addDetectedCamera = async (cam: { name: string; ip_simulated: string; zone: string }) => {
    try {
      const res = await fetch('/api/cameras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: cam.name,
          ip_simulated: cam.ip_simulated,
          zone: cam.zone
        })
      });
      if (!res.ok) return;
      setDetectedCameras(prev => prev.filter(c => c.ip_simulated !== cam.ip_simulated));
      await fetchCameras();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCamera = async (camera: Camera) => {
    setEditError('');
    setEditCamera(camera);
    setEditForm({
      name: camera.name,
      ip_simulated: camera.ip_simulated,
      zone: camera.zone || 'Gate',
    });
  };

  const handleDeleteCamera = async (camera: Camera) => {
    setDeleteError('');
    setDeleteCameraTarget(camera);
  };

  const submitEditCamera = async () => {
    if (!editCamera) return;
    const name = editForm.name.trim();
    const ip = editForm.ip_simulated.trim();
    const zone = editForm.zone.trim();
    if (!name || !ip || !zone) {
      setEditError('All fields are required.');
      return;
    }
    if (!ip.toLowerCase().startsWith('http')) {
      setEditError('ip_simulated must start with http.');
      return;
    }
    try {
      const res = await fetch(`/api/cameras/${editCamera.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, ip_simulated: ip, zone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data?.error || 'Failed to modify camera.');
        return;
      }
      setEditCamera(null);
      fetchCameras();
    } catch (err) {
      console.error(err);
      setEditError('Failed to modify camera.');
    }
  };

  const confirmDeleteCamera = async () => {
    if (!deleteCameraTarget) return;
    try {
      const res = await fetch(`/api/cameras/${deleteCameraTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data?.error || 'Failed to delete camera.');
        return;
      }
      setDeleteCameraTarget(null);
      fetchCameras();
    } catch (err) {
      console.error(err);
      setDeleteError('Failed to delete camera.');
    }
  };

  const filteredCameras = cameras.filter(cam => {
    const normalizedSearch = search.toLowerCase().trim();
    const currentStatus = liveStatus[cam.id] || cam.status;
    const matchesSearch =
      cam.name?.toLowerCase().includes(normalizedSearch) ||
      cam.ip_simulated?.toLowerCase().includes(normalizedSearch);
    const matchesZone = zoneFilter === 'All' || cam.zone === zoneFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      currentStatus === statusFilter.toLowerCase();
    return matchesSearch && matchesZone && matchesStatus;
  });

  const zones = ['All', ...Array.from(new Set(cameras.map(c => c.zone)))];
  const statuses = ['All', 'Online', 'Offline', 'Maintenance'];

  useEffect(() => {
    const initial: Record<number, 'online' | 'offline'> = {};
    cameras.forEach(cam => {
      initial[cam.id] = cam.status === 'online' ? 'online' : 'offline';
    });
    setLiveStatus(initial);
  }, [cameras]);

  if (loading) return null;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Imaging Acquisition Grid</h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
             Active nodes identified: {filteredCameras.length} / Global Cluster Alpha
          </p>
        </div>
        <div className="flex gap-4">
           <div className="flex glass-card p-1 items-center bg-white/[0.02]">
             <button
               onClick={() => setViewMode('grid')}
               className={`p-2 rounded-lg shadow-sm transition-colors ${viewMode === 'grid' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-600 hover:text-white'}`}
             >
               <Grid size={16} />
             </button>
             <button
               onClick={() => setViewMode('list')}
               className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-600 hover:text-white'}`}
             >
               <List size={16} />
             </button>
           </div>
           <button onClick={handleDetectCamera} disabled={detecting} className="btn-action">
             {detecting ? 'Scanning network...' : 'Detect Camera'}
           </button>
           <button
             onClick={() => {
               setCreateError('');
               setShowModal(true);
             }}
             className="btn-action bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20 hover:bg-blue-500"
           >
             Node Provisioning
           </button>
        </div>
      </header>

      {showModal && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">Add Camera</h3>
            <input
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="name"
              className="input-soc w-full"
            />
            <input
              value={form.ip_simulated}
              onChange={(e) => setForm(prev => ({ ...prev, ip_simulated: e.target.value }))}
              placeholder="ip_simulated"
              className="input-soc w-full"
            />
            <select
              value={form.zone}
              onChange={(e) => setForm(prev => ({ ...prev, zone: e.target.value }))}
              className="bg-white/[0.03] border border-white/10 rounded-xl text-white px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <option value="Gate" className="bg-gray-900 text-white">Gate</option>
              <option value="Factory" className="bg-gray-900 text-white">Factory</option>
              <option value="Warehouse" className="bg-gray-900 text-white">Warehouse</option>
              <option value="Office" className="bg-gray-900 text-white">Office</option>
            </select>
            {createError && <p className="text-rose-400 text-xs">{createError}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={handleCreateCamera} className="btn-action bg-blue-600 text-white border-blue-500">Add Camera</button>
              <button onClick={() => {
                setShowModal(false);
                setCreateError('');
              }} className="btn-action">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editCamera && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">Modify Camera</h3>
            <input value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="input-soc w-full" />
            <input value={editForm.ip_simulated} onChange={(e) => setEditForm(prev => ({ ...prev, ip_simulated: e.target.value }))} className="input-soc w-full" />
            <select
              value={editForm.zone}
              onChange={(e) => setEditForm(prev => ({ ...prev, zone: e.target.value }))}
              className="bg-white/[0.03] border border-white/10 rounded-xl text-white px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <option value="Gate" className="bg-gray-900 text-white">Gate</option>
              <option value="Factory" className="bg-gray-900 text-white">Factory</option>
              <option value="Warehouse" className="bg-gray-900 text-white">Warehouse</option>
              <option value="Office" className="bg-gray-900 text-white">Office</option>
            </select>
            {editError && <p className="text-rose-400 text-xs">{editError}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={submitEditCamera} className="btn-action bg-amber-600 text-white border-amber-500">Save Changes</button>
              <button onClick={() => { setEditCamera(null); setEditError(''); }} className="btn-action">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {deleteCameraTarget && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">Are you sure you want to delete this camera?</h3>
            <p className="text-xs text-slate-400">{deleteCameraTarget.name} • {deleteCameraTarget.ip_simulated}</p>
            {deleteError && <p className="text-rose-400 text-xs">{deleteError}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={confirmDeleteCamera} className="btn-action bg-rose-600 text-white border-rose-500">Yes, Delete</button>
              <button onClick={() => { setDeleteCameraTarget(null); setDeleteError(''); }} className="btn-action">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Search + Filter Layout */}
      <div className="space-y-4">
        {/* Search Bar - Prominent, above filters */}
        <div className="relative group w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-all duration-200" />
          </div>
          <input
            type="text"
            placeholder="Search by node label, IP address, or MAC index..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-sm font-mono tracking-wide"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Bar - Tactical sectors and sink status */}
        <div className="glass-card p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Zone Filters */}
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-blue-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Tactical Sectors</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {zones.map(zone => (
                  <button
                    key={zone}
                    onClick={() => setZoneFilter(zone)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                      zoneFilter === zone 
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm' 
                        : 'bg-transparent text-slate-500 border border-transparent hover:bg-white/5 hover:text-slate-300'
                    }`}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="hidden lg:block w-px h-8 bg-white/10" />
            
            {/* Status Filters */}
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Sink Status</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                      statusFilter === status 
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-sm' 
                        : 'bg-transparent text-slate-500 border border-transparent hover:bg-white/5 hover:text-slate-300'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Node Grid */}
      <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6' : 'flex flex-col gap-4'} relative`}>
        <AnimatePresence mode="popLayout">
          {filteredCameras.map((camera) => (
            <motion.div key={camera.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CameraCard 
                  camera={camera}
                  isAdmin={user?.role === 'admin'}
                  viewMode={viewMode}
                  onEdit={() => handleEditCamera(camera)}
                  onDelete={() => handleDeleteCamera(camera)}
                  onStreamStatusChange={(status) => {
                    setLiveStatus(prev => ({ ...prev, [camera.id]: status }));
                  }}
                  onClick={() => handleView(camera)}
                  onBlock={() => toggleBlock(camera.id, camera.is_blocked)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="glass-card p-4 bg-white/[0.02] border-white/5">
        <h3 className="text-sm font-bold text-white mb-3">🟢 Discovered Network Nodes</h3>
        {detecting && (
          <p className="text-xs text-blue-400 font-mono animate-pulse">{scanMessage}</p>
        )}
        {!detecting && detectedCameras.length === 0 && (
          <p className="text-xs text-slate-500">No active surveillance nodes detected</p>
        )}
        {scanStats && !detecting && (
          <p className="text-[11px] text-slate-400 mb-2">
            Scan complete • checked {scanStats.scanned} targets • found {scanStats.found} node(s)
            {scanStats.duration_ms > 0 ? ` • ${scanStats.duration_ms}ms` : ''}
          </p>
        )}
        <div className="space-y-3">
          {detectedCameras.map((cam) => (
            <div key={cam.ip_simulated} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold truncate">{cam.name}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{cam.ip_simulated}</p>
                <span className="text-[10px] text-amber-400 font-bold">UNREGISTERED NODE</span>
              </div>
              <button onClick={() => addDetectedCamera(cam)} className="btn-action bg-blue-600 text-white border-blue-500">
                ADD TO SYSTEM
              </button>
            </div>
          ))}
        </div>
      </div>

      {filteredCameras.length === 0 && (
         <div className="flex flex-col items-center justify-center py-40 opacity-20 text-center">
            <Radio size={80} className="mb-6 animate-pulse" />
            <h3 className="text-xl font-black uppercase tracking-[0.5em]">No Cluster Response</h3>
            <p className="text-xs uppercase tracking-widest mt-2">Modify filtration protocols to re-index node library</p>
         </div>
      )}

      {/* Global Camera View Modal */}
      <AnimatePresence>
        {selectedCamera && (
          <CameraFeed 
            camera={(cameras.find(c => c.id === selectedCamera.id) || selectedCamera)} 
            onClose={() => setSelectedCamera(null)}
            streamFailed={!!streamErrors[selectedCamera.id]}
            onStreamError={() => setStreamErrors(prev => ({ ...prev, [selectedCamera.id]: true }))}
            onStreamLoad={() => setStreamErrors(prev => ({ ...prev, [selectedCamera.id]: false }))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}