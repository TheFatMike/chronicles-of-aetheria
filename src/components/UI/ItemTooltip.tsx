/**
 * @file src/components/UI/ItemTooltip.tsx
 * @description Provides a detailed information overlay for game items.
 * Shows item names, stats, rarity, and descriptions when hovering over inventory slots.
 * @importance Essential: Key for player decision-making, allowing them to compare and understand their items.
 */
import { motion } from "motion/react";
import { Info } from "lucide-react";
import { InventoryItem, ItemRarity } from "@shared/types";
import { useScaffold } from "./GameScaffold";

interface ItemTooltipProps {
  item: InventoryItem;
  x: number;
  y: number;
}

const getRarityColor = (rarity: ItemRarity | undefined) => {
  if (!rarity) return "border-[#4a3a2a]/20 text-[#c2a472]";
  switch (rarity) {
    case "uncommon": return "text-[#34d399]";
    case "rare": return "text-[#60a5fa]";
    case "epic": return "text-[#a855f7]";
    case "legendary": return "text-[#fbbf24]";
    default: return "text-[#c2a472]";
  }
};

export const ItemTooltip = ({ item, x, y }: ItemTooltipProps) => {
  const { dimensions } = useScaffold();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed',
        top: Math.min(dimensions.height - 200, y - 10),
        left: x > dimensions.width / 2 ? x - 280 : x + 20,
        pointerEvents: 'none',
        zIndex: 100
      }}
      className="w-64 bg-[#1a1410]/98 backdrop-blur-md border-2 border-aetheria-800 p-3 rounded shadow-2xl hidden sm:block"
    >
      <div className={`text-[8px] font-fantasy uppercase tracking-widest mb-1 ${getRarityColor(item.rarity)}`}>
        {item.rarity} {item.type}
      </div>
      <h3 className="text-sm font-display font-black text-aetheria-200 mb-2">{item.name}</h3>
      <p className="text-[10px] text-aetheria-400 italic mb-3 leading-relaxed">"{item.description}"</p>

      {item.stats && (
        <div className="space-y-1 pt-2 border-t border-aetheria-800/50">
          {Object.entries(item.stats).map(([stat, val]) => (
            <div key={stat} className="flex justify-between items-center text-[10px]">
              <span className="text-aetheria-400 uppercase font-fantasy">{stat}</span>
              <span className="text-[#34d399] font-bold">+{val}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-[8px] text-aetheria-600 font-fantasy uppercase">
        <Info className="w-3 h-3" />
        <span>Left-Click to Equip • Right-Click for Options</span>
      </div>
    </motion.div>
  );
};
