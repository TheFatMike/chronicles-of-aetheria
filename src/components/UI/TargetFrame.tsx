/**
 * @file src/components/UI/TargetFrame.tsx
 * @description Displays information about the player's currently selected target.
 * Shows health, name, and level of the targeted entity.
 * @importance Essential: Vital for combat awareness, allowing players to monitor their opponent's status.
 */
import { motion, AnimatePresence } from "motion/react";
import { useEffect } from "react";
import { useGameStore } from "../../store/useGameStore";
import { X } from "lucide-react";

export const TargetFrame = () => {
  const currentTargetSnapshot = useGameStore((state) => state.currentTarget);
  const setTarget = useGameStore((state) => state.setTarget);
  
  // Use a selector to get the LIVE version of the target from the store
  const liveTarget = useGameStore((state) => {
    if (!currentTargetSnapshot) return null;
    return state.entities[currentTargetSnapshot.id] || state.players[currentTargetSnapshot.id] || currentTargetSnapshot;
  });

  if (!currentTargetSnapshot || !liveTarget) return null;

  const getHpColor = () => {
    const hp = liveTarget.hp ?? 100;
    const maxHp = liveTarget.maxHp ?? 100;
    const percent = (hp / maxHp) * 100;
    if (percent > 60) return "bg-green-500";
    if (percent > 25) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getHostilityColor = () => {
    if (liveTarget.type === 'player') return 'text-blue-400';
    
    // Aggressive if base behavior is aggressive OR if currently chasing someone
    const isAggressive = liveTarget.behaviorType === 'aggressive' || liveTarget.aiState === 'CHASE';
    
    if (isAggressive) return 'text-red-500';
    if (liveTarget.behaviorType === 'neutral') return 'text-yellow-400';
    if (liveTarget.behaviorType === 'passive') return 'text-green-500';
    return 'text-aetheria-400';
  };

  const getHostilityBg = () => {
    const isAggressive = liveTarget.behaviorType === 'aggressive' || liveTarget.aiState === 'CHASE';
    
    if (isAggressive) return 'bg-red-500/10 border-red-500/20';
    if (liveTarget.behaviorType === 'neutral') return 'bg-yellow-500/10 border-yellow-500/20';
    if (liveTarget.behaviorType === 'passive') return 'bg-green-500/10 border-green-500/20';
    return 'bg-aetheria-900/40 border-aetheria-800/40';
  };

  const getHostilityLabel = () => {
    if (liveTarget.type === 'player') return 'Player';
    
    const isAggressive = liveTarget.behaviorType === 'aggressive' || liveTarget.aiState === 'CHASE';
    
    if (isAggressive) return 'Hostile';
    if (liveTarget.behaviorType === 'neutral') return 'Neutral';
    if (liveTarget.behaviorType === 'passive') return 'Passive';
    return liveTarget.type;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        className="fixed top-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <div 
          onContextMenu={(e) => {
            if (liveTarget.type === 'player') {
              e.preventDefault();
              useGameStore.getState().setContextMenu({
                x: e.clientX,
                y: e.clientY,
                title: liveTarget.name,
                targetId: liveTarget.id,
                targetType: 'player'
              });
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="bg-aetheria-950/90 backdrop-blur-xl border-2 border-aetheria-400/40 p-4 rounded-xl w-72 shadow-aetheria-lg pointer-events-auto relative overflow-hidden"
        >
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-aetheria-400/30 to-transparent" />

          {/* Close button */}
          <button 
            onClick={() => setTarget(null)}
            className="absolute top-2 right-2 text-aetheria-600 hover:text-aetheria-200 transition-colors p-1"
          >
            <X size={16} />
          </button>

          <div className="flex items-center space-x-4 mb-3">
            {liveTarget.type !== 'teleport_crystal' && (
              <div className="relative">
                <div 
                  className="w-12 h-12 rounded-lg border-2 border-aetheria-400/30 shadow-lg overflow-hidden flex items-center justify-center bg-black/40"
                >
                  <div 
                    className="w-full h-full opacity-40"
                    style={{ backgroundColor: liveTarget.color || "#ccc" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                     {liveTarget.type === 'enemy' && (
                       <div className="w-6 h-6 bg-red-500/20 rounded-full border border-red-500/40 flex items-center justify-center text-red-500 text-[10px] font-black">!</div>
                     )}
                     {liveTarget.type === 'npc' && (
                       <div className="w-6 h-6 bg-blue-500/20 rounded-full border border-blue-500/40 flex items-center justify-center text-blue-500 text-[10px] font-black">?</div>
                     )}
                  </div>
                </div>
                {/* Level Badge */}
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-aetheria-800 rounded-full border-2 border-aetheria-950 flex items-center justify-center text-[9px] font-black text-aetheria-200 shadow-aetheria-sm z-20 text-center leading-none translate-x-1 translate-y-1">
                  {liveTarget.level || 1}
                </div>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-col">
                <span className="font-display font-black text-xs uppercase tracking-tight truncate text-aetheria-200">
                  {liveTarget.type === 'teleport_crystal' ? (
                    <>
                      Teleport Crystal <span style={{ color: liveTarget.color }}>●</span>
                    </>
                  ) : (
                    <>
                      {liveTarget.name}
                      {liveTarget.behaviorType && (
                        <span className={`ml-2 text-[10px] ${getHostilityColor()} opacity-80`}>
                          ●
                        </span>
                      )}
                    </>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-aetheria-600 font-black uppercase tracking-[0.2em] opacity-80">
                    {liveTarget.class || (liveTarget.type === 'teleport_crystal' ? "Travel Network" : liveTarget.type)}
                  </span>
                  {liveTarget.behaviorType && (
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${getHostilityBg()} ${getHostilityColor()}`}>
                      {getHostilityLabel()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* HP Bar */}
          <div className="space-y-1">
            <div className="relative h-5 bg-black/60 rounded-md overflow-hidden border border-aetheria-400/20 shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(liveTarget.hp ?? 0) / (liveTarget.maxHp ?? 100) * 100}%` }}
                className={`h-full ${getHpColor()} transition-all duration-500 ease-out relative`}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-linear-to-b from-white/20 to-transparent" />
              </motion.div>
              
              <div className="absolute inset-0 flex items-center justify-center text-[9px] text-aetheria-200 font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-widest">
                {liveTarget.isDead ? "DEFEATED" : `${liveTarget.hp ?? 0} / ${liveTarget.maxHp ?? 100}`}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
