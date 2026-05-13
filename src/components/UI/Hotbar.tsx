/**
 * @file src/components/UI/Hotbar.tsx
 * @description The action bar for skills and items.
 * Allows players to map and quickly trigger abilities using keyboard shortcuts or mouse clicks.
 * @importance Essential: The primary interface for combat and ability usage in the game.
 */
import React from "react";
import { motion } from "motion/react";
import { HotbarSlot as HotbarSlotType, ItemRarity } from "@shared/types";
import * as Icons from "lucide-react";
import { useGameStore } from "../../store/useGameStore";

interface HotbarProps {
  slots: (HotbarSlotType | null)[];
  onSlotAction: (index: number, slotData: HotbarSlotType) => void;
  onClearSlot: (index: number) => void;
}

const getRarityGlow = (rarity: ItemRarity) => {
  switch (rarity) {
    case "uncommon": return "shadow-[0_0_10px_rgba(74,222,128,0.3)] border-green-400/50";
    case "rare": return "shadow-[0_0_10px_rgba(96,165,250,0.3)] border-blue-400/50";
    case "epic": return "shadow-[0_0_10px_rgba(168,85,247,0.3)] border-purple-400/50";
    case "legendary": return "shadow-gold-glow/40 border-aetheria-400/50";
    default: return "border-aetheria-800";
  }
};

