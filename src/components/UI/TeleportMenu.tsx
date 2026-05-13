/**
 * @file src/components/UI/TeleportMenu.tsx
 * @description The fast-travel interface for the Teleport Crystal network.
 * Displays all discovered locations and allows the player to travel between them for a cost.
 * @importance Essential: The primary UI for the teleportation game mechanic.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X, Zap, Coins, Navigation } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { OBJECT_TEMPLATES } from '../../data/world/templates';

const TELEPORT_COST = 50;

export const TeleportMenu = () => {
  const { 
    isOpen, 
    discoveredIds, 
    worldObjects, 
    activeCrystalId,
    playerGold
  } = useGameStore(useShallow(s => ({
    isOpen: s.isTeleportMenuOpen,
    discoveredIds: s.discoveredTeleports,
    worldObjects: s.worldObjects,
    activeCrystalId: s.activeTeleportCrystalId,
    playerGold: s.players[s.id || '']?.gold || 0,
  })));

  const uiScale = useGameStore(s => s.uiScale);
  const setOpen = useGameStore(s => s.setTeleportMenuOpen);
  const requestTeleport = useGameStore(s => s.requestTeleport);
  const updatePlayer = useGameStore(s => s.updatePlayer);
  const playerId = useGameStore(s => s.id);

  if (!isOpen) return null;

  // Filter objects to find crystals that have been discovered
  const destinations = discoveredIds
    .map(id => worldObjects[id])
    .filter(obj => obj && obj.type === 'teleport_crystal' && obj.id !== activeCrystalId);

  const currentCrystal = activeCrystalId ? worldObjects[activeCrystalId] : null;
  const currentName = currentCrystal?.name || "Ancient Crystal";

  const handleTeleport = (dest: any) => {
    if (playerGold < TELEPORT_COST) return;

    // Deduct gold
    if (playerId) {
      updatePlayer(playerId, { gold: playerGold - TELEPORT_COST });
    }
    
    // Close menu
    setOpen(false);
    
    // Request teleport to destination
    const targetPos: [number, number, number] = [
      dest.pos[0] + 2,
      dest.pos[1],
      dest.pos[2] + 2
    ];
    
    requestTeleport(targetPos);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 * uiScale, y: 20 }}
          animate={{ opacity: 1, scale: uiScale, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 * uiScale, y: 20 }}
          style={{ scale: uiScale }}
          className="w-[500px] bg-[#1a140f]/95 border-4 border-[#4a3a2a] rounded-2xl shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[80vh] pointer-events-auto backdrop-blur-sm"
        >
          {/* Header */}
          <div className="p-8 bg-linear-to-b from-purple-900/20 to-transparent border-b border-[#4a3a2a]/50 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-purple-500 to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                  <Zap className="text-purple-400" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#f4e4bc] uppercase tracking-widest">Etheria Network</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-[#8b6b4d] font-black uppercase tracking-widest">
                      Connected: <span className="text-emerald-400">{currentName}</span>
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl bg-black/40 border border-[#4a3a2a] text-[#8b6b4d] hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Destination List */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] text-[#8b6b4d] font-black uppercase tracking-[0.2em]">Available Conduits</span>
              <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                <Coins size={12} className="text-amber-500" />
                <span className="text-[10px] text-amber-500 font-black">{playerGold}</span>
              </div>
            </div>

            {destinations.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <Navigation size={48} className="text-[#8b6b4d]" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-[#f4e4bc]">No Other Crystals Found</p>
                  <p className="text-[10px] font-bold text-[#8b6b4d] max-w-[200px]">
                    Discover more crystals across the world to link them to the network.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {destinations.map(dest => (
                  <button
                    key={dest.id}
                    onClick={() => handleTeleport(dest)}
                    disabled={playerGold < TELEPORT_COST}
                    className="group relative flex items-center justify-between p-5 bg-black/40 border-2 border-[#4a3a2a]/50 rounded-2xl transition-all hover:bg-purple-500/5 hover:border-purple-500/30 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-[#4a3a2a]/50 overflow-hidden"
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                        <MapPin className="text-purple-400" size={18} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-[13px] font-black text-[#f4e4bc] uppercase tracking-wider group-hover:text-purple-300 transition-colors">
                          {dest.name || "Unnamed Crystal"}
                        </h4>
                        <p className="text-[9px] text-[#8b6b4d] font-bold uppercase tracking-widest">
                          Sectors: {Math.round(dest.pos[0])}X, {Math.round(dest.pos[2])}Z
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 relative z-10">
                      <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-xl border border-[#4a3a2a]">
                        <Coins size={12} className="text-amber-500" />
                        <span className={`text-[10px] font-black ${playerGold >= TELEPORT_COST ? 'text-white' : 'text-rose-500'}`}>
                          {TELEPORT_COST}
                        </span>
                      </div>
                      {playerGold < TELEPORT_COST && (
                        <span className="text-[8px] text-rose-500/70 font-black uppercase tracking-tighter">Insufficient Gold</span>
                      )}
                    </div>
                    
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-linear-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-black/60 border-t border-[#4a3a2a] flex items-center justify-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
             <span className="text-[9px] text-[#8b6b4d] font-black uppercase tracking-[0.3em]">Conduit Stabilization Active</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
