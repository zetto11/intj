import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  ShieldCheck, 
  Terminal,
  ChevronDown,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAuth } from '../App';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function SOCAssistant() {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Digital Assistant NEXUS-7 online. SOC monitored environment active. How can I assist with your tactical oversight today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setIsTyping(true);

    try {
      // 1. Fetch current system state for context
      const statusRes = await fetch('/api/system-status', { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      const systemData = await statusRes.json();
      const { cameras, alerts, logs, stats } = systemData;

      // 2. Initialize Gemini with the official SDK
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      
      const systemInstruction = `
        You are Digital Assistant NEXUS-7, a specialized SOC (Security Operations Center) AI for an industrial monitoring environment.
        Your tone is professional, technical, and concise. You act as a partner for security operators.

        Current System State:
        - System Stats: ${JSON.stringify(stats)}
        - Cameras: ${JSON.stringify(Array.isArray(cameras) ? cameras.slice(0, 8) : [])}
        - Recent Alerts: ${JSON.stringify(Array.isArray(alerts) ? alerts.slice(0, 8) : [])}
        - Recent Logs: ${JSON.stringify(Array.isArray(logs) ? logs.slice(0, 8) : [])}
        - Current User: ${user?.username} (Role: ${user?.role})

        Common Issues:
        - CAMERA_OFFLINE: Critical heartbeat failure.
        - PORT_SCAN: Unauthorized reconnaissance.
        - BRUTE_FORCE: Password guessing attack.
        - UNBLOCK_CAMERA: Normal operational procedure.

        Capabilities:
        - Analyze camera status and explain connectivity issues.
        - Interpret IDS alerts (Port scans, Brute Force).
        - Suggest operational protocols.
        - Correlate events (e.g., if a camera is offline and there was an unauthorized access attempt).

        Guidelines:
        - Summarize when asked.
        - Explain security concepts simply.
        - Always act as a "Security Operations Center Assistant".
      `;

      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", 
        systemInstruction 
      });

      const chat = model.startChat({
        history: messages.slice(1).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const aiText = response.text() || "I encountered a synchronization error in my logic core. Please re-state your request.";
      
      setMessages(prev => [...prev, { role: 'assistant', content: aiText, timestamp: new Date() }]);
    } catch (err) {
      console.error('SOC Assistant Error:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Logic cycle interrupted. Connectivity to tactical datasets may be unstable.', 
        timestamp: new Date() 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all z-50 border-2 ${
          isOpen ? 'bg-rose-600 border-rose-400 rotate-90' : 'bg-blue-600 border-blue-400 hover:scale-110'
        }`}
      >
        {isOpen ? <X size={24} className="text-white" /> : <MessageSquare size={24} className="text-white" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-brand-bg animate-pulse"></span>
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 w-[400px] h-[600px] bg-[#0d0d0f] border border-border-subtle shadow-2xl rounded-xl overflow-hidden flex flex-col z-50 font-inter"
          >
            {/* Header */}
            <div className="bg-white/[0.03] border-b border-border-subtle p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600/20 rounded flex items-center justify-center text-blue-500 border border-blue-500/30">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">SOC-AI NEXUS-7</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10B981]"></span>
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Heuristic Engine Active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <Terminal size={12} className="text-slate-700" />
                 <ChevronDown size={14} className="text-slate-500 cursor-pointer hover:text-white" onClick={() => setIsOpen(false)} />
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] space-y-1 ${m.role === 'assistant' ? 'order-2' : ''}`}>
                    <div className={`px-4 py-3 rounded-lg text-xs leading-relaxed ${
                      m.role === 'assistant' 
                        ? 'bg-white/[0.03] border border-white/5 text-slate-300' 
                        : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    }`}>
                      {m.content}
                    </div>
                    <p className={`text-[8px] uppercase tracking-widest text-slate-600 font-bold ${m.role === 'assistant' ? 'text-left' : 'text-right'}`}>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {m.role === 'assistant' ? 'LOGICAL-CORE' : 'OPERATOR'}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/5 px-4 py-3 rounded-lg flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-blue-500" />
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Processing heuristics...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border-subtle bg-white/[0.02]">
              <form onSubmit={handleSend} className="relative">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Query system telemetry..."
                  className="w-full bg-[#0d0d0f] border border-border-subtle rounded-lg py-2.5 pl-4 pr-12 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={16} />
                </button>
              </form>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[8px] text-slate-600 uppercase font-bold tracking-widest">
                  <ShieldCheck size={10} />
                  Secure Protocol Active
                </div>
                <div className="text-[8px] text-slate-700 font-mono">
                  AES-256-ENCRYPTED-LINK
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
