import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  LayoutDashboard, 
  Video, 
  AlertTriangle, 
  History, 
  Users as UsersIcon, 
  BarChart3, 
  Settings, 
  LogOut, 
  Bell, 
  Menu, 
  X,
  Search,
  Lock,
  Unlock,
  Eye,
  Activity,
  MapPin
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// Types
import { User as UserType, Camera, Alert, AccessLog } from './types';

// Auth Context
interface AuthContextType {
  user: UserType | null;
  token: string | null;
  socket: Socket | null;
  login: (token: string, user: UserType) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Pages (will implement next)// Pages
import Dashboard from './pages/Dashboard';
import Cameras from './pages/Cameras';
import Alerts from './pages/Alerts';
import Logs from './pages/Logs';
import AccessManagement from './pages/AccessManagement';
import NetworkMatrix from './pages/NetworkMatrix';
import MapView from './pages/MapView';
import Login from './pages/Login';
import AnomalyDetection from './pages/AnomalyDetection';
import SOCAssistant from './components/SOCAssistant';
import Register from './pages/Register';

// Layout Component
const SidebarLink = ({ to, icon: Icon, label, active, onClick, collapsed }: any) => (
  <Link
    to={to}
    onClick={onClick}
    className={`sidebar-link ${active ? 'sidebar-link-active' : 'sidebar-link-inactive'} ${collapsed ? 'justify-center px-0' : ''}`}
    title={collapsed ? label : ''}
  >
    <Icon size={18} className={active ? 'text-blue-400' : 'opacity-50'} />
    {!collapsed && <span className="font-medium tracking-tight whitespace-nowrap">{label}</span>}
  </Link>
);

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navigation = [
    { to: '/', icon: LayoutDashboard, label: 'Control Unit' },
    { to: '/cameras', icon: Video, label: 'Imaging Nodes' },
    { to: '/map', icon: MapPin, label: 'Site Topology' },
    { to: '/network', icon: BarChart3, label: 'Network Matrix' },
    { to: '/alerts', icon: AlertTriangle, label: 'Incident Desk' },
    { to: '/logs', icon: History, label: 'Audit Trail' },
  ];

  if (user?.role === 'admin') {
    navigation.push({ to: '/access', icon: UsersIcon, label: 'Authority' });
  }

