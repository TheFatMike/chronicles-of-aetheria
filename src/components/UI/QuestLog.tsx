/**
 * @file src/components/UI/QuestLog.tsx
 * @description An overhauled, full-screen quest journal inspired by classic RPG interfaces.
 * Features a split-pane layout with a scrollable quest list and detailed mission tracking.
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Book, CheckCircle2, Circle, X, Scroll, Sword, User, Sparkles, Coins, Box } from 'lucide-react';
import { ITEMS } from "@shared/data/items";
import * as Icons from 'lucide-react';
import { InventoryItem } from '@shared/types';
import { ItemTooltip } from './ItemTooltip';
import { useScaffold } from './GameScaffold';
import { ConfirmationModal } from './ConfirmationModal';

export const QuestLog = ({ onClose, socket }: { onClose: () => void, socket: any }) => {
  const { activeQuests, trackedQuestIds, abandonQuest, toggleQuestTracking } = useGameStore(useShallow(state => ({
    activeQuests: state.activeQuests,
    trackedQuestIds: state.trackedQuestIds,
    abandonQuest: state.abandonQuest,
    toggleQuestTracking: state.toggleQuestTracking
  })));
  const questList = useMemo(() => Object.values(activeQuests).filter(q => q.status === "active"), [activeQuests]);

  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(
    questList.length > 0 ? questList[0].id : null
  );

  const selectedQuest = useMemo(() =>
    selectedQuestId ? activeQuests[selectedQuestId] : null
    , [selectedQuestId, activeQuests]);

  const [hoveredItem, setHoveredItem] = useState<{ item: InventoryItem, x: number, y: number } | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const { toLogical } = useScaffold();

  const handleItemHover = (item: InventoryItem, e: React.MouseEvent) => {
    const logical = toLogical(e.clientX, e.clientY);
    setHoveredItem({ item, x: logical.x, y: logical.y });
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Box;
    return <IconComponent size={20} className="text-aetheria-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-100 flex items-start justify-center p-8 pt-[5vh] pointer-events-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-aetheria-950 border-4 border-aetheria-800 rounded-2xl shadow-aetheria-lg w-full max-w-5xl h-[85%] overflow-hidden flex flex-col relative pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />

        {/* Header */}
        <div className="bg-aetheria-900 p-4 lg:p-8 border-b-4 border-aetheria-800 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-aetheria-400/10 border-2 border-aetheria-400/20 flex items-center justify-center shadow-inner">
              <Scroll size={32} className="text-aetheria-400" />
            </div>
            <div>
              <h2 className="text-aetheria-200 font-black uppercase tracking-[0.4em] text-2xl mb-1">Quest Journal</h2>
              <p className="text-aetheria-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Book size={12} />
                Tracking {questList.length} Active Missions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-aetheria-600 hover:text-aetheria-200 transition-all bg-black/40 rounded-xl border-2 border-aetheria-800 hover:border-aetheria-400/50 active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        {/* Layout */}
        <div className="flex-1 flex overflow-hidden relative z-10">

          {/* Left Column: Quest List */}
          <div className="w-64 lg:w-96 border-r-4 border-aetheria-800 bg-black/20 flex flex-col shrink-0">
            <div className="p-4 bg-black/40 border-b-2 border-aetheria-800/50">
              <p className="text-[10px] text-aetheria-400 font-black uppercase tracking-widest text-center">Active Objectives</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {questList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 opacity-40">
                  <div className="w-16 h-16 rounded-full border-2 border-aetheria-800 flex items-center justify-center">
                    <Book size={24} />
                  </div>
                  <p className="text-aetheria-200 font-sans font-medium opacity-50 italic">Your journal is empty, adventurer.</p>
                </div>
              ) : (
                questList.map((quest) => (
                  <button
                    key={quest.id}
                    onClick={() => setSelectedQuestId(quest.id)}
                    className={`w-full text-left p-5 rounded-xl border-2 transition-all relative overflow-hidden group ${selectedQuestId === quest.id
                      ? 'bg-aetheria-400 border-aetheria-200 shadow-lg'
                      : 'bg-aetheria-950 border-aetheria-800 hover:border-aetheria-400/50 hover:bg-aetheria-900'
                      }`}
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-black uppercase tracking-wider text-xs ${selectedQuestId === quest.id ? 'text-aetheria-950' : 'text-aetheria-200'
                          }`}>
                          {quest.title}
                        </h4>
                        {trackedQuestIds.includes(quest.id) && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                            <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest">Tracked</span>
                          </div>
                        )}
                        {quest.objectives.every(o => o.completed) && (
                          <CheckCircle2 size={14} className={selectedQuestId === quest.id ? 'text-aetheria-950' : 'text-green-500'} />
                        )}
                      </div>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedQuestId === quest.id ? 'text-aetheria-950/60' : 'text-aetheria-600'
                        }`}>
                        Level {quest.level}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Quest Details */}
          <div className="flex-1 bg-[rgba(26,20,15,0.4)] overflow-y-auto custom-scrollbar p-6 lg:p-12 space-y-6 lg:space-y-10">
            <AnimatePresence mode="wait">
              {selectedQuest ? (
                <motion.div
                  key={selectedQuest.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-10"
                >
                  {/* Title Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-amber-500 text-black font-black text-[9px] uppercase rounded-md">Quest</span>
                      <div className="h-px flex-1 bg-aetheria-800" />
                    </div>
                    <h2 className="text-aetheria-200 font-black text-2xl lg:text-4xl uppercase tracking-tighter">{selectedQuest.title}</h2>
                    <div className="flex items-center gap-6 text-aetheria-600 text-[11px] font-black uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-aetheria-400" />
                        {selectedQuest.giverName}
                      </div>
                      <div className="flex items-center gap-2">
                        <Sword size={14} className="text-aetheria-400" />
                        Level {selectedQuest.level}
                      </div>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div className="space-y-4">
                    <h3 className="text-aetheria-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                      Description
                      <div className="h-px flex-1 bg-aetheria-400/20" />
                    </h3>
                    <p className="text-aetheria-200 font-sans font-medium text-xl leading-relaxed opacity-90">
                      "{selectedQuest.description}"
                    </p>
                  </div>

                  {/* Objectives Section */}
                  <div className="space-y-6">
                    <h3 className="text-aetheria-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                      Objectives
                      <div className="h-px flex-1 bg-aetheria-400/20" />
                    </h3>
                    <div className="grid gap-3">
                      {selectedQuest.objectives.map((obj) => (
                        <div key={obj.id} className={`p-6 rounded-2xl border-2 transition-all flex items-center justify-between ${obj.completed
                          ? 'bg-green-900/10 border-green-500/20 opacity-60'
                          : 'bg-black/40 border-aetheria-800 shadow-lg'
                          }`}>
                          <div className="flex items-center gap-4">
                            {obj.completed ? (
                              <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                                <CheckCircle2 size={18} className="text-green-500" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-aetheria-400/10 border-2 border-aetheria-800 flex items-center justify-center">
                                <Circle size={18} className="text-aetheria-800" />
                              </div>
                            )}
                            <div>
                              <p className={`font-bold text-sm ${obj.completed ? 'text-green-500 line-through' : 'text-aetheria-200'}`}>
                                {obj.type === 'kill' ? `Slay ${obj.targetName}` :
                                  obj.type === 'collect' ? `Retrieve ${obj.targetName}` :
                                    obj.type === 'talk' ? `Speak with ${obj.targetName}` :
                                      obj.type === 'equip' ? `Equip ${obj.targetName}` :
                                        `Acquire ${obj.targetName}`}
                              </p>
                              {!obj.completed && (
                                <p className="text-[10px] text-aetheria-600 font-black uppercase tracking-widest mt-0.5">
                                  Progressing through the Aetheria realm
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`font-mono text-lg font-black ${obj.completed ? 'text-green-500' : 'text-aetheria-400'}`}>
                              {obj.currentCount} <span className="text-xs opacity-40">/</span> {obj.count}
                            </span>
                            {!obj.completed && (
                              <div className="w-32 h-1.5 bg-black/60 rounded-full mt-2 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(obj.currentCount / obj.count) * 100}%` }}
                                  className="h-full bg-aetheria-400 shadow-[0_0_10px_rgba(194,164,114,0.5)]"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rewards Section */}
                  <div className="space-y-6 pt-4">
                    <h3 className="text-aetheria-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                      Rewards
                      <div className="h-px flex-1 bg-aetheria-400/20" />
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {selectedQuest.reward.exp && (
                        <div className="bg-indigo-900/10 p-4 rounded-2xl border border-indigo-500/20 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                            <Sparkles size={24} className="text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-aetheria-600 text-[9px] uppercase font-black tracking-widest">Experience</p>
                            <p className="text-indigo-300 font-black text-lg">{selectedQuest.reward.exp}</p>
                          </div>
                        </div>
                      )}
                      {selectedQuest.reward.gold && (
                        <div className="bg-amber-900/10 p-4 rounded-2xl border border-amber-500/20 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                            <Coins size={24} className="text-amber-400" />
                          </div>
                          <div>
                            <p className="text-aetheria-600 text-[9px] uppercase font-black tracking-widest">Gold Coins</p>
                            <p className="text-amber-300 font-black text-lg">{selectedQuest.reward.gold}</p>
                          </div>
                        </div>
                      )}
                      {selectedQuest.reward.items?.map((itemId, i) => {
                        const item = ITEMS[itemId];
                        if (!item) return null;
                        return (
                          <div
                            key={i}
                            onMouseEnter={(e) => handleItemHover(item as any, e)}
                            onMouseLeave={() => setHoveredItem(null)}
                            className="flex items-center gap-3 bg-black/40 p-2 rounded-lg border border-aetheria-400/20 hover:border-aetheria-400/50 transition-all group cursor-help"
                          >
                            <div className="w-8 h-8 rounded bg-black/60 border border-aetheria-800 flex items-center justify-center relative overflow-hidden">
                              {renderIcon(item.icon)}
                              <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent pointer-events-none" />
                            </div>
                            <span className="text-aetheria-200 text-xs font-bold group-hover:text-aetheria-400 transition-colors">{item.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6 mt-8 border-t border-aetheria-800/30">
                      <button
                        onClick={() => toggleQuestTracking(selectedQuest.id)}
                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs border-2 transition-all active:scale-95 ${trackedQuestIds.includes(selectedQuest.id)
                          ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                          : 'bg-black/40 border-aetheria-800 text-aetheria-600 hover:border-aetheria-400/50 hover:text-aetheria-200'
                          }`}
                      >
                        <Icons.Eye size={18} />
                        {trackedQuestIds.includes(selectedQuest.id) ? "Untrack Quest" : "Track Quest"}
                      </button>
                      <button
                        onClick={() => setShowAbandonConfirm(true)}
                        className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-xs border-2 border-red-900/50 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all active:scale-95"
                      >
                        <Icons.Trash2 size={18} />
                        Abandon
                      </button>
                    </div>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-20 space-y-6">
                  <Scroll size={80} />
                  <p className="text-3xl font-black uppercase tracking-tighter">Select a quest to view details</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {hoveredItem && (
          <ItemTooltip item={hoveredItem.item} x={hoveredItem.x} y={hoveredItem.y} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAbandonConfirm && selectedQuest && (
          <ConfirmationModal
            title="Abandon Quest"
            message={`Are you sure you want to abandon "${selectedQuest.title}"? You will lose all current progress on this mission.`}
            confirmLabel="Abandon"
            variant="danger"
            onCancel={() => setShowAbandonConfirm(false)}
            onConfirm={() => {
              if (socket) {
                socket.emit("abandon_quest", { questId: selectedQuest.id });
              }
              abandonQuest(selectedQuest.id);
              setSelectedQuestId(null);
              setShowAbandonConfirm(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
