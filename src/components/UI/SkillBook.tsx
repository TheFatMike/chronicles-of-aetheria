/**
 * @file src/components/UI/SkillBook.tsx
 * @description The interface for viewing and managing character skills and abilities.
 * Allows players to review their powers and drag them to the hotbar for use.
 * @importance Essential: Core for character progression and combat customization.
 */
import React, { memo } from "react";
import { motion } from "motion/react";
import { X, Book, Sparkles, Target, Zap, Clock } from "lucide-react";
import { Skill } from "../../types";
import { useGameStore } from "../../store/useGameStore";
import { ALL_SKILLS, getClassSkills } from "../../data/skills";

interface SkillBookProps {
  onClose: () => void;
  playerClass: string;
  learnedSkills: string[];
}

export const SkillBook = memo(({ onClose, playerClass, learnedSkills }: SkillBookProps) => {
  // Get player level from store
  const playerId = useGameStore(s => s.id);
  const playerLevel = useGameStore(s => s.players[playerId || ""]?.level || 1);
  
  // For now, let's just show skills relevant to the class
  const availableSkills = getClassSkills(playerClass);

  const handleDragStart = (e: React.DragEvent, skill: Skill) => {
    const isLocked = skill.levelRequired && skill.levelRequired > playerLevel;
    if (isLocked) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("application/json", JSON.stringify({ type: 'skill', skill }));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pointer-events-none"
    >
      <div className="bg-[#1a140f]/95 backdrop-blur-md border-2 sm:border-4 border-[#4a3a2a] rounded-xl overflow-hidden shadow-2xl pointer-events-auto w-full max-w-2xl h-full max-h-[85vh] sm:max-h-[700px] flex flex-col relative transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-[#4a3a2a] bg-[#2d221a]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#c2a472]/10 rounded-lg border border-[#c2a472]/20">
              <Book className="w-5 h-5 sm:w-6 sm:h-6 text-[#c2a472]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-[#f4e4bc] uppercase tracking-tight leading-none">Ancient Grimoire</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-fantasy text-[#8b6b4d] uppercase tracking-[0.2em]">{playerClass} Abilities</p>
                <div className="h-2 w-px bg-[#4a3a2a]" />
                <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">Level {playerLevel}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8b6b4d] hover:text-white transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableSkills.map((skill) => {
              const isLocked = skill.levelRequired && skill.levelRequired > playerLevel;
              
              return (
                <motion.div
                  key={skill.id}
                  draggable={!isLocked}
                  onDragStart={(e: any) => handleDragStart(e, skill)}
                  whileHover={!isLocked ? { scale: 1.02, borderColor: '#c2a472' } : {}}
                  className={`bg-[#120e0a] border-2 rounded-xl p-4 flex gap-4 transition-colors group relative overflow-hidden
                    ${isLocked ? 'border-red-900/20 opacity-60 grayscale cursor-not-allowed' : 'border-[#4a3a2a]/40 cursor-grab active:cursor-grabbing'}
                  `}
                >
                  {/* Skill Icon */}
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-[#1a140f] border-2 rounded-lg flex items-center justify-center shrink-0 shadow-inner relative z-10 transition-colors
                    ${isLocked ? 'border-red-900/40' : 'border-[#4a3a2a] group-hover:border-[#c2a472]/50'}
                  `}>
                    <span className={`text-3xl sm:text-4xl select-none transition-transform ${!isLocked ? 'group-hover:scale-110' : ''}`}>
                      {isLocked ? '🔒' : skill.icon}
                    </span>
                    <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
                  </div>

                  {/* Skill Info */}
                  <div className="flex-1 min-w-0 relative z-10">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm sm:text-base font-bold truncate uppercase font-display tracking-tight
                        ${isLocked ? 'text-[#8b6b4d]' : 'text-[#f4e4bc]'}
                      `}>
                        {skill.name}
                      </h3>
                      {isLocked ? (
                        <div className="bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/40 shadow-[0_0_10px_rgba(153,27,27,0.1)]">
                          <span className="text-[8px] font-black text-red-500 uppercase">Lvl {skill.levelRequired}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-[#2d221a] px-1.5 py-0.5 rounded border border-[#4a3a2a]">
                          <Zap className="w-2.5 h-2.5 text-blue-400" />
                          <span className="text-[10px] font-mono text-blue-200">{skill.manaCost}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-[#8b6b4d] line-clamp-2 leading-relaxed mb-3 italic">"{skill.description}"</p>
                    
                    {!isLocked && (
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#c2a472]/60" />
                          <span className="text-[10px] font-mono text-[#c2a472]">{skill.cooldown}s</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3 h-3 text-[#c2a472]/60" />
                          <span className="text-[10px] font-mono text-[#c2a472] uppercase">{skill.targetType}</span>
                        </div>
                        {skill.range && (
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-[#c2a472]/60" />
                            <span className="text-[10px] font-mono text-[#c2a472]">{skill.range}m</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Decorative background element */}
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                     <Book size={80} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#120e0a] border-t border-[#4a3a2a] text-center">
          <p className="text-[10px] font-fantasy text-[#8b6b4d] uppercase tracking-widest">
            Drag skills to your Hotbar to use them in battle
          </p>
        </div>
      </div>
    </motion.div>
  );
});

SkillBook.displayName = "SkillBook";
