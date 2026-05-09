import { motion } from "motion/react";
import { Info } from "lucide-react";
import { InventoryItem, ItemRarity } from "../../types";

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
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ 
        position: 'fixed',
        top: Math.min(1080 - 300, y - 10),
        left: x > 1920 / 2 ? x - 280 : x + 20,
        pointerEvents: 'none',
        zIndex: 100
      }}
      className="w-64 bg-[#1a1410]/98 backdrop-blur-md border-2 border-[#4a3a2a] p-3 rounded shadow-2xl hidden sm:block"
    >
      <div className={`text-[8px] font-fantasy uppercase tracking-widest mb-1 ${getRarityColor(item.rarity)}`}>
        {item.rarity} {item.type}
      </div>
      <h3 className="text-sm font-display font-black text-[#f4e4bc] mb-2">{item.name}</h3>
      <p className="text-[10px] text-[#c2a472] italic mb-3 leading-relaxed">"{item.description}"</p>
      
      {item.stats && (
        <div className="space-y-1 pt-2 border-t border-[#4a3a2a]/50">
          {Object.entries(item.stats).map(([stat, val]) => (
            <div key={stat} className="flex justify-between items-center text-[10px]">
              <span className="text-[#8b6b4d] uppercase font-fantasy">{stat}</span>
              <span className="text-[#34d399] font-bold">+{val}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-[8px] text-[#8b6b4d] font-fantasy uppercase">
         <Info className="w-3 h-3" />
         <span>Left-Click to Equip • Right-Click for Options</span>
      </div>
    </motion.div>
  );
};