  return (
    <div className="flex h-screen bg-brand-bg text-slate-300 overflow-hidden font-sans relative">
      {/* Global Scanlines Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_2px,3px_100%]" />
      </div>

      {/* Global Vignette */}
      <div className="fixed inset-0 pointer-events-none z-[101] shadow-[inset_0_0_150px_rgba(0,0,0,0.5)]" />

      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col border-r border-white/5 bg-brand-bg transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className={`flex items-center gap-3 transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">
               <Shield size={18} />
            </div>
            <div>
               <h1 className="text-sm font-bold tracking-tight text-white leading-none">SECUREVIEW</h1>
               <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mt-1">Industrial SOC</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-colors"
          >
            <Menu size={16} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {!isSidebarCollapsed && (
            <div className="text-[10px] uppercase tracking-widest text-slate-600 px-3 font-bold mb-3 mt-2">Tactical Hub</div>
          )}
          {navigation.map((item) => (
            <SidebarLink 
              key={item.to} 
              {...item} 
              active={location.pathname === item.to}
              collapsed={isSidebarCollapsed}
            />
          ))}
          <div className="h-px bg-white/5 my-6 mx-3" />
          <SidebarLink to="/settings" icon={Settings} label="Protocols" active={location.pathname === '/settings'} collapsed={isSidebarCollapsed} />
        </nav>

        <div className="p-4 border-t border-white/5 bg-white/[0.02]">
          <div className={`flex items-center gap-3 mb-4 transition-all duration-300 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-2'}`}>
            <div className={`w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center font-bold text-blue-500 text-xs border border-blue-500/20 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.1)]`}>
              {user?.username[0].toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                 <p className="text-xs font-bold text-white tracking-tight truncate">{user?.username}</p>
                 <div className="flex items-center gap-1.5 mt-0.5">
                    <div className={`w-1 h-1 rounded-full ${user?.role === 'admin' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                    <p className="text-[8px] text-slate-600 uppercase tracking-widest font-black">{user?.role === 'admin' ? 'Clearance L5' : 'Level 2 Op'}</p>
                 </div>
              </div>
            )}
          </div>
          <button 
            onClick={logout}
            className={`w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
              isSidebarCollapsed ? 'px-0' : ''
            } hover:bg-rose-500/10 text-slate-500 hover:text-rose-500`}
            title={isSidebarCollapsed ? 'Terminate Sink' : ''}
          >
            <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
            {!isSidebarCollapsed && <span className="text-[10px] uppercase tracking-widest font-bold">Terminate Session</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-brand-bg/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4 lg:hidden">
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-400 hover:text-white">
                <Menu size={20} />
             </button>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">
                   <Shield size={16} />
                </div>
             </div>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Secure command search [⌘K]..." 
                className="w-full bg-white/[0.03] border border-white/5 rounded-lg py-2 pl-10 pr-4 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.05] transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="hidden sm:flex items-center gap-8">
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Zone A-14 Load</span>
                   <div className="w-20 h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "65%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" 
                      />
                   </div>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Network Stability</span>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      <Activity size={10} className="text-emerald-500" />
                      <span className="text-[10px] font-mono text-emerald-500 font-bold">99.8%</span>
                   </div>
                </div>
             </div>

             <div className="h-4 w-px bg-white/5 mx-2" />

             <div className="flex items-center gap-3">
                <button className="relative p-2 text-slate-500 hover:text-blue-400 hover:bg-white/5 rounded-lg transition-all group">
                  <Bell size={18} />
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full border-2 border-brand-bg group-hover:scale-125 transition-transform"></span>
                </button>
                <div className='flex items-center gap-2.5 text-[9px] font-bold bg-white/[0.03] border border-white/5 px-4 py-2 rounded-lg'>
                   <div className='status-pulse status-pulse-online'></div>
                   <span className="tracking-widest uppercase text-slate-400">Tactical Pool active</span>
                </div>
             </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-8 scrollbar-hide relative bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.05),transparent_50%)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-screen-2xl mx-auto w-full h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </section>
        
        <footer className='border-t border-white/5 p-3 flex items-center justify-between bg-brand-bg px-8'>
          <div className="flex items-center gap-4">
             <span className="text-[8px] text-slate-700 tracking-widest font-black uppercase">NEXUS CORE: 0xFF92A1 / ACTIVE</span>
             <span className="text-[8px] text-slate-700 tracking-widest font-black uppercase">HANDSHAKE: SUCCESSFULL [GCM-256]</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                <span className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">Simulated Env v1.02</span>
             </div>
          </div>
        </footer>

        {/* Global Shimmer Overlay when needed */}
      </main>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/95 backdrop-blur-xl z-40 lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-72 bg-brand-bg z-50 lg:hidden flex flex-col border-r border-white/5 p-6"
            >
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-600/20">
                       <Shield size={18} />
                    </div>
                    <h1 className="text-sm font-bold tracking-tight text-white leading-none">SECUREVIEW</h1>
                 </div>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500">
                   <X size={20} />
                 </button>
              </div>
              <nav className="flex-1 space-y-2">
                {navigation.map((item) => (
                  <SidebarLink 
                    key={item.to} 
                    {...item} 
                    active={location.pathname === item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                ))}
              </nav>
              <div className="mt-auto pt-6 border-t border-white/5">
                 <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 p-3 text-rose-500 font-bold text-[10px] uppercase tracking-widest bg-rose-500/5 rounded-xl border border-rose-500/10"
                 >
                   <LogOut size={16} />
                   Terminate Sink
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};


const getStorageItem = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error("Storage access denied:", e);
    return null;
  }
};

const setStorageItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error("Storage write denied:", e);
  }
};

const removeStorageItem = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error("Storage remove denied:", e);
  }
};

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(getStorageItem('cctv_token'));
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = getStorageItem('cctv_user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user:", e);
      }
    }
    
    try {
      // Initialize socket
      const newSocket = io({
        reconnectionAttempts: 5,
        timeout: 10000
      });
      setSocket(newSocket);
      
      return () => {
        newSocket.close();
      };
    } catch (err) {
      console.error("SOC SOCKET HANDSHAKE FAILED:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: UserType) => {
    setStorageItem('cctv_token', newToken);
    setStorageItem('cctv_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    removeStorageItem('cctv_token');
    removeStorageItem('cctv_user');
    setToken(null);
    setUser(null);
  };

  if (loading) return <div>Internal System Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, token, socket, login, logout }}>
      <Router>
        {user && <SOCAssistant />}
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/*" element={
            user ? (
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/cameras" element={<Cameras />} />
                  <Route path="/map" element={<MapView />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/network" element={<NetworkMatrix />} />
                  <Route path="/anomalies" element={<AnomalyDetection />} />
                  {user.role === 'admin' && <Route path="/access" element={<AccessManagement />} />}
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </MainLayout>
            ) : (
              <Navigate to="/login" />
            )
          } />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
