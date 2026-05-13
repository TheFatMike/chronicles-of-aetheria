/**
 * @file src/components/UI/LootWindow.tsx
 * @description An interface for viewing and retrieving items from defeated enemies.
 * Allows players to selectively take loot or "take all" from a temporary container.
 * @importance Essential: The primary way players receive rewards and items from combat and exploration.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { useGameStore } from '../../store/useGameStore';
import { X, Coins, HelpCircle } from 'lucide-react';
import * as Icons from "lucide-react";
import { Socket } from 'socket.io-client';
import { useScaffold } from "./GameScaffold";
import { ItemTooltip } from "./ItemTooltip";
import { ItemRarity } from '../../types';

interface LootWindowProps {
  socket: Socket | null;
}

const getRarityColor = (rarity: ItemRarity | undefined) => {
  if (!rarity) return "border-[#4a3a2a]/20 text-[#c2a472]";
  switch (rarity) {
    case "uncommon": return "border-[#34d399] text-[#34d399]";
    case "rare": return "border-[#60a5fa] text-[#60a5fa]";
    case "epic": return "border-[#a855f7] text-[#a855f7]";
    case "legendary": return "border-[#fbbf24] text-[#fbbf24]";
    default: return "border-[#4a3a2a] text-[#c2a472]";
  }
};

const getRarityBg = (rarity: ItemRarity | undefined) => {
  if (!rarity) return "bg-black/20 shadow-inner";
  switch (rarity) {
    case "uncommon": return "bg-[#34d399]/10 shadow-[inset_0_0_10px_rgba(52,211,153,0.2)]";
    case "rare": return "bg-[#60a5fa]/10 shadow-[inset_0_0_10px_rgba(96,165,250,0.2)]";
    case "epic": return "bg-[#a855f7]/10 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]";
    case "legendary": return "bg-[#fbbf24]/10 shadow-[inset_0_0_10px_rgba(251,191,36,0.2)]";
    default: return "bg-black/20 shadow-inner";
  }
};

export const LootWindow: React.FC<LootWindowProps> = ({ socket }) => {
  const activeLoot = useGameStore(s => s.activeLoot);
  const setActiveLoot = useGameStore(s => s.setActiveLoot);
  const [hoveredItem, setHoveredItem] = useState<{item: any, x: number, y: number} | null>(null);
  const { toLogical } = useScaffold();

  if (!activeLoot) return null;

  const handleTakeItem = (index: number) => {
    socket?.emit("take_loot_item", { 
      targetId: activeLoot.targetId, 
      lootIndex: index 
    });
    setHoveredItem(null);
  };

  const handleTakeGold = () => {
    socket?.emit("take_loot_gold", { targetId: activeLoot.targetId });
  };

  const handleTakeAll = () => {
    socket?.emit("take_all_loot", { targetId: activeLoot.targetId });
    setActiveLoot(null);
  };

  const handleItemHover = (item: any, e: React.MouseEvent) => {
    const logical = toLogical(e.clientX, e.clientY);
    setHoveredItem({ item, x: logical.x, y: logical.y });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#1a140f]/95 p-4 rounded-xl border-4 border-[#4a3a2a] shadow-[0_0_50px_rgba(0,0,0,0.9)] pointer-events-auto relative w-full max-w-[320px] flex flex-col max-h-[85%] overflow-y-auto custom-scrollbar"
      >
        {/* Parchment Texture */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none rounded-lg" />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-[#4a3a2a] pb-2 relative z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-display font-black text-[#f4e4bc] uppercase tracking-widest">Treasure</h3>
          </div>
          <button 
            onClick={() => setActiveLoot(null)}
            className="text-[#8b6b4d] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-4">
          {/* Gold Display */}
          {activeLoot.gold > 0 && (
            <div 
              onClick={handleTakeGold}
              className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-[#fbbf24]/30 cursor-pointer hover:bg-[#fbbf24]/10 hover:border-[#fbbf24]/50 transition-all active:scale-95 group"
            >
              <Coins className="w-5 h-5 text-[#fbbf24] group-hover:scale-110 transition-transform" />
              <span className="text-[#fbbf24] font-mono font-bold text-sm">{activeLoot.gold} Gold</span>
              <span className="ml-auto text-[9px] text-[#fbbf24]/40 font-mono opacity-0 group-hover:opacity-100 transition-opacity">COLLECT</span>
            </div>
          )}

          {/* Items Grid */}
          <div className="grid grid-cols-4 gap-2 bg-black/20 p-2 rounded border border-[#4a3a2a]/30">
            {activeLoot.items.map((item: any, idx: number) => (
              <div 
                key={idx}
                onClick={() => item && handleTakeItem(idx)}
                onMouseEnter={(e) => item && handleItemHover(item, e)}
                onMouseMove={(e) => item && handleItemHover(item, e)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  aspect-square rounded border flex items-center justify-center relative transition-all
                  ${item ? getRarityColor(item.rarity) : "border-[#4a3a2a]/20 bg-black/10"}
                  ${item ? "cursor-pointer hover:bg-white/5 active:scale-95" : "opacity-30"}
                `}
              >
                {item && (
                  <div className={`w-full h-full flex items-center justify-center p-1.5 rounded-sm ${getRarityBg(item.rarity)}`}>
                    {React.createElement((Icons as any)[item.icon] || HelpCircle, {
                      size: 24,
                      className: "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    })}
                    {(item.quantity ?? 0) > 1 && (
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono font-bold bg-black/80 px-1 rounded text-white border border-white/10">
                        {item.quantity}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {activeLoot.items.length === 0 && !activeLoot.gold && (
              <div className="col-span-4 py-8 text-center text-[#8b6b4d] text-xs italic opacity-50 font-display">
                The container is empty...
              </div>
            )}
          </div>

          {/* Actions */}
          <button
            onClick={handleTakeAll}
            disabled={activeLoot.items.length === 0 && !activeLoot.gold}
            className="w-full py-2.5 bg-[#4a3a2a] hover:bg-[#5a4a3a] text-[#f4e4bc] font-display font-black text-xs uppercase tracking-[0.2em] rounded border border-[#6b5b4a] shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            Loot All
          </button>
        </div>
      </motion.div>

      {/* Item Tooltip */}
      <AnimatePresence>
        {hoveredItem && (
          <ItemTooltip item={hoveredItem.item} x={hoveredItem.x} y={hoveredItem.y} />
        )}
      </AnimatePresence>
    </div>
  );
};
