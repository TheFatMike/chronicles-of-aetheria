/**
 * @file src/components/UI/PlayerHUD.tsx
 * @description The primary head-up display for the local player.
 * Shows essential vitals like Health, Mana, Experience, and level.
 * @importance Critical: The most vital UI element for player survival and awareness in the game world.
 */
import { getAccountRole } from "../../lib/permissions";
import { motion } from "motion/react";
import { Character } from "@shared/types";

interface PlayerHUDProps {
  character: Character;
  userEmail?: string | null;
}

export const PlayerHUD = ({ character, userEmail }: PlayerHUDProps) => {
  const role = getAccountRole(userEmail);

  return (
    <div className="fixed top-2 left-2 lg:top-6 lg:left-6 z-60 bg-aetheria-950/90 backdrop-blur-md p-2 lg:p-4 rounded-xl border-2 border-aetheria-800 text-aetheria-400 shadow-aetheria-lg select-none w-full max-w-48 lg:max-w-none lg:w-auto">
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-aetheria-900 rounded border-2 border-aetheria-800 flex items-center justify-center font-black text-aetheria-200 text-xs sm:text-base">
            {character.class?.[0]?.toUpperCase() || "?"}
          </div>
          {/* Level Badge */}
          <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-aetheria-800 rounded-full border-2 border-aetheria-950 flex items-center justify-center text-[8px] sm:text-[10px] font-black text-aetheria-200 shadow-aetheria-sm z-20 text-center leading-none translate-x-1 translate-y-1">
            {character.level || 1}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex gap-1 sm:gap-2 items-baseline flex-wrap min-w-0">
            <h2 className="text-sm sm:text-lg font-black text-aetheria-200 uppercase tracking-tight truncate max-w-[80px] sm:max-w-none">
              {character.name}
            </h2>
          </div>
          <div className="space-y-1 mt-1 min-w-[120px] sm:min-w-[180px]">
            {/* HP Bar */}
            <div className="h-1.5 sm:h-2 bg-black/40 rounded overflow-hidden relative border border-black/20" title={`Health: ${character.hp}/${character.maxHp}`}>
              <motion.div 
                className="h-full bg-linear-to-r from-red-600 to-red-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]" 
                animate={{ width: `${(character.hp / (character.maxHp || 1)) * 100}%` }} 
              />
            </div>
            {/* MP Bar */}
            <div className="h-1 sm:h-1.5 bg-black/40 rounded overflow-hidden relative border border-black/20" title={`Mana: ${character.mp}/${character.maxMp}`}>
              <motion.div 
                className="h-full bg-linear-to-r from-blue-600 to-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]" 
                animate={{ width: `${(character.mp / (character.maxMp || 1)) * 100}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
