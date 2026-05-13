/**
 * @file src/components/UI/QuestTracker.tsx
 * @description A clean, HUD-based mission tracker.
 * Displays objectives for tracked quests on the right side of the screen.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { CheckCircle2, Circle } from 'lucide-react';

export const QuestTracker = () => {
  const { activeQuests, trackedQuestIds } = useGameStore(useShallow(state => ({
    activeQuests: state.activeQuests,
    trackedQuestIds: state.trackedQuestIds
  })));

  const trackedQuests = trackedQuestIds
    .map(id => activeQuests[id])
    .filter(q => q && q.status === 'active');

  if (trackedQuests.length === 0) return null;

  return (
    <div className="w-64 max-h-[60%] overflow-y-auto custom-scrollbar pr-2 pointer-events-none">
      <div className="space-y-6 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {trackedQuests.map((quest) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-aetheria-950/60 backdrop-blur-md border-l-4 border-aetheria-400 p-4 rounded-r-xl shadow-2xl relative overflow-hidden group pointer-events-auto"
            >
              {/* Background Glow */}
              <div className="absolute inset-0 bg-linear-to-r from-aetheria-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <h4 className="text-aetheria-200 font-black uppercase tracking-widest text-[10px] mb-3 border-b border-aetheria-800/50 pb-2">
                {quest.title}
              </h4>

              <div className="space-y-2.5">
                {quest.objectives.map((obj) => (
                  <div key={obj.id} className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">
                      {obj.completed ? (
                        <CheckCircle2 size={12} className="text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                      ) : (
                        <Circle size={10} className="text-aetheria-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className={`text-[11px] leading-tight font-bold ${
                          obj.completed ? 'text-aetheria-600 line-through' : 'text-[#e2d1b0]'
                        }`}>
                          {obj.type === 'kill' ? `Slay ${obj.targetName}` : 
                           obj.type === 'collect' ? `Collect ${obj.targetName}` :
                           obj.type === 'talk' ? `Talk to ${obj.targetName}` :
                           obj.targetName}
                        </p>
                        {!obj.completed && (
                          <span className="text-[10px] font-mono font-black text-aetheria-400">
                            {obj.currentCount}/{obj.count}
                          </span>
                        )}
                      </div>
                      
                      {!obj.completed && (
                        <div className="w-full h-1 bg-black/40 rounded-full mt-1.5 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(obj.currentCount / obj.count) * 100}%` }}
                            className="h-full bg-linear-to-r from-aetheria-400 to-aetheria-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {quest.objectives.every(o => o.completed) && (
                <div className="mt-3 pt-2 border-t border-emerald-500/20">
                  <p className="text-emerald-400 font-black uppercase tracking-[0.2em] text-[8px] animate-pulse">
                    Ready to turn in
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
