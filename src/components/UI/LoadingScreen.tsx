/**
 * @file src/components/UI/LoadingScreen.tsx
 * @description The visual interface shown during loading states.
 * Features thematic animations and particles to keep the player engaged while assets load.
 * @importance Essential: Provides a premium and polished experience during necessary wait times.
 */
import { motion } from "motion/react";
import { memo } from "react";
import { ParticleEffect } from "./Particles";

interface LoadingScreenProps {
  message?: string;
  progress?: number;
  detail?: string;
}

export const LoadingScreen = memo(({ 
  message = "COMMUNING WITH THE ANCIENTS...",
  progress,
  detail
}: LoadingScreenProps) => {
  // Use provided progress or fallback to the looping animation if progress is undefined
  const isIndeterminate = progress === undefined;
  const displayProgress = progress ?? 0;

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-aetheria-950 overflow-hidden">
      {/* Background Ambience - Magical Mist/Void */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-aetheria-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-20" />
      </div>

      <ParticleEffect />

      <div className="relative flex flex-col items-center gap-10">
        {/* Magic Circle / Sigil */}
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ 
              rotate: 360,
            }}
            transition={{ 
              duration: 25, repeat: Infinity, ease: "linear"
            }}
            className="w-48 h-48 border-2 border-double border-aetheria-400/20 rounded-full flex items-center justify-center"
          >
             {/* Inner runes or patterns could go here */}
             <div className="w-40 h-40 border border-aetheria-400/10 rounded-full border-dashed" />
          </motion.div>

          <motion.div
            animate={{ 
              rotate: -360,
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute w-32 h-32 border border-aetheria-400/40 rounded-full flex items-center justify-center shadow-gold-glow/20"
          />
          
          <div className="absolute w-16 h-16 bg-aetheria-400 rounded-full blur-2xl opacity-20" />
          
          <div className="absolute font-serif italic text-3xl text-aetheria-400 tracking-tighter opacity-90 drop-shadow-gold-glow">
            ✨
          </div>
        </div>

        {/* Fantasy Text and Progress bar */}
        <div className="flex flex-col items-center gap-6 min-w-[320px]">
          <div className="flex flex-col items-center gap-2">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-aetheria-200 font-serif italic text-xs tracking-[0.2em] uppercase text-center"
            >
              {message}
            </motion.p>
            {detail && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-aetheria-600 font-fantasy text-[10px] tracking-widest uppercase"
              >
                {detail}
              </motion.span>
            )}
            {!detail && (
              <div className="flex items-center gap-2">
                <span className="text-aetheria-600 font-fantasy text-[10px] tracking-widest uppercase">Weaving the World-Thread</span>
              </div>
            )}
          </div>

          <div className="w-full h-1.5 bg-aetheria-950 rounded-full overflow-hidden border border-aetheria-800 relative">
            {isIndeterminate ? (
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: ["0%", "20%", "50%", "75%", "100%"] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="h-full bg-linear-to-r from-aetheria-900 via-aetheria-400 to-aetheria-200 shadow-gold-glow"
              />
            ) : (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${displayProgress}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
                className="h-full bg-linear-to-r from-aetheria-900 via-aetheria-400 to-aetheria-200 shadow-gold-glow"
              />
            )}
          </div>

          <div className="flex justify-between w-full px-2">
            <span className="text-aetheria-800 font-serif text-[8px] uppercase tracking-wider">
              {isIndeterminate ? "Realm Genesis" : `Constructing Reality (${Math.round(displayProgress)}%)`}
            </span>
            <span className="text-aetheria-800 font-serif text-[8px] uppercase tracking-wider">Arcane v.IX</span>
          </div>
        </div>
      </div>

      {/* Ornate corner accents */}
      <div className="absolute top-12 left-12 w-16 h-16 border-t-2 border-l-2 border-aetheria-400/10 rounded-tl-xl shadow-[-5px_-5px_15px_rgba(0,0,0,0.5)]" />
      <div className="absolute top-12 right-12 w-16 h-16 border-t-2 border-r-2 border-aetheria-400/10 rounded-tr-xl shadow-[5px_-5px_15px_rgba(0,0,0,0.5)]" />
      <div className="absolute bottom-12 left-12 w-16 h-16 border-b-2 border-l-2 border-aetheria-400/10 rounded-bl-xl shadow-[-5px_5px_15px_rgba(0,0,0,0.5)]" />
      <div className="absolute bottom-12 right-12 w-16 h-16 border-b-2 border-r-2 border-aetheria-400/10 rounded-br-xl shadow-[5px_5px_15px_rgba(0,0,0,0.5)]" />
    </div>
  );
});

LoadingScreen.displayName = "LoadingScreen";
