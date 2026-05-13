/**
 * @file src/components/UI/DebugOverlay.tsx
 * @description A comprehensive diagnostic and administrative interface.
 * Provides real-time telemetry, log viewing, and server-side state manipulation for development.
 * @importance Essential: Crucial for rapid testing, debugging, and maintaining the project during development.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, X, Terminal, Monitor, Server as ServerIcon, Activity, FileDown, ScrollText } from "lucide-react";
import { DEBUG_CONFIG, DebugCategory } from "../../debug.config";
import { Socket } from "socket.io-client";
import { useGameStore } from "../../store/useGameStore";
import { logger } from "../../lib/logger";

interface DebugOverlayProps {
  socket: Socket | null;
}

export const DebugOverlay = ({ socket }: DebugOverlayProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'client' | 'server' | 'logs'>('client');
  const [, setTick] = useState(0); // For forcing re-renders
  const devMode = useGameStore(s => s.devMode);

  useEffect(() => {
    if (!isOpen || activeTab !== 'logs') return;
    const interval = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

  if (!devMode) return null;

  const toggleGlobal = () => {
    DEBUG_CONFIG.ENABLED = !DEBUG_CONFIG.ENABLED;
    if (socket) {
      socket.emit("debug_toggle", { global: true, enabled: DEBUG_CONFIG.ENABLED });
    }
    setTick(t => t + 1);
  };

  const toggleCategory = (side: 'client' | 'server', category: DebugCategory) => {
    const sideKey = side.toUpperCase() as 'CLIENT' | 'SERVER';
    DEBUG_CONFIG[sideKey][category] = !DEBUG_CONFIG[sideKey][category];
    
    if (side === 'server' && socket) {
      socket.emit("debug_toggle", { category, enabled: DEBUG_CONFIG.SERVER[category] });
    }
    setTick(t => t + 1);
  };

  return (
    <div className="fixed top-20 right-6 z-50 pointer-events-auto">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full border-2 transition-all ${
          isOpen ? "bg-red-500 border-white text-white rotate-90" : "bg-black/80 border-red-500/50 text-red-500 hover:border-red-500"
        }`}
      >
        {isOpen ? <X size={20} /> : <Settings size={20} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="absolute top-12 right-0 w-80 bg-aetheria-950/95 backdrop-blur-xl border-2 border-aetheria-800 rounded-xl shadow-aetheria-lg overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-black/40 border-b border-aetheria-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-red-500" />
                <span className="font-fantasy text-xs uppercase tracking-widest text-aetheria-200">Debug Control</span>
              </div>
              <button 
                onClick={toggleGlobal}
                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                  DEBUG_CONFIG.ENABLED 
                    ? "bg-red-500/20 border-red-500 text-red-500" 
                    : "bg-gray-500/20 border-gray-500 text-gray-500"
                }`}
              >
                {DEBUG_CONFIG.ENABLED ? "MASTER ON" : "MASTER OFF"}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-aetheria-800">
              <TabButton 
                active={activeTab === 'client'} 
                onClick={() => setActiveTab('client')}
                icon={<Monitor size={14} />}
                label="Client"
              />
              <TabButton 
                active={activeTab === 'server'} 
                onClick={() => setActiveTab('server')}
                icon={<ServerIcon size={14} />}
                label="Server"
              />
              <TabButton 
                active={activeTab === 'logs'} 
                onClick={() => setActiveTab('logs')}
                icon={<ScrollText size={14} />}
                label="Logs"
              />
            </div>

            {/* List */}
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {activeTab === 'logs' ? (
                <div className="space-y-1">
                  <button 
                    onClick={() => logger.downloadLogs()}
                    className="w-full flex items-center justify-center gap-2 p-2 mb-4 bg-red-500/20 border border-red-500 rounded text-red-500 text-[10px] font-bold hover:bg-red-500/40 transition-all"
                  >
                    <FileDown size={14} /> DOWNLOAD LOG FILE (.TXT)
                  </button>
                  {logger.getBuffer().length === 0 ? (
                    <div className="text-center py-8 text-[10px] text-aetheria-800 italic">No logs in buffer yet...</div>
                  ) : (
                    logger.getBuffer().slice().reverse().map((line, i) => (
                      <div key={i} className="text-[9px] font-mono text-aetheria-600 wrap-break-word border-b border-white/5 pb-1 last:border-0 leading-tight">
                        {line}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                Object.keys(DEBUG_CONFIG[activeTab.toUpperCase() as 'CLIENT' | 'SERVER']).map((cat) => {
                  const category = cat as DebugCategory;
                  const enabled = DEBUG_CONFIG[activeTab.toUpperCase() as 'CLIENT' | 'SERVER'][category];
                  
                  return (
                    <div 
                      key={category}
                      className="flex items-center justify-between p-2 rounded bg-black/20 border border-white/5 hover:bg-black/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-gray-600"}`} />
                        <span className="text-[10px] font-mono text-aetheria-600 uppercase tracking-tighter">{category}</span>
                      </div>
                      <button
                        onClick={() => toggleCategory(activeTab, category)}
                        className={`w-10 h-5 rounded-full relative transition-all ${enabled ? "bg-green-500/20 border-green-500/50" : "bg-gray-800 border-gray-700"} border`}
                      >
                        <motion.div 
                          animate={{ x: enabled ? 20 : 2 }}
                          className={`absolute top-1 w-2.5 h-2.5 rounded-full ${enabled ? "bg-green-400" : "bg-gray-500"}`}
                        />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-black/40 border-t border-aetheria-800 flex items-center gap-2">
              <Activity size={12} className="text-green-500 animate-pulse" />
              <span className="text-[9px] text-aetheria-800 font-mono">SYSTEM_STABLE // DEBUG_MODE_ACTIVE</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-fantasy uppercase tracking-widest transition-all ${
      active ? "bg-aetheria-900 text-aetheria-200 border-b-2 border-red-500" : "text-aetheria-600 hover:bg-aetheria-900/50"
    }`}
  >
    {icon}
    {label}
  </button>
);
