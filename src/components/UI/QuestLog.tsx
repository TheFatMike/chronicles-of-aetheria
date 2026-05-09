import { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';
import { Book, CheckCircle2, Circle, X } from 'lucide-react';

export const QuestLog = memo(({ onClose }: { onClose: () => void }) => {
  const activeQuests = useGameStore(state => state.activeQuests);
  const questList = Object.values(activeQuests);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-x-0 top-24 lg:inset-auto lg:top-24 lg:right-6 z-60 flex justify-center lg:block pointer-events-none px-4"
    >
      <motion.div className="bg-[#1a140f]/95 backdrop-blur-xl border-2 border-[#4a3a2a] p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-88 max-h-[60vh] sm:max-h-[70vh] overflow-hidden flex flex-col pointer-events-auto">
      <div className="flex items-center justify-between mb-6 border-b border-[#4a3a2a] pb-4">
        <div className="flex items-center gap-3">
          <Book className="text-[#c2a472]" size={20} />
          <h3 className="text-[#f4e4bc] font-black uppercase tracking-wider text-sm">Quest Log</h3>
        </div>
        <button onClick={onClose} className="text-[#8b6b4d] hover:text-[#f4e4bc] transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
        {questList.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#6d5540] font-serif italic text-sm">No active quests in your journal.</p>
          </div>
        ) : (
          questList.map((quest) => (
            <div key={quest.id} className="space-y-3 bg-black/40 p-4 rounded-xl border border-[#4a3a2a]/50">
              <div>
                <h4 className="text-[#c2a472] font-black text-xs uppercase mb-1">{quest.title}</h4>
                <p className="text-[#8b6b4d] text-[10px] leading-relaxed italic">{quest.description}</p>
              </div>

              <div className="space-y-2">
                {quest.objectives.map((obj) => (
                  <div key={obj.id} className="flex items-start gap-2">
                    {obj.completed ? (
                      <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <Circle size={14} className="text-[#4a3a2a] mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`text-[10px] font-bold ${obj.completed ? 'text-green-500/80 line-through' : 'text-[#e2d1b0]'}`}>
                          {obj.type === 'kill' ? `Slay ${obj.targetName}` : 
                           obj.type === 'equip' ? `Equip ${obj.targetName}` :
                           `Talk to ${obj.targetName}`}
                        </span>
                        <span className="text-[9px] font-mono text-[#8b6b4d]">
                          {obj.currentCount}/{obj.count}
                        </span>
                      </div>
                      {!obj.completed && (
                        <div className="h-1 bg-black/60 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(obj.currentCount / obj.count) * 100}%` }}
                            className="h-full bg-[#c2a472]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {quest.objectives.every(o => o.completed) && (
                <div className="pt-2 border-t border-[#4a3a2a]/30">
                  <p className="text-green-400 text-[9px] font-black uppercase text-center animate-pulse">
                    Objectives Complete! Return to {quest.giverName}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[#4a3a2a] text-center">
        <p className="text-[9px] text-[#6d5540] uppercase tracking-widest font-black">
          {questList.length} Active {questList.length === 1 ? 'Quest' : 'Quests'}
        </p>
      </div>
    </motion.div>
    </motion.div>
  );
});

QuestLog.displayName = 'QuestLog';
