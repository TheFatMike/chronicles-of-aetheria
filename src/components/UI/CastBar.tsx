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
  const uiScale = useGameStore(state => state.uiScale);
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

  const remainingTime = Math.max(0, (castState.duration - (progress / 100 * castState.duration)) / 1000);

  return (
    <div className="fixed bottom-48 lg:bottom-56 left-1/2 -translate-x-1/2 w-80 pointer-events-none z-50">
      <div 
        className="bg-[#1a140f]/95 border-4 border-[#4a3a2a] rounded-2xl p-4 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.9)] overflow-hidden relative"
        style={{ transform: `scale(${uiScale})` }}
      >
        {/* Parchment texture overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
        
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#c2a472]/20 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#c2a472]/20 rounded-tr-xl pointer-events-none" />
        
        <div className="flex justify-between items-end px-1 mb-3 relative z-10">
          <div className="flex flex-col">
            <span className="text-[8px] text-[#8b6b4d] font-black uppercase tracking-[0.3em] mb-0.5">Action in Progress</span>
            <span className="text-[12px] text-[#f4e4bc] font-black uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
              {castState.name}
            </span>
          </div>
        </div>
        
        <div className="h-5 bg-black/60 rounded-xl border-2 border-[#4a3a2a] overflow-hidden relative z-10 shadow-inner flex items-center justify-center">
          <div 
            className="absolute left-0 top-0 h-full bg-linear-to-r from-amber-700 via-amber-400 to-amber-700 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          >
             {/* Magical shimmer effect */}
             <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          </div>

          <span className="relative z-20 text-[10px] text-[#f4e4bc] font-black font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
            {remainingTime.toFixed(1)}s
          </span>
        </div>

        {/* Ambient Glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1 bg-linear-to-r from-transparent via-amber-500/10 to-transparent" />
      </div>
    </div>
  );
};
