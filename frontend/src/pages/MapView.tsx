import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Camera, AccessPoint, Alert } from '../types';
import { 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Video, 
  Wifi, 
  AlertTriangle, 
  Info, 
  X, 
  Maximize2,
  Shield,
  Activity,
  Maximize
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issues in React
const createCameraIcon = (status: string, isBlocked: boolean) => {
  const color = isBlocked ? '#f43f5e' : status === 'online' ? '#10b981' : '#64748b';
  const glow = status === 'online' && !isBlocked ? 'drop-shadow(0 0 4px #10b981)' : 'none';
  
  return L.divIcon({
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: #151518;
        border: 2px solid ${color};
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${color};
        filter: ${glow};
        transform: rotate(45deg);
      ">
        <div style="transform: rotate(-45deg); display: flex;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 7l-7 5 7 5V7z"></path>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        </div>
      </div>
    `,
    className: 'custom-camera-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createAPIcon = (status: string) => {
  const color = status === 'online' ? '#3b82f6' : '#64748b';
  
  return L.divIcon({
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: #151518;
        border: 2px solid ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${color};
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
          <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
      </div>
    `,
    className: 'custom-ap-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Component to handle map centering and controls
const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

export default function MapView() {
  const { token, socket } = useAuth();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<{type: 'camera' | 'ap', data: any} | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'cameras' | 'aps'>('all');

  const mapCenter: [number, number] = [51.505, -0.09];

  useEffect(() => {
    const refreshGeoData = async () => {
      try {
        const [camRes, apRes, alertRes] = await Promise.all([
          fetch('/api/cameras', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/access-points', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/alerts', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const cams = await camRes.json();
        const aps = await apRes.json();
        const alts = await alertRes.json();

        setCameras(Array.isArray(cams) ? cams : []);
        setAccessPoints(Array.isArray(aps) ? aps : []);
        setAlerts(Array.isArray(alts) ? alts : []);
      } catch (err) {
        console.error('Map execution error:', err);
      } finally {
        setLoading(false);
      }
    };

    refreshGeoData();
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const handleCameraUpdate = (update: any) => {
      setCameras(prev => prev.map(c => c.id === parseInt(update.id) ? { ...c, ...update } : c));
    };

    const handleAlert = (alert: any) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
    };

    socket.on("camera_update", handleCameraUpdate);
    socket.on("new_alert", handleAlert);

    return () => {
      socket.off("camera_update", handleCameraUpdate);
      socket.off("new_alert", handleAlert);
    };
  }, [socket]);

  const filteredEntities = useMemo(() => {
    const list: any[] = [];
    if (viewMode === 'all' || viewMode === 'cameras') {
      cameras.forEach(c => list.push({ ...c, entityType: 'Camera' }));
    }
    if (viewMode === 'all' || viewMode === 'aps') {
      accessPoints.forEach(ap => list.push({ ...ap, entityType: 'Access Point' }));
    }
    return list;
  }, [cameras, accessPoints, viewMode]);

  if (loading) return (
    <div className="h-[700px] flex items-center justify-center bg-brand-bg rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.05)_0%,transparent_70%)] animate-pulse" />
       <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative">
            <Activity className="animate-pulse text-blue-500" size={48} />
            <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
          </div>
          <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 animate-pulse">Initializing Geo-Sync Topology...</p>
       </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
             <MapPin className="text-white" size={24} />
           </div>
           <div>
             <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Institutional Topology</h2>
             <p className="text-xs text-slate-500 uppercase tracking-widest font-black flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                Spatial distribution / Live Cluster tracking active
             </p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 overflow-hidden">
              {[
                { id: 'all', icon: Layers, label: 'Unified' },
                { id: 'cameras', icon: Video, label: 'Imaging' },
                { id: 'aps', icon: Wifi, label: 'WiFi Mesh' }
              ].map((mode) => (
                <button 
                  key={mode.id}
                  onClick={() => setViewMode(mode.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                    viewMode === mode.id 
                    ? 'bg-blue-600/10 text-white border border-blue-500/20 shadow-lg' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <mode.icon size={14} />
                  <span>{mode.label}</span>
                </button>
              ))}
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3">
          <div className="relative bg-black rounded-[2.5rem] border border-white/5 h-[700px] overflow-hidden group shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
            <MapContainer 
              center={mapCenter} 
              zoom={15} 
              style={{ height: '100%', width: '100%', filter: 'brightness(0.7) contrast(1.2) saturate(0.5)' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={40}
                polygonOptions={{
                  fillColor: '#3b82f6',
                  color: '#3b82f6',
                  weight: 0.5,
                  opacity: 0.2,
                  fillOpacity: 0.05
                }}
              >
                {filteredEntities.map((entity) => (
                  <Marker 
                    key={`${entity.entityType}-${entity.id}`}
                    position={[entity.lat || 51.505, entity.lng || -0.09]}
                    icon={entity.entityType === 'Camera' ? createCameraIcon(entity.status, entity.is_blocked) : createAPIcon(entity.status)}
                    eventHandlers={{
                      click: (e) => {
                        L.DomEvent.stopPropagation(e);
                        setSelectedEntity({ type: entity.entityType === 'Camera' ? 'camera' : 'ap', data: entity });
                      }
                    }}
                  >
                    <Popup className="custom-map-popup">
                       <div className="p-2 min-w-[140px]">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{entity.entityType}</p>
                          <p className="text-xs font-black text-white mb-3">{entity.name}</p>
                          <div className={`text-[8px] font-black uppercase py-1 px-2.5 rounded-lg border shadow-sm ${
                            entity.status === 'online' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}>
                            {entity.status}
                          </div>
                       </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
              
              <MapController center={mapCenter} />
            </MapContainer>

            {/* UI Overlays on Map */}
            <div className="absolute top-8 left-8 z-[1000] pointer-events-none">
               <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="bg-brand-bg/80 backdrop-blur-2xl border border-white/5 p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6 pointer-events-auto min-w-[240px]"
               >
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-600/10 rounded-xl border border-blue-500/20">
                        <Shield className="text-blue-500" size={16} />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Live Tactical Feed</span>
                  </div>
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Imaging Nodes</span>
                           <span className="text-[11px] font-mono font-black text-emerald-500">{cameras.filter(c => c.status === 'online').length}/{cameras.length}</span>
                        </div>
                        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5 p-0.5">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${(cameras.filter(c => c.status === 'online').length / cameras.length) * 100}%` }}
                             className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_#10B981]" 
                           />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">WLAN Links</span>
                           <span className="text-[11px] font-mono font-black text-blue-500">{accessPoints.filter(ap => ap.status === 'online').length}/{accessPoints.length}</span>
                        </div>
                        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5 p-0.5">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${(accessPoints.filter(ap => ap.status === 'online').length / accessPoints.length) * 100}%` }}
                             className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" 
                           />
                        </div>
                     </div>
                  </div>
               </motion.div>
            </div>

            <div className="absolute bottom-8 left-8 z-[1000] pointer-events-none">
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="flex gap-3 pointer-events-auto"
               >
                  <button className="p-4 bg-brand-bg/80 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl text-slate-500 hover:text-white transition-all hover:bg-blue-600/20 hover:border-blue-500/30">
                     <Layers size={20} />
                  </button>
                  <button className="p-4 bg-brand-bg/80 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl text-slate-500 hover:text-white transition-all hover:bg-blue-600/20 hover:border-blue-500/30">
                     <Maximize size={20} />
                  </button>
                  <div className="flex bg-brand-bg/80 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
                     <button className="p-4 text-slate-500 hover:text-white transition-all hover:bg-white/5 border-r border-white/5"><ZoomIn size={20} /></button>
                     <button className="p-4 text-slate-500 hover:text-white transition-all hover:bg-white/5"><ZoomOut size={20} /></button>
                  </div>
               </motion.div>
            </div>
            
            <div className="absolute top-8 right-8 z-[1000] pointer-events-none">
               <div className="flex flex-col gap-3 pointer-events-auto">
                  <div className="px-5 py-3 bg-brand-bg/80 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl flex items-center gap-3">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10B981] animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Sync Optimal</span>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <AnimatePresence mode="wait">
             {selectedEntity ? (
               <motion.div 
                 key="details"
                 initial={{ opacity: 0, scale: 0.95, x: 20 }}
                 animate={{ opacity: 1, scale: 1, x: 0 }}
                 exit={{ opacity: 0, scale: 0.95, x: 20 }}
                 transition={{ type: "spring", stiffness: 300, damping: 25 }}
                 className="glass-card p-8 flex flex-col h-full bg-brand-bg/50 backdrop-blur-3xl border border-white/10 shadow-[0_20px_100px_rgba(0,0,0,0.5)] overflow-hidden relative"
               >
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    {selectedEntity.type === 'camera' ? <Video size={100} /> : <Wifi size={100} />}
                 </div>
                 
                 <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                       <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1 block">{selectedEntity.data.entityType} Profile</span>
                       <h3 className="text-lg font-black text-white uppercase tracking-tight">{selectedEntity.data.name}</h3>
                    </div>
                    <button 
                      onClick={() => setSelectedEntity(null)} 
                      className="p-3 bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 rounded-2xl border border-white/5 transition-all"
                    >
                       <X size={20} />
                    </button>
                 </div>

                 <div className="aspect-video bg-black rounded-3xl border border-white/10 mb-8 overflow-hidden relative group shadow-2xl ring-1 ring-white/5">
                    {selectedEntity.type === 'camera' ? (
                       <>
                         <img 
                           src={`https://images.unsplash.com/photo-${selectedEntity.data.id % 2 === 0 ? '1541888946425-d81bb19240f5' : '1517404215738-15263e9f9178'}?auto=format&fit=crop&w=600&q=80`} 
                           className="w-full h-full object-cover opacity-60 transition-all duration-700 group-hover:scale-110 group-hover:opacity-80" 
                           alt="Stream"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                         <div className="absolute inset-0 flex items-center justify-center">
                            <div className="p-4 bg-white/5 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-2xl ring-1 ring-white/20">
                               <Maximize2 size={24} className="text-white" />
                            </div>
                         </div>
                         <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-rose-500/20 backdrop-blur-md border border-rose-500/30 rounded-lg">
                            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_#f43f5e]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white">Live</span>
                         </div>
                       </>
                    ) : (
                       <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]">
                          <div className="relative">
                            <Wifi size={48} className="text-blue-500/20" />
                            <motion.div 
                              animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.5, 0.2] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] animate-pulse">Signal Metric Stream</span>
                       </div>
                    )}
                 </div>

                 <div className="space-y-6 flex-1 relative z-10">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner group hover:border-white/10 transition-colors">
                          <span className="text-[9px] font-black text-slate-600 uppercase block mb-2 tracking-widest">Status</span>
                          <span className={`text-[12px] font-black uppercase tracking-widest ${selectedEntity.data.status === 'online' ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {selectedEntity.data.status}
                          </span>
                       </div>
                       <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner group hover:border-white/10 transition-colors">
                          <span className="text-[9px] font-black text-slate-600 uppercase block mb-2 tracking-widest">Network Hash</span>
                          <span className="text-[12px] font-mono font-black text-blue-500 tracking-tighter">
                             IP.{selectedEntity.data.id + 100}
                          </span>
                       </div>
                    </div>

                    <div className="p-6 bg-black/40 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
                       <div className="absolute inset-0 bg-gradient-to-br from-blue-600/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
                          <AlertTriangle size={14} className="text-amber-500" />
                          Recent Node Incidents
                       </h4>
                       <div className="space-y-3 relative z-10">
                          {alerts.filter(a => a.description.includes(selectedEntity.data.name) || a.description.includes(`Camera ${selectedEntity.data.id}`)).slice(0, 3).map(alert => (
                             <motion.div 
                               initial={{ opacity: 0, x: -10 }}
                               animate={{ opacity: 1, x: 0 }}
                               key={alert.id} 
                               className="text-[10px] border-l-2 border-white/5 pl-4 py-2 hover:bg-white/5 transition-colors rounded-r-xl"
                             >
                                <p className="font-black text-slate-200 uppercase tracking-tight text-[11px] mb-1">{alert.type.replace('_', ' ')}</p>
                                <p className="opacity-40 font-mono font-bold text-[9px]">{new Date(alert.timestamp).toLocaleTimeString()} • VECTOR_SIG_0x{alert.id}</p>
                             </motion.div>
                          ))}
                          {alerts.filter(a => a.description.includes(selectedEntity.data.name) || a.description.includes(`Camera ${selectedEntity.data.id}`)).length === 0 && (
                             <div className="flex flex-col items-center py-6 opacity-20">
                                <Shield className="mb-2" size={24} />
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Pristine Integrity</p>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="mt-8 pt-8 border-t border-white/10 flex gap-4 relative z-10">
                    <button className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-[0_10px_30px_rgba(37,99,235,0.2)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.3)] active:scale-95">Diagnose Node</button>
                    <button className="flex-1 px-6 py-4 bg-white/5 text-slate-300 rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.2em] border border-white/10 hover:bg-white/10 transition-all active:scale-95">Audit Ledger</button>
                 </div>
               </motion.div>
             ) : (
               <motion.div 
                 key="placeholder"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="glass-card p-10 bg-brand-bg/30 border-dashed border-white/5 flex flex-col items-center justify-center text-center h-full min-h-[500px]"
               >
                 <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="p-8 bg-blue-600/5 rounded-full mb-8 border border-blue-500/10 shadow-[0_0_50px_rgba(37,99,235,0.05)]"
                 >
                    <Info size={40} className="text-blue-500/30" />
                 </motion.div>
                 <h3 className="text-lg font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Topology Selection</h3>
                 <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed max-w-xs">
                   Highlight a tactical node on the spatial ledger to initialize deep heuristic inspection and signal analysis.
                 </p>
                 <div className="mt-10 flex gap-4 opacity-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      <footer className="glass-card p-5 flex items-center justify-between bg-black/40 border-white/5">
         <div className="flex items-center gap-8">
            <div className="flex flex-col gap-1">
               <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">Mapping Engine</span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CARTOCDN_KERNEL_v2.4</span>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="flex flex-col gap-1">
               <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">Projection Accuracy</span>
               <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">SUB-METER OPTIMAL</span>
            </div>
         </div>
         <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10B981]" />
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Imaging Sink</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mesh Hub Node</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_#f43f5e]" />
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Critical Signal Loss</span>
            </div>
         </div>
      </footer>
      
      <style>{`
        .custom-map-popup .leaflet-popup-content-wrapper {
          background: rgba(10, 10, 14, 0.9) !important;
          backdrop-filter: blur(20px) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 20px !important;
          padding: 0 !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5) !important;
        }
        .custom-map-popup .leaflet-popup-content {
          margin: 12px !important;
        }
        .custom-map-popup .leaflet-popup-tip {
          background: rgba(10, 10, 14, 0.9) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .leaflet-container {
          background: #000 !important;
          font-family: 'Inter', sans-serif !important;
        }
        .marker-cluster {
          background-color: rgba(37, 99, 235, 0.2) !important;
          backdrop-filter: blur(4px) !important;
          border: 1px solid rgba(37, 99, 235, 0.4) !important;
        }
        .marker-cluster div {
          background-color: rgba(37, 99, 235, 0.6) !important;
          color: white !important;
          font-weight: 900 !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-size: 11px !important;
          text-shadow: 0 0 10px rgba(0,0,0,0.5) !important;
        }
        .leaflet-bar {
          border: none !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5) !important;
        }
        .leaflet-bar a {
          background: rgba(21, 21, 24, 0.8) !important;
          backdrop-filter: blur(10px) !important;
          color: #64748b !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .leaflet-bar a:hover {
          background: rgba(37, 99, 235, 0.2) !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}
