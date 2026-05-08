import { motion } from "motion/react";
import { memo } from "react";
import { ParticleEffect } from "./Particles";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = memo(({ message = "COMMUNING WITH THE ANCIENTS..." }: LoadingScreenProps) => {
  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#0d0907] overflow-hidden">
      {/* Background Ambience - Magical Mist/Void */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-[#4a3420]/30 via-transparent to-transparent" />
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
            className="w-48 h-48 border-2 border-double border-[#c2a472]/20 rounded-full flex items-center justify-center"
          >
             {/* Inner runes or patterns could go here */}
             <div className="w-40 h-40 border border-[#c2a472]/10 rounded-full border-dashed" />
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
            className="absolute w-32 h-32 border border-[#c2a472]/40 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(194,164,114,0.15)]"
          />
          
          <div className="absolute w-16 h-16 bg-[#c2a472] rounded-full blur-2xl opacity-20" />
          
          <div className="absolute font-serif italic text-3xl text-[#c2a472] tracking-tighter opacity-90 drop-shadow-[0_0_10px_rgba(194,164,114,0.5)]">
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
              className="text-[#f4e4bc] font-serif italic text-xs tracking-[0.2em] uppercase text-center"
            >
              {message}
            </motion.p>
            <div className="flex items-center gap-2">
              <span className="text-[#8b6b4d] font-fantasy text-[10px] tracking-widest uppercase">Weaving the World-Thread</span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-[#1a140f] rounded-full overflow-hidden border border-[#4a3a2a]">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: ["0%", "20%", "50%", "75%", "100%"] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="h-full bg-linear-to-r from-[#5d432c] via-[#c2a472] to-[#f4e4bc] shadow-[0_0_12px_rgba(194,164,114,0.6)]"
            />
          </div>

          <div className="flex justify-between w-full px-2">
            <span className="text-[#4a3a2a] font-serif text-[8px] uppercase tracking-wider">Realm Genesis</span>
            <span className="text-[#4a3a2a] font-serif text-[8px] uppercase tracking-wider">Arcane v.IX</span>
          </div>
        </div>
      </div>

      {/* Ornate corner accents */}
      <div className="absolute top-12 left-12 w-16 h-16 border-t-2 border-l-2 border-[#c2a472]/10 rounded-tl-xl shadow-[-5px_-5px_15px_rgba(0,0,0,0.5)]" />
      <div className="absolute top-12 right-12 w-16 h-16 border-t-2 border-r-2 border-[#c2a472]/10 rounded-tr-xl shadow-[5px_-5px_15px_rgba(0,0,0,0.5)]" />
      <div className="absolute bottom-12 left-12 w-16 h-16 border-b-2 border-l-2 border-[#c2a472]/10 rounded-bl-xl shadow-[-5px_5px_15px_rgba(0,0,0,0.5)]" />
      <div className="absolute bottom-12 right-12 w-16 h-16 border-b-2 border-r-2 border-[#c2a472]/10 rounded-br-xl shadow-[5px_5px_15px_rgba(0,0,0,0.5)]" />
    </div>
  );
});

LoadingScreen.displayName = "LoadingScreen";