const HotbarSlot = React.memo(({ 
  index, 
  slot, 
  onSlot, 
  onClear 
}: { 
  index: number; 
  slot: HotbarSlotType | null; 
  onSlot: (data: HotbarSlotType) => void;
  onClear: () => void;
}) => {
  const [isOver, setIsOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (dataStr) {
        const data = JSON.parse(dataStr);
        // If it's a skill or an item from inventory
        if (data.type === 'skill') {
          onSlot({ type: 'skill', data: data.skill });
        } else {
          const itemData = data.item || data;
          onSlot({ type: 'item', data: itemData });
        }
      }
    } catch (err) {
      console.error("Failed to parse drop data", err);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!slot) return;
    e.dataTransfer.setData("application/json", JSON.stringify({ ...slot, fromIndex: index, source: "hotbar" }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.dataTransfer.dropEffect === "none") {
      onClear();
    }
  };

  const label = (index + 1) % 10;
  const skillCooldowns = useGameStore(s => s.skillCooldowns);
  const [cooldownPercent, setCooldownPercent] = React.useState(0);

  // Update cooldown progress
  React.useEffect(() => {
    if (!slot || slot.type !== 'skill') {
      setCooldownPercent(0);
      return;
    }

    const skill = slot.data;
    const interval = setInterval(() => {
      const lastUsed = skillCooldowns[skill.id] || 0;
      const elapsed = (Date.now() - lastUsed) / 1000;
      const progress = Math.min(1, elapsed / skill.cooldown);
      setCooldownPercent(progress);
      
      if (progress >= 1) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [slot, skillCooldowns]);

  const renderIcon = () => {
    if (!slot) return null;
    if (slot.type === 'item') {
      return React.createElement((Icons as any)[slot.data.icon] || Icons.HelpCircle, {
        size: 20
      });
    }
    // Skill icon (emoji or string)
    return <span className="text-xl sm:text-2xl select-none">{slot.data.icon}</span>;
  };


  const getName = () => {
    if (!slot) return "";
    return slot.data.name;
  };

  const getSubtext = () => {
    if (!slot) return "";
    if (slot.type === 'item') return `${slot.data.rarity} ${slot.data.type}`;
    return `${slot.data.type} skill`;
  };

  const subtext = getSubtext();
  const rarityClass = (slot?.type === 'item') ? getRarityGlow(slot.data.rarity) : "border-aetheria-400 shadow-gold-glow/20";

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      draggable={!!slot}
      onContextMenu={(e) => {
        e.preventDefault();
        onClear();
      }}
      className="relative"
    >
      <motion.div
        whileHover={slot ? { y: -4, scale: 1.05 } : { scale: 1.02 }}
        className={`relative group w-10 h-10 sm:w-12 sm:h-12 bg-aetheria-950/90 border rounded flex items-center justify-center cursor-pointer transition-all duration-200
          ${isOver ? "bg-aetheria-900 border-aetheria-200 scale-110 shadow-aetheria-lg z-20" : ""}
          ${slot ? rarityClass : "border-aetheria-800 hover:border-aetheria-400"}
        `}
      >
        <div className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-aetheria-900 border border-aetheria-800 rounded shadow text-[7px] sm:text-[9px] flex items-center justify-center font-mono text-aetheria-600 group-hover:text-aetheria-200">
          {label}
        </div>
        
        {slot ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className={`text-aetheria-200 drop-shadow-lg ${cooldownPercent < 1 && slot.type === 'skill' ? 'opacity-40 grayscale' : ''}`}>
              {renderIcon()}
            </div>
            {slot.type === 'item' && slot.data.quantity && slot.data.quantity > 1 && (
              <span className="absolute bottom-0.5 right-0.5 text-[7px] sm:text-[8px] font-mono font-bold bg-black/60 px-1 rounded text-white border border-white/5 leading-none py-0.5">
                {slot.data.quantity}
              </span>
            )}
            
            {/* Cooldown Overlay */}
            {slot.type === 'skill' && cooldownPercent < 1 && (
              <div 
                className="absolute inset-0 bg-black/60 flex items-center justify-center rounded overflow-hidden"
              >
                <div 
                  className="absolute bottom-0 left-0 w-full bg-blue-500/30 transition-all duration-75"
                  style={{ height: `${(1 - cooldownPercent) * 100}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-aetheria-800 opacity-30">
            <Icons.Plus size={14} />
          </div>
        )}

        {/* Info on hover */}
        {slot && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            <div className="bg-aetheria-950 border border-aetheria-800 px-2 py-1 rounded shadow-aetheria-lg whitespace-nowrap">
              <p className="text-[10px] font-display font-black text-aetheria-200 leading-none">{getName()}</p>
              <p className="text-[7px] text-aetheria-600 font-fantasy uppercase tracking-tight mt-0.5">{getSubtext()}</p>
            </div>
          </div>
        )}

        {/* Gloss overlay */}
        <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-white/10 pointer-events-none rounded" />
      </motion.div>
    </div>
  );
});

(HotbarSlot as any).displayName = "HotbarSlot";

export const Hotbar = React.memo(({ slots, onSlotAction, onClearSlot }: HotbarProps) => {
  const playerId = useGameStore(s => s.id);
  const localPlayer = useGameStore(s => s.players[playerId || ""]);

  // Defensive check: Ensure slots is an array (Firebase sometimes returns objects for sparse arrays)
  const safeSlots = Array.isArray(slots) 
    ? slots 
    : slots && typeof slots === 'object' 
      ? Array.from({ length: 10 }, (_, i) => (slots as any)[i] || null)
      : Array(10).fill(null);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-70 flex flex-col items-center gap-2 pointer-events-auto">
      {/* Experience Bar above Hotbar */}
      {localPlayer && (
        <div className="w-full max-w-[400px] h-1.5 sm:h-2 bg-black/40 rounded-full overflow-hidden border border-aetheria-800/30 shadow-inner group relative" title={`Experience: ${localPlayer.exp || 0}/${localPlayer.maxExp || 100}`}>
          <motion.div 
            className="h-full bg-linear-to-r from-amber-500 to-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
            initial={{ width: 0 }}
            animate={{ width: `${((localPlayer.exp || 0) / (localPlayer.maxExp || 100)) * 100}%` }} 
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[6px] sm:text-[8px] font-black text-amber-950 uppercase tracking-tighter">
              {Math.floor(((localPlayer.exp || 0) / (localPlayer.maxExp || 100)) * 100)}% EXP
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-aetheria-950/40 backdrop-blur-sm rounded-lg border border-aetheria-800/20 shadow-aetheria-lg overflow-x-auto max-w-[95vw] no-scrollbar">
        {safeSlots.map((slot, i) => (
          <HotbarSlot 
            key={i} 
            index={i} 
            slot={slot} 
            onSlot={(data) => onSlotAction(i, data)}
            onClear={() => onClearSlot(i)}
          />
        ))}
      </div>
    </div>
  );
});

Hotbar.displayName = "Hotbar";

