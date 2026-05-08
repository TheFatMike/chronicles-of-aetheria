import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { InventoryItem, ItemRarity } from "../../types";
import * as Icons from "lucide-react";
import { Briefcase, X, Info } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";

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
  const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [splitModalItem, setSplitModalItem] = React.useState<InventoryItem | null>(null);
  const [splitAmount, setSplitAmount] = React.useState<number>(1);

  // Normalize items to a 30-slot array if needed
  const slots = React.useMemo(() => {
    if (items.length === 30) return items;
    const arr = Array(30).fill(null);
    items.forEach((item, i) => {
      if (i < 30) arr[i] = item;
    });
    return arr;
  }, [items]);

  const handleDragStart = (e: React.DragEvent, item: InventoryItem, index: number) => {
    const isSplitting = e.shiftKey;
    e.dataTransfer.setData("application/json", JSON.stringify({ 
      item, 
      fromIndex: index, 
      type: "inventory",
      isSplitting
    }));
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
        const fromIndex = data.fromIndex;
        if (fromIndex === toIndex) return;

        // Notify server of the move/swap
        onMoveItem(fromIndex, toIndex);
      }
    } catch (err) {
      console.error("Failed to update items", err);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ pointerEvents: 'none' }}

    >
      {/* Backdrop for mobile to handle close on tap outside */}
      <div 
        className="absolute inset-0 bg-black/60 pointer-events-auto" 
        onClick={onClose}
      />

      <div className={`bg-[#1a140f]/95 backdrop-blur-xl p-4 sm:p-8 rounded-xl border-4 border-[#4a3a2a] shadow-[0_0_50px_rgba(0,0,0,0.9)] pointer-events-auto relative max-w-4xl w-full h-[90vh] sm:h-auto flex flex-col md:flex-row gap-4 sm:gap-8 overflow-hidden`}>
        {/* Background texture decor */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
        
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 hover:bg-white/5 rounded-full transition-colors group z-20"
        >
          <X className="w-5 h-5 text-[#8b6b4d] group-hover:text-[#f4e4bc]" />
        </button>

        {/* Main Inventory Grid */}
        <div className="flex-1 relative z-10 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 sm:mb-6 border-b border-[#4a3a2a] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#4a3a2a] rounded-lg hidden sm:block">
                <Briefcase className="w-6 h-6 text-[#c2a472]" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-black text-[#f4e4bc] tracking-tight uppercase">INVENTORY</h2>
                <p className="text-[8px] sm:text-[10px] text-[#8b6b4d] font-fantasy uppercase tracking-[0.2em] mt-0.5">Bound Pack</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-[#fbbf24]/30 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
              <Icons.Coins className="w-4 h-4 text-[#fbbf24] animate-pulse" />
              <span className="text-[#fbbf24] font-mono font-black text-xs sm:text-sm tracking-widest">{gold.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 sm:gap-2 bg-black/30 p-2 sm:p-4 rounded-lg border border-[#4a3a2a]/30 overflow-y-auto custom-scrollbar flex-1">
             {slots.map((item, i) => {
               return (
                 <div 
                   key={i}
                   className={`aspect-square w-full rounded border flex items-center justify-center relative transition-all
                     ${item ? getRarityColor(item.rarity) : "border-[#4a3a2a]/20 bg-black/10"}
                     ${item ? "cursor-grab active:cursor-grabbing hover:bg-white/5 shadow-lg" : ""}
                     ${selectedItem?.id === item?.id && item ? "ring-2 ring-white/50 scale-105 z-20" : ""}
                     ${dragOverIndex === i ? "bg-[#c2a472]/20 border-[#f4e4bc] scale-105 z-30 shadow-xl" : ""}
                   `}
                   onDragStart={(e) => item && handleDragStart(e, item, i)}
                   onDragOver={(e) => handleDragOver(e, i)}
                   onDragLeave={() => setDragOverIndex(null)}
                   onDrop={(e) => handleDrop(e, i)}
                   draggable={!!item}
                   onClick={() => item && setSelectedItem(item)}
                 >
                   {item && (
                     <div className={`w-full h-full flex items-center justify-center p-2 rounded-sm ${getRarityBg(item.rarity)}`}>
                        {React.createElement((Icons as any)[item.icon] || Icons.HelpCircle, {
                          size: 24,
                          className: "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                        })}
                        {item.quantity && item.quantity > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 text-[8px] sm:text-[10px] font-mono font-bold bg-black/80 px-1 rounded text-white border border-white/10">
                            {item.quantity}
                          </span>
                        )}
                     </div>
                   )}
                 </div>
               );
             })}
          </div>
        </div>

        {/* Item Inspect Panel */}
        <div className="w-80 bg-[#2d221a]/50 border-l border-[#4a3a2a] pl-8 flex flex-col pt-2 relative z-10 min-h-0">
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <motion.div
                key={selectedItem.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`text-[9px] sm:text-[10px] font-fantasy uppercase tracking-[0.3em] font-black ${getRarityColor(selectedItem.rarity)}`}>
                    {selectedItem.rarity} {selectedItem.type}
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-black text-[#f4e4bc] mt-1 mb-2 sm:mb-4 leading-none truncate">
                  {selectedItem.name}
                </h3>

                <div className="bg-black/30 p-3 sm:p-4 rounded border border-[#4a3a2a] mb-4 sm:mb-6 overflow-y-auto max-h-24 sm:max-h-none">
                  <p className="text-[#c2a472] text-[10px] sm:text-xs leading-relaxed font-serif italic text-center">
                    "{selectedItem.description}"
                  </p>
                </div>

                {selectedItem.stats && (
                  <div className="space-y-1 sm:space-y-2 mb-4 sm:mb-6 overflow-y-auto">
                    <p className="text-[8px] sm:text-[10px] text-[#8b6b4d] font-fantasy uppercase tracking-widest mb-2 border-b border-[#4a3a2a]/50 pb-1">Properties</p>
                    {Object.entries(selectedItem.stats).map(([stat, val]) => (
                      <div key={stat} className="flex justify-between items-center bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 rounded">
                        <span className="text-[8px] sm:text-[10px] text-[#8b6b4d] uppercase font-fantasy">{stat}</span>
                        <span className="text-[10px] sm:text-xs text-[#34d399] font-bold">+{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-auto space-y-2 pb-4">
                  {onEquip && ["weapon", "head", "chest", "legs", "boots", "offhand", "accessory", "armor"].includes(selectedItem.type) && (
                    <button
                      onClick={() => {
                        const idx = items.findIndex(i => i?.id === selectedItem.id);
                        if (idx !== -1) {
                          onEquip(idx);
                          setSelectedItem(null);
                        }
                      }}
                      className="w-full py-2.5 sm:py-3 bg-[#c2a472] hover:bg-[#d4b98a] text-[#1a140f] font-display font-black uppercase tracking-widest rounded transition-colors shadow-lg shadow-[#c2a472]/10 text-xs sm:text-sm"
                    >
                      Equip Item
                    </button>
                  )}

                  {selectedItem.stackable && selectedItem.quantity && selectedItem.quantity > 1 && (
                    <button
                      onClick={() => {
                        setSplitModalItem(selectedItem);
                        setSplitAmount(Math.floor(selectedItem.quantity! / 2));
                      }}
                      className="w-full py-1.5 sm:py-2 border border-[#c2a472]/50 hover:bg-[#c2a472]/10 text-[#c2a472] font-display font-black uppercase tracking-widest rounded transition-colors text-[10px] sm:text-xs"
                    >
                      Split Stack
                    </button>
                  )}

                  {useGameStore.getState().activeTrade && !useGameStore.getState().activeTrade?.p1Locked && !useGameStore.getState().activeTrade?.p2Locked && (
                    <button
                      onClick={() => {
                        const idx = items.findIndex(i => i?.id === selectedItem.id);
                        if (idx !== -1 && (window as any).socket) {
                          (window as any).socket.emit("trade_add_item", { tradeId: useGameStore.getState().activeTrade?.id, inventoryIndex: idx });
                        }
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-display font-black uppercase tracking-widest rounded transition-colors text-[10px] sm:text-xs shadow-lg shadow-blue-900/20"
                    >
                      Add to Trade
                    </button>
                  )}

                  <div className="p-3 bg-[#1a140f] border border-[#4a3a2a] rounded flex items-center gap-3 opacity-60">
                      <Info className="w-4 h-4 text-[#8b6b4d]" />
                      <p className="text-[9px] text-[#8b6b4d] font-fantasy uppercase tracking-tighter leading-tight">Drag to hotbar to slot for use</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div key="no-selected-item" className="flex-1 flex flex-col items-center justify-center text-center opacity-30 select-none">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-dashed border-[#4a3a2a] rounded-full flex items-center justify-center mb-4">
                  <Icons.Search className="w-5 h-5 sm:w-6 sm:h-6 text-[#8b6b4d]" />
                </div>
                <p className="text-[10px] sm:text-xs text-[#8b6b4d] font-fantasy uppercase tracking-widest">Select an item<br/>to view details</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Split Stack Modal */}
      <AnimatePresence>
        {splitModalItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#2d221a] border-4 border-[#4a3a2a] p-8 rounded-xl shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-sm"
            >
              <h3 className="text-xl font-display font-black text-[#f4e4bc] uppercase tracking-widest mb-6 text-center">
                Split {splitModalItem.name}
              </h3>
              
              <div className="flex flex-col items-center gap-8 mb-8">
                <div className="w-20 h-20 rounded border-2 border-[#c2a472] flex items-center justify-center bg-black/40">
                  {React.createElement((Icons as any)[splitModalItem.icon] || Icons.HelpCircle, {
                    size: 40,
                    className: "text-[#c2a472]"
                  })}
                </div>

                <div className="w-full space-y-6">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-[#8b6b4d] font-fantasy tracking-widest uppercase">Select Quantity</span>
                    <span className="text-[#34d399] font-mono font-bold text-sm">
                      {splitAmount} / {splitModalItem.quantity}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max={splitModalItem.quantity! - 1}
                    value={splitAmount}
                    onChange={(e) => setSplitAmount(parseInt(e.target.value))}
                    className="w-full accent-[#c2a472] h-2 bg-black/40 rounded-lg appearance-none cursor-pointer"
                  />

                  <div className="flex justify-center">
                    <input
                      type="number"
                      min="1"
                      max={splitModalItem.quantity! - 1}
                      value={splitAmount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          setSplitAmount(Math.min(Math.max(1, val), splitModalItem.quantity! - 1));
                        }
                      }}
                      className="bg-black/40 border-2 border-[#4a3a2a] text-[#f4e4bc] font-mono font-bold text-center w-24 py-2 rounded focus:outline-none focus:border-[#c2a472]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSplitModalItem(null)}
                  className="py-3 border border-[#4a3a2a] text-[#8b6b4d] font-display font-black uppercase tracking-widest rounded hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSplitStack(items.findIndex(i => i?.id === splitModalItem.id), splitAmount);
                    setSplitModalItem(null);
                  }}
                  className="py-3 bg-[#c2a472] text-[#1a140f] font-display font-black uppercase tracking-widest rounded hover:bg-[#d4b98a] transition-colors"
                >
                  Split
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

Inventory.displayName = "Inventory";
