/**
 * @file src/components/UI/DialogueBox.tsx
 * @description Renders the narrative and quest-related dialogue from NPCs.
 * Handles story presentation and quest offer/completion choices for the player.
 * @importance Essential: The primary medium for storytelling and quest interaction within the game.
 */
import { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quest, DialogueOption } from '@shared/types';
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
      className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-xl z-100 px-6 pointer-events-auto max-h-[50%] overflow-y-auto custom-scrollbar"
    >
      <div className="bg-aetheria-950/95 backdrop-blur-xl border-2 border-aetheria-800 p-6 rounded-2xl shadow-2xl relative">
        {/* Speaker Name Tag */}
        <div className="absolute -top-4 left-6 bg-aetheria-400 px-4 py-1 rounded border-2 border-aetheria-800 shadow-lg">
          <span className="text-aetheria-950 font-black uppercase tracking-widest text-[10px]">{speaker}</span>
        </div>

        <div className="space-y-4">
          <p className="text-aetheria-200 font-sans text-lg leading-relaxed font-medium">
            "{text}"
          </p>

          {/* Dialogue Options (Selection Menu) */}
          {options && options.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-aetheria-800/30">
              {options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => onOptionSelect?.(option)}
                  className="w-full text-left px-4 py-3 bg-aetheria-900/50 hover:bg-aetheria-400/10 border border-aetheria-800 hover:border-aetheria-400/40 rounded-xl transition-all group flex items-center justify-between"
                >
                  <span className="text-aetheria-200 font-bold text-sm group-hover:translate-x-1 transition-transform">
                    {option.label}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Check size={14} className="text-aetheria-400" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {!quest && !isQuestReady && (!options || options.length === 0) && (
            <div className="flex justify-end pt-2">
              <button 
                onClick={onDecline}
                className="px-4 py-2 border border-aetheria-800 text-aetheria-600 hover:text-aetheria-200 font-black text-[10px] uppercase tracking-widest rounded transition-all"
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
