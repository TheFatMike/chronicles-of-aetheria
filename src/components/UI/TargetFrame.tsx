import { motion, AnimatePresence } from "motion/react";
import { useEffect } from "react";
import { useGameStore } from "../../store/useGameStore";

export const TargetFrame = () => {
  const currentTarget = useGameStore((state) => state.currentTarget);
  const setTarget = useGameStore((state) => state.setTarget);

  if (!currentTarget) return null;

  const getHpColor = () => {
    if (currentTarget.hp === undefined) return "bg-green-500";
    const percent = (currentTarget.hp / (currentTarget.maxHp || 100)) * 100;
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
            if (currentTarget.type === 'player') {
              e.preventDefault();
              useGameStore.getState().setContextMenu({
                x: e.clientX,
                y: e.clientY,
                title: currentTarget.name,
                targetId: currentTarget.id
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
              style={{ backgroundColor: currentTarget.color || "#ccc" }}
            />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-sm tracking-wide truncate max-w-[120px]">
                  {currentTarget.name}
                </span>
                <span className="text-yellow-400 font-mono text-xs">
                  {currentTarget.level}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                <span>{currentTarget.type} {currentTarget.class ? `- ${currentTarget.class}` : ""}</span>
                {currentTarget.role && currentTarget.role !== 'player' && (
                  <span className={`text-[8px] px-1 rounded font-black ${
                    currentTarget.role === 'dev' ? 'bg-amber-500 text-black' : 
                    currentTarget.role === 'admin' ? 'bg-red-600 text-white' : 
                    'bg-blue-600 text-white'
                  }`}>
                    {currentTarget.role.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* HP Bar */}
          <div className="relative h-4 bg-slate-900 rounded overflow-hidden border border-slate-800">
            <div 
              style={{ width: `${(currentTarget.hp ?? 100) / (currentTarget.maxHp ?? 100) * 100}%` }}
              className={`h-full ${getHpColor()} shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] transition-all duration-300 ease-out`}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold drop-shadow">
              {currentTarget.isDead ? "DEAD" : `${currentTarget.hp ?? 0} / ${currentTarget.maxHp ?? 100}`}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
