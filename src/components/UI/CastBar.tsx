/**
 * @file src/components/UI/CastBar.tsx
 * @description Renders a progress bar for the current casting action.
 * Provides visual feedback on the timing of skills and abilities.
 * @importance Essential: Crucial for gameplay clarity, allowing players to time their actions and react to enemy casts.
 */
import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';

export const CastBar = () => {
  const castState = useGameStore(state => state.castState);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!castState?.active) {
      setProgress(0);
      return;
    }

    let animationFrame: number;

    const updateProgress = () => {
      const now = Date.now();
      const elapsed = now - castState.startTime;
      const newProgress = Math.min(100, (elapsed / castState.duration) * 100);
      
      setProgress(newProgress);

      if (newProgress < 100) {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(animationFrame);
  }, [castState]);

  if (!castState?.active) return null;

  return (
    <div className="fixed bottom-48 lg:bottom-56 left-1/2 -translate-x-1/2 w-64 pointer-events-none z-50">
      <div className="bg-slate-900/80 backdrop-blur-sm border-2 border-slate-700 rounded-lg p-1 shadow-2xl">
        <div className="flex justify-between items-center px-1 mb-1">
          <span className="text-[10px] text-white font-bold uppercase tracking-wider">
            {castState.name}
          </span>
          <span className="text-[9px] text-slate-400 font-mono">
            {(castState.duration / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-sm overflow-hidden relative">
          <div 
            className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
