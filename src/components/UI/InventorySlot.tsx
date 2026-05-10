/**
 * @file src/components/UI/InventorySlot.tsx
 * @description Renders an individual slot within an inventory grid or hotbar.
 * Handles drag-and-drop interactions, tooltips, and visual feedback for items.
 * @importance Essential: The building block for all item-based interfaces in the game.
 */
import React from "react";
import * as Icons from "lucide-react";
import { InventoryItem, ItemRarity } from "../../types";

interface InventorySlotProps {
  item: InventoryItem | null;
  index: number;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, item: InventoryItem, index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (e: React.DragEvent, toIndex: number) => void;
  onClick: (item: InventoryItem, index: number) => void;
  onContextMenu: (e: React.MouseEvent, item: InventoryItem, index: number) => void;
  onHover: (item: InventoryItem, e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onDragEnd?: () => void;
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

export const InventorySlot = ({
  item,
  index,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  onContextMenu,
  onHover,
  onMouseLeave,
  onDragEnd
}: InventorySlotProps) => {
  return (
    <div 
      className={`aspect-square w-full rounded border flex items-center justify-center relative transition-all
        ${item ? getRarityColor(item.rarity) : "border-[#4a3a2a]/20 bg-black/10"}
        ${item ? "cursor-pointer hover:bg-white/5 active:scale-95" : ""}
        ${isDragOver ? "bg-[#c2a472]/20 border-[#f4e4bc] scale-105 z-30" : ""}
      `}
      onDragStart={(e) => item && onDragStart(e, item, index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      draggable={!!item}
      onClick={() => item && onClick(item, index)}
      onContextMenu={(e) => item && onContextMenu(e, item, index)}
      onMouseEnter={(e) => item && onHover(item, e)}
      onMouseLeave={onMouseLeave}
      onMouseMove={(e) => item && onHover(item, e)}
    >
      {item && (
        <div className={`w-full h-full flex items-center justify-center p-1.5 rounded-sm ${getRarityBg(item.rarity)}`}>
          {React.createElement((Icons as any)[item.icon] || Icons.HelpCircle, {
            size: 20,
            className: "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
          })}
          {item.quantity && item.quantity > 1 && (
            <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono font-bold bg-black/80 px-1 rounded text-white border border-white/10">
              {item.quantity}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
