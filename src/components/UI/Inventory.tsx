import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { InventoryItem, ItemRarity } from "../../types";
import * as Icons from "lucide-react";
import { Briefcase, X, Info, Scissors, Sword, Shield } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { formatGold, formatGoldDetailed } from "../../lib/currency";
import { ContextMenu } from "./ContextMenu";

interface InventoryProps {
  items: (InventoryItem | null)[];
  gold: number;
  onClose: () => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onSplitStack: (fromIndex: number, amount: number) => void;
  onEquip?: (inventoryIndex: number) => void;
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

export const Inventory = React.memo(({ items, gold, onClose, onMoveItem, onSplitStack, onEquip }: InventoryProps) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [splitModalItem, setSplitModalItem] = useState<InventoryItem | null>(null);
  const [splitAmount, setSplitAmount] = useState<number>(1);
  const [hoveredItem, setHoveredItem] = useState<{item: InventoryItem, x: number, y: number} | null>(null);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, item: InventoryItem, index: number} | null>(null);

  const slots = React.useMemo(() => {
    if (items.length === 30) return items;
    const arr = Array(30).fill(null);
    items.forEach((item, i) => { if (i < 30) arr[i] = item; });
    return arr;
  }, [items]);

  const handleDragStart = (e: React.DragEvent, item: InventoryItem, index: number) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ item, fromIndex: index, type: "inventory" }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.type === "inventory") {
        if (data.fromIndex !== toIndex) onMoveItem(data.fromIndex, toIndex);
      }
    } catch (err) { console.error(err); }
  };

  const handleItemClick = (item: InventoryItem, index: number) => {
    if (onEquip && ["weapon", "head", "chest", "legs", "boots", "offhand", "accessory", "armor"].includes(item.type)) {
      onEquip(index);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: InventoryItem, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item, index });
  };

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-60 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-[#1a140f]/95 backdrop-blur-xl p-4 rounded-xl border-4 border-[#4a3a2a] shadow-[0_0_50px_rgba(0,0,0,0.9)] pointer-events-auto relative w-80 sm:w-96 flex flex-col"
      >
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none rounded-lg" />
        
        <div className="flex items-center justify-between mb-4 border-b border-[#4a3a2a] pb-2 relative z-10">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#c2a472]" />
            <h2 className="text-sm font-display font-black text-[#f4e4bc] uppercase tracking-widest">Inventory</h2>
          </div>
          <div 
            className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full border border-[#fbbf24]/30 cursor-help"
            title={`${formatGoldDetailed(gold)} Gold`}
          >
            <Icons.Coins className="w-3 h-3 text-[#fbbf24]" />
            <span className="text-[#fbbf24] font-mono font-bold text-xs">{formatGold(gold)}</span>
          </div>
          <button onClick={onClose} className="ml-2 hover:text-white transition-colors">
            <X className="w-4 h-4 text-[#8b6b4d]" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2 relative z-10 bg-black/20 p-2 rounded border border-[#4a3a2a]/30">
          {slots.map((item, i) => (
            <div 
              key={i}
              className={`aspect-square w-full rounded border flex items-center justify-center relative transition-all
                ${item ? getRarityColor(item.rarity) : "border-[#4a3a2a]/20 bg-black/10"}
                ${item ? "cursor-pointer hover:bg-white/5 active:scale-95" : ""}
                ${dragOverIndex === i ? "bg-[#c2a472]/20 border-[#f4e4bc] scale-105 z-30" : ""}
              `}
              onDragStart={(e) => item && handleDragStart(e, item, i)}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => handleDrop(e, i)}
              draggable={!!item}
              onClick={() => item && handleItemClick(item, i)}
              onContextMenu={(e) => item && handleContextMenu(e, item, i)}
              onMouseEnter={(e) => item && setHoveredItem({ item, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredItem(null)}
              onMouseMove={(e) => item && setHoveredItem({ item, x: e.clientX, y: e.clientY })}
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
          ))}
        </div>
      </motion.div>

      {/* Item Tooltip */}
      <AnimatePresence>
        {hoveredItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ 
              position: 'fixed',
              top: hoveredItem.y - 10,
              left: hoveredItem.x - 280, // Offset to the left
              pointerEvents: 'none',
              zIndex: 100
            }}
            className="w-64 bg-[#1a1410]/98 backdrop-blur-md border-2 border-[#4a3a2a] p-3 rounded shadow-2xl"
          >
            <div className={`text-[8px] font-fantasy uppercase tracking-widest mb-1 ${getRarityColor(hoveredItem.item.rarity)}`}>
              {hoveredItem.item.rarity} {hoveredItem.item.type}
            </div>
            <h3 className="text-sm font-display font-black text-[#f4e4bc] mb-2">{hoveredItem.item.name}</h3>
            <p className="text-[10px] text-[#c2a472] italic mb-3 leading-relaxed">"{hoveredItem.item.description}"</p>
            
            {hoveredItem.item.stats && (
              <div className="space-y-1 pt-2 border-t border-[#4a3a2a]/50">
                {Object.entries(hoveredItem.item.stats).map(([stat, val]) => (
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
        )}
      </AnimatePresence>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          title={contextMenu.item.name}
          onClose={() => setContextMenu(null)}
          options={[
            ...( ["weapon", "head", "chest", "legs", "boots", "offhand", "accessory", "armor", "consumable"].includes(contextMenu.item.type) ? [{
              label: contextMenu.item.type === "consumable" ? "Use Item" : "Equip Item",
              icon: <Sword size={14} />,
              onClick: () => onEquip && onEquip(contextMenu.index)
            }] : []),
            {
              label: "Split Stack",
              icon: <Scissors size={14} />,
              onClick: () => {
                setSplitModalItem(contextMenu.item);
                setSplitAmount(Math.floor((contextMenu.item.quantity || 1) / 2));
              },
              disabled: !contextMenu.item.stackable || (contextMenu.item.quantity || 1) <= 1
            },
            {
              label: "Add to Trade",
              icon: <Shield size={14} />,
              onClick: () => {
                 if ((window as any).socket) {
                   (window as any).socket.emit("trade_add_item", { 
                     tradeId: useGameStore.getState().activeTrade?.id, 
                     inventoryIndex: contextMenu.index 
                   });
                 }
              },
              disabled: !useGameStore.getState().activeTrade || useGameStore.getState().activeTrade?.p1Locked || useGameStore.getState().activeTrade?.p2Locked
            },
            {
              label: "Drop",
              icon: <X size={14} />,
              onClick: () => {
                // Future drop logic
              },
              color: "text-red-400"
            }
          ]}
        />
      )}

      {/* Split Modal */}
      <AnimatePresence>
        {splitModalItem && (
          <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 pointer-events-auto">
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#2d221a] border-4 border-[#4a3a2a] p-6 rounded-xl shadow-2xl w-full max-w-xs"
            >
              <h3 className="text-lg font-display font-black text-[#f4e4bc] uppercase text-center mb-4">Split {splitModalItem.name}</h3>
              <input
                type="range"
                min="1"
                max={splitModalItem.quantity! - 1}
                value={splitAmount}
                onChange={(e) => setSplitAmount(parseInt(e.target.value))}
                className="w-full accent-[#c2a472] mb-4"
              />
              <div className="flex justify-center mb-6">
                <span className="text-[#34d399] font-mono font-bold text-lg">{splitAmount} / {splitModalItem.quantity}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setSplitModalItem(null)} className="py-2 border border-[#4a3a2a] text-[#8b6b4d] uppercase text-xs">Cancel</button>
                <button 
                  onClick={() => {
                    const idx = items.findIndex(i => i?.id === splitModalItem.id);
                    onSplitStack(idx, splitAmount);
                    setSplitModalItem(null);
                  }} 
                  className="py-2 bg-[#c2a472] text-[#1a140f] font-black uppercase text-xs"
                >
                  Split
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

Inventory.displayName = "Inventory";
