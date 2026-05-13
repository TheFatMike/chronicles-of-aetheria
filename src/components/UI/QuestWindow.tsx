/**
 * @file src/components/UI/QuestWindow.tsx
 * @description A premium, WoW-inspired interface for presenting quest details to the player.
 * Shows narrative text, objectives, and rewards in a high-fidelity parchment window.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quest, InventoryItem } from '../../types';
import { X, CheckCircle2, Coins, Sparkles, Box } from 'lucide-react';
import { ITEMS } from '../../data/items';
import * as Icons from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';
import { useScaffold } from './GameScaffold';

interface QuestWindowProps {
  quest: Quest;
  onAccept: () => void;
  onDecline: () => void;
  isOffer?: boolean; // If true, show Accept/Decline.
  isComplete?: boolean; // If true, show Complete button.
}

export const QuestWindow = ({ quest, onAccept, onDecline, isOffer = true, isComplete = false }: QuestWindowProps) => {
  const [hoveredItem, setHoveredItem] = useState<{item: InventoryItem, x: number, y: number} | null>(null);
  const { toLogical } = useScaffold();

  const handleItemHover = (item: InventoryItem, e: React.MouseEvent) => {
    const logical = toLogical(e.clientX, e.clientY);
    setHoveredItem({ item, x: logical.x, y: logical.y });
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Box;
    return <IconComponent size={24} className="text-[#c2a472]" />;
  };

  const objectivesMet = quest.objectives.every(o => o.completed);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-0 z-100 flex items-center justify-center p-4 pointer-events-none"
    >
      <div className="bg-[#1a140f] border-4 border-[#4a3a2a] rounded-xl shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] w-full max-w-lg overflow-hidden flex flex-col pointer-events-auto relative">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
        
        {/* Header */}
        <div className="bg-[#2d221a] p-6 border-b-2 border-[#4a3a2a] flex items-center justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isComplete ? (
                <span className="px-2 py-0.5 bg-emerald-500 text-black font-black text-[8px] uppercase rounded">Complete</span>
              ) : isOffer ? (
                <span className="px-2 py-0.5 bg-amber-500 text-black font-black text-[8px] uppercase rounded">New Quest</span>
              ) : (
                <span className="px-2 py-0.5 bg-blue-500 text-white font-black text-[8px] uppercase rounded">In Progress</span>
              )}
              <h2 className="text-[#f4e4bc] font-black uppercase tracking-[0.2em] text-xl">{quest.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-[#c2a472]/40" />
              <span className="text-[#c2a472] text-[10px] font-black uppercase tracking-widest">{quest.giverName}</span>
            </div>
          </div>
          <button 
            onClick={onDecline}
            className="p-2 text-[#8b6b4d] hover:text-[#f4e4bc] transition-colors bg-black/20 rounded-lg border border-[#4a3a2a]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-[rgba(26,20,15,0.6)] relative z-10">
          {/* Description */}
          <section className="space-y-4">
            <h3 className="text-[#c2a472] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c2a472]" />
              {isComplete ? "Conclusion" : "The Mission"}
            </h3>
            <p className="text-[#f4e4bc] font-sans font-medium text-lg leading-relaxed">
              "{quest.description}"
            </p>
          </section>

          {/* Objectives */}
          <section className="space-y-4">
            <h3 className="text-[#c2a472] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c2a472]" />
              Objectives
            </h3>
            <div className="space-y-3">
              {quest.objectives.map((obj, i) => (
                <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  obj.completed 
                    ? 'bg-emerald-900/10 border-emerald-500/20' 
                    : 'bg-black/20 border-[#4a3a2a]/30'
                }`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    obj.completed ? 'border-emerald-500 bg-emerald-500/20' : 'border-[#4a3a2a]'
                  }`}>
                    {obj.completed ? (
                      <CheckCircle2 size={12} className="text-emerald-400" />
                    ) : (
                      <span className="text-[10px] font-black text-[#c2a472]">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${obj.completed ? 'text-emerald-400' : 'text-[#f4e4bc]'}`}>
                      {obj.type === 'kill' ? `Slay ${obj.count} ${obj.targetName}` : 
                       obj.type === 'talk' ? `Speak with ${obj.targetName}` :
                       obj.type === 'collect' ? `Retrieve ${obj.count} ${obj.targetName}` :
                       obj.type === 'equip' ? `Equip ${obj.targetName}` :
                       `Acquire ${obj.targetName}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(obj.currentCount / obj.count) * 100}%` }}
                          className={`h-full ${obj.completed ? 'bg-emerald-500' : 'bg-[#c2a472]'}`} 
                        />
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${obj.completed ? 'text-emerald-500' : 'text-[#8b6b4d]'}`}>
                        {obj.currentCount} / {obj.count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Rewards */}
          <section className="space-y-4">
            <h3 className="text-[#c2a472] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c2a472]" />
              Rewards
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quest.reward.exp && (
                <div className="flex items-center gap-3 bg-indigo-900/10 p-3 rounded-xl border border-indigo-500/20">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                    <Sparkles size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[#8b6b4d] text-[8px] uppercase font-black tracking-widest">Experience</p>
                    <p className="text-indigo-300 font-black text-sm">{quest.reward.exp} XP</p>
                  </div>
                </div>
              )}
              {quest.reward.gold && (
                <div className="flex items-center gap-3 bg-amber-900/10 p-3 rounded-xl border border-amber-500/20">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                    <Coins size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[#8b6b4d] text-[8px] uppercase font-black tracking-widest">Currency</p>
                    <p className="text-amber-300 font-black text-sm">{quest.reward.gold} Gold</p>
                  </div>
                </div>
              )}
              {quest.reward.items?.map((itemId, i) => {
                const item = ITEMS[itemId];
                if (!item) return null;
                return (
                  <div 
                    key={i} 
                    onMouseEnter={(e) => handleItemHover(item as any, e)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="col-span-2 flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors cursor-help"
                  >
                    <div className="w-12 h-12 rounded-lg bg-black/40 border border-[#4a3a2a] flex items-center justify-center relative overflow-hidden">
                      {renderIcon(item.icon)}
                      <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent pointer-events-none" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[#8b6b4d] text-[8px] uppercase font-black tracking-widest">Reward Item</p>
                      <p className="text-[#f4e4bc] font-black text-sm group-hover:text-[#c2a472] transition-colors">{item.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        {(isOffer || isComplete) && (
          <div className="bg-[#2d221a] p-6 border-t-2 border-[#4a3a2a] flex gap-4 relative z-10">
            <button 
              onClick={onAccept}
              disabled={isComplete && !objectivesMet}
              className={`flex-1 h-14 font-black uppercase tracking-[0.2em] text-xs rounded-lg transition-all shadow-lg active:scale-95 border-b-4 ${
                isComplete 
                  ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-800 text-[#1a140f] disabled:opacity-50 disabled:grayscale' 
                  : 'bg-amber-600 hover:bg-amber-500 border-amber-800 text-[#1a140f]'
              }`}
            >
              {isComplete ? 'Complete Quest' : 'Accept Quest'}
            </button>
            {!isComplete && (
              <button 
                onClick={onDecline}
                className="px-8 h-14 bg-[#1a140f] hover:bg-[#2a241f] text-[#8b6b4d] hover:text-[#f4e4bc] font-black uppercase tracking-widest text-[10px] rounded-lg transition-all border-2 border-[#4a3a2a] active:scale-95"
              >
                Maybe Later
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {hoveredItem && (
          <ItemTooltip item={hoveredItem.item} x={hoveredItem.x} y={hoveredItem.y} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
