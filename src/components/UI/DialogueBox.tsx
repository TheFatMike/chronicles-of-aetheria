/**
 * @file src/components/UI/DialogueBox.tsx
 * @description Renders the narrative and quest-related dialogue from NPCs.
 * Handles story presentation and quest offer/completion choices for the player.
 * @importance Essential: The primary medium for storytelling and quest interaction within the game.
 */
import { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quest } from '../../types';
import { DialogueOption } from '../../store/types';
import { BookOpen, Check, X } from 'lucide-react';

interface DialogueBoxProps {
  speaker: string;
  text: string;
  quest?: Quest | null;
  options?: DialogueOption[];
  onAccept?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onOptionSelect?: (option: DialogueOption) => void;
  isQuestReady?: boolean;
}

export const DialogueBox = memo(({ 
  speaker, 
  text, 
  quest, 
  options,
  onAccept, 
  onDecline, 
  onComplete,
  onOptionSelect,
  isQuestReady 
}: DialogueBoxProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-xl z-100 px-6 pointer-events-auto"
    >
      <div className="bg-[#1a140f]/95 backdrop-blur-xl border-2 border-[#4a3a2a] p-6 rounded-2xl shadow-2xl relative">
        {/* Speaker Name Tag */}
        <div className="absolute -top-4 left-6 bg-[#c2a472] px-4 py-1 rounded border-2 border-[#4a3a2a] shadow-lg">
          <span className="text-[#1a140f] font-black uppercase tracking-widest text-[10px]">{speaker}</span>
        </div>

        <div className="space-y-4">
          <p className="text-[#f4e4bc] font-sans text-lg leading-relaxed font-medium">
            "{text}"
          </p>

          {quest && !isQuestReady && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-black/40 p-4 rounded-xl border border-amber-500/30 space-y-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={14} className="text-amber-500" />
                <h4 className="text-amber-500 font-black text-xs uppercase tracking-wider font-sans">{quest.title}</h4>
              </div>
              <p className="text-[#f4e4bc]/80 text-[11px] leading-relaxed font-sans">{quest.description}</p>
              
              <div className="flex gap-4 pt-2">
                <button 
                  onClick={onAccept}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-[#1a140f] font-black text-[10px] uppercase tracking-widest rounded transition-all shadow-lg active:scale-95"
                >
                  Accept Quest
                </button>
                <button 
                  onClick={onDecline}
                  className="px-4 py-2 border border-[#4a3a2a] text-[#8b6b4d] hover:text-[#f4e4bc] hover:border-[#f4e4bc] font-black text-[10px] uppercase tracking-widest rounded transition-all"
                >
                  Decline
                </button>
              </div>
            </motion.div>
          )}

          {isQuestReady && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-900/20 p-4 rounded-xl border border-green-500/30 flex items-center justify-between"
            >
              <div>
                <h4 className="text-green-500 font-black text-xs uppercase tracking-wider">Quest Complete!</h4>
                <p className="text-green-500/60 text-[9px] uppercase font-bold tracking-widest">Collect your reward</p>
              </div>
              <button 
                onClick={onComplete}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-[#1a140f] font-black text-[10px] uppercase tracking-widest rounded transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                <Check size={14} />
                Complete
              </button>
            </motion.div>
          )}

          {/* Dialogue Options (Selection Menu) */}
          {options && options.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#4a3a2a]/30">
              {options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => onOptionSelect?.(option)}
                  className="w-full text-left px-4 py-3 bg-[#2d221a]/50 hover:bg-[#c2a472]/10 border border-[#4a3a2a] hover:border-[#c2a472]/40 rounded-xl transition-all group flex items-center justify-between"
                >
                  <span className="text-[#f4e4bc] font-bold text-sm group-hover:translate-x-1 transition-transform">
                    {option.label}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Check size={14} className="text-[#c2a472]" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {!quest && !isQuestReady && (!options || options.length === 0) && (
            <div className="flex justify-end pt-2">
              <button 
                onClick={onDecline}
                className="px-4 py-2 border border-[#4a3a2a] text-[#8b6b4d] hover:text-[#f4e4bc] font-black text-[10px] uppercase tracking-widest rounded transition-all"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

DialogueBox.displayName = 'DialogueBox';
