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
  const isMobile = useGameStore(s => s.isMobile);
  
  // For now, let's just show skills relevant to the class
  const availableSkills = getClassSkills(playerClass);

  const handleDragStart = (e: React.DragEvent, skill: Skill) => {
    if (isMobile) return;
    e.dataTransfer.setData("application/json", JSON.stringify({ type: 'skill', skill }));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: isMobile ? 50 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: isMobile ? 50 : 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onClose} />
      
      <div className="bg-[#1a140f] border-4 border-[#4a3a2a] rounded-xl overflow-hidden shadow-2xl pointer-events-auto w-full max-w-2xl h-[80vh] flex flex-col relative z-10 transition-all duration-300">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-[#4a3a2a] bg-[#2d221a]/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#c2a472]/10 rounded-lg border border-[#c2a472]/20">
              <Book className="w-5 h-5 sm:w-6 sm:h-6 text-[#c2a472]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-black text-[#f4e4bc] uppercase tracking-tight leading-none">Ancient Grimoire</h2>
              <p className="text-[10px] font-fantasy text-[#8b6b4d] uppercase tracking-[0.2em] mt-1">{playerClass} Abilities</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8b6b4d] hover:text-white transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableSkills.map((skill) => (
              <motion.div
                key={skill.id}
                draggable={!isMobile}
                onDragStart={(e: any) => handleDragStart(e, skill)}
                whileHover={{ scale: 1.02, borderColor: '#c2a472' }}
                className="bg-[#120e0a] border-2 border-[#4a3a2a]/40 rounded-xl p-4 flex gap-4 cursor-grab active:cursor-grabbing transition-colors group relative overflow-hidden"
              >
                {/* Skill Icon */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#1a140f] border-2 border-[#4a3a2a] rounded-lg flex items-center justify-center shrink-0 shadow-inner group-hover:border-[#c2a472]/50 transition-colors relative z-10">
                  <span className="text-3xl sm:text-4xl select-none group-hover:scale-110 transition-transform">{skill.icon}</span>
                  <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
                </div>

                {/* Skill Info */}
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-sm sm:text-base font-bold text-[#f4e4bc] truncate uppercase font-display tracking-tight">{skill.name}</h3>
                    <div className="flex items-center gap-1 bg-[#2d221a] px-1.5 py-0.5 rounded border border-[#4a3a2a]">
                      <Zap className="w-2.5 h-2.5 text-blue-400" />
                      <span className="text-[10px] font-mono text-blue-200">{skill.manaCost}</span>
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs text-[#8b6b4d] line-clamp-2 leading-relaxed mb-3 italic">"{skill.description}"</p>
                  
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
                </div>

                {/* Decorative background element */}
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                   <Book size={80} />
                </div>
              </motion.div>
            ))}
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
