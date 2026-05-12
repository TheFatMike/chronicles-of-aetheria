/**
 * @file src/components/UI/TargetFrame.tsx
 * @description Displays information about the player's currently selected target.
 * Shows health, name, and level of the targeted entity.
 * @importance Essential: Vital for combat awareness, allowing players to monitor their opponent's status.
 */
import { motion, AnimatePresence } from "motion/react";
import { useEffect } from "react";
import { useGameStore } from "../../store/useGameStore";

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed top-2 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-4 pointer-events-none"
      >
        <div 
          onContextMenu={(e) => {
            if (liveTarget.type === 'player') {
              e.preventDefault();
              useGameStore.getState().setContextMenu({
                x: e.clientX,
                y: e.clientY,
                title: liveTarget.name,
                targetId: liveTarget.id
              });
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="bg-black/60 backdrop-blur-md border-2 border-slate-700 p-2 rounded-lg w-48 sm:w-64 shadow-2xl pointer-events-auto relative"
        >
          {/* Close button */}
          <button 
            onClick={() => setTarget(null)}
            className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-black"
          >
            ×
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div 
              className="w-10 h-10 rounded shadow-inner"
              style={{ backgroundColor: liveTarget.color || "#ccc" }}
            />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-sm tracking-wide truncate max-w-[120px]">
                  {liveTarget.name}
                </span>
                <span className="text-yellow-400 font-mono text-xs">
                  {liveTarget.level}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                <span>{liveTarget.type} {liveTarget.class ? `- ${liveTarget.class}` : ""}</span>
              </div>
            </div>
          </div>

          {/* HP Bar */}
          <div className="relative h-4 bg-slate-900 rounded overflow-hidden border border-slate-800">
            <div 
              style={{ width: `${(liveTarget.hp ?? 0) / (liveTarget.maxHp ?? 100) * 100}%` }}
              className={`h-full ${getHpColor()} shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] transition-all duration-300 ease-out`}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow">
              {liveTarget.isDead ? "DEAD" : `${liveTarget.hp ?? 0} / ${liveTarget.maxHp ?? 100}`}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
