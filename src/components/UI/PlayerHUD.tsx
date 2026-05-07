import { getAccountRole } from "../../lib/permissions";
import { motion } from "motion/react";
import { Character } from "../../types";

interface PlayerHUDProps {
  character: Character;
  userEmail?: string | null;
}

export const PlayerHUD = ({ character, userEmail }: PlayerHUDProps) => {
  const role = getAccountRole(userEmail);

  return (
    <div className="fixed top-2 left-2 sm:top-6 sm:left-6 z-60 bg-[#1a140f]/90 backdrop-blur-md p-2 sm:p-4 rounded-xl border-2 border-[#4a3a2a] text-[#c2a472] shadow-[0_0_30px_rgba(0,0,0,0.5)] select-none max-w-[200px] sm:max-w-none">
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2d221a] rounded border-2 border-[#4a3a2a] flex items-center justify-center font-black text-[#f4e4bc] text-xs sm:text-base shrink-0">
          {character.class?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <div className="flex gap-1 sm:gap-2 items-baseline flex-wrap min-w-0">
            <h2 className="text-sm sm:text-lg font-black text-[#f4e4bc] uppercase tracking-tight truncate max-w-[80px] sm:max-w-none">
              {character.name}
            </h2>
            <span className="text-[8px] sm:text-[10px] font-bold text-[#8b6b4d]">LVL {character.level}</span>
            {role !== 'player' && (
              <span className={`text-[7px] sm:text-[8px] px-1 rounded font-black ${
                role === 'dev' ? 'bg-amber-500 text-black' :
                role === 'admin' ? 'bg-red-600 text-white' :
                'bg-blue-600 text-white'
              }`}>
                {role.toUpperCase()}
              </span>
            )}
          </div>
          <div className="space-y-1 mt-1 min-w-[120px] sm:min-w-[180px]">
            <div className="h-1.5 sm:h-2 bg-black/40 rounded overflow-hidden">
              <motion.div 
                className="h-full bg-red-600" 
                animate={{ width: `${(character.hp / (character.maxHp || 1)) * 100}%` }} 
              />
            </div>
            <div className="h-1 sm:h-1.5 bg-black/40 rounded overflow-hidden">
              <motion.div 
                className="h-full bg-blue-600" 
                animate={{ width: `${(character.mp / (character.maxMp || 1)) * 100}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
