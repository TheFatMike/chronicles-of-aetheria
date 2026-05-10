import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { InventoryItem } from "../../types";
import * as Icons from "lucide-react";
import { Briefcase, X, Scissors, Sword, Shield, Eye } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useScaffold } from "./GameScaffold";
import { formatGold, formatGoldDetailed } from "../../lib/currency";
import { ContextMenu } from "./ContextMenu";
import { InventorySlot } from "./InventorySlot";
import { ItemTooltip } from "./ItemTooltip";
import { SplitStackModal } from "./SplitStackModal";
import { ConfirmationModal } from "./ConfirmationModal";

interface InventoryProps {
  items: (InventoryItem | null)[];
  gold: number;
  onClose: () => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onSplitStack: (fromIndex: number, amount: number) => void;
  onEquip?: (inventoryIndex: number) => void;
}

export const Inventory = React.memo(({ items, gold, onClose, onMoveItem, onSplitStack, onEquip }: InventoryProps) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [splitModalItem, setSplitModalItem] = useState<InventoryItem | null>(null);
  const [destroyModalItem, setDestroyModalItem] = useState<{item: InventoryItem, index: number} | null>(null);
  const [splitAmount, setSplitAmount] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{item: InventoryItem, x: number, y: number} | null>(null);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, item: InventoryItem, index: number} | null>(null);
  const { toLogical } = useScaffold();

  const handleItemHover = (item: InventoryItem, e: React.MouseEvent) => {
    if (contextMenu || isDragging) return;
    const logical = toLogical(e.clientX, e.clientY);
    setHoveredItem({ item, x: logical.x, y: logical.y });
  };

  const slots = React.useMemo(() => {
    if (items.length === 30) return items;
    const arr = Array(30).fill(null);
    items.forEach((item, i) => { if (i < 30) arr[i] = item; });
    return arr;
  }, [items]);

  const handleDragStart = (e: React.DragEvent, item: InventoryItem, index: number) => {
    setHoveredItem(null);
    setIsDragging(true);
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
    if (onEquip && ["weapon", "head", "chest", "legs", "boots", "offhand", "accessory", "armor", "consumable"].includes(item.type)) {
      onEquip(index);
      setHoveredItem(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: InventoryItem, index: number) => {
    e.preventDefault();
    const logical = toLogical(e.clientX, e.clientY);
    setContextMenu({ x: logical.x, y: logical.y, item, index });
    setHoveredItem(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-24 lg:inset-auto lg:bottom-24 lg:right-6 z-60 flex justify-center lg:block pointer-events-none px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-[#1a140f]/95 backdrop-blur-xl p-3 sm:p-4 rounded-xl border-2 sm:border-4 border-[#4a3a2a] shadow-[0_0_50px_rgba(0,0,0,0.9)] pointer-events-auto relative w-full max-w-sm flex flex-col"
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
            <InventorySlot
              key={i}
              item={item}
              index={i}
              isDragOver={dragOverIndex === i}
              onDragStart={handleDragStart}
              onDragOver={setDragOverIndex}
              onDrop={handleDrop}
              onClick={handleItemClick}
               onContextMenu={handleContextMenu}
              onHover={handleItemHover}
              onMouseLeave={() => setHoveredItem(null)}
              onDragEnd={() => setIsDragging(false)}
            />
          ))}
        </div>
      </motion.div>

      {/* Item Tooltip */}
      <AnimatePresence>
        {hoveredItem && (
          <ItemTooltip item={hoveredItem.item} x={hoveredItem.x} y={hoveredItem.y} />
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
              onClick: () => {
                onEquip && onEquip(contextMenu.index);
                setHoveredItem(null);
              }
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
              label: "Examine",
              icon: <Eye size={14} />,
              onClick: () => {
                useGameStore.getState().addMessage({
                  id: `examine-${Date.now()}`,
                  sender: "SYSTEM",
                  text: `${contextMenu.item.name}: ${contextMenu.item.description}`,
                  timestamp: Date.now(),
                  color: "#c2a472"
                });
                setContextMenu(null);
              }
            },
            ...(useGameStore.getState().activeTrade ? [{
              label: "Add to Trade",
              icon: <Shield size={14} />,
              onClick: () => {
                 if ((window as any).socket) {
                   (window as any).socket.emit("trade_add_item", { 
                     tradeId: useGameStore.getState().activeTrade?.id, 
                     inventoryIndex: contextMenu.index 
                   });
                 }
                 setContextMenu(null);
              },
              disabled: useGameStore.getState().activeTrade?.p1Locked || useGameStore.getState().activeTrade?.p2Locked
            }] : []),
            {
              label: "Destroy Item",
              icon: <Icons.Trash2 size={14} />,
              onClick: () => {
                setDestroyModalItem({ item: contextMenu.item, index: contextMenu.index });
                setContextMenu(null);
              },
              variant: "danger"
            }
          ]}
        />
      )}

      {/* Split Modal */}
      <AnimatePresence>
        {splitModalItem && (
          <SplitStackModal
            item={splitModalItem}
            amount={splitAmount}
            setAmount={setSplitAmount}
            onCancel={() => setSplitModalItem(null)}
            onConfirm={(amt) => {
              const idx = items.findIndex(i => i?.id === splitModalItem.id);
              onSplitStack(idx, amt);
              setSplitModalItem(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Destruction Confirmation Modal */}
      <AnimatePresence>
        {destroyModalItem && (
          <ConfirmationModal
            title="Destroy Item"
            message={`Are you sure you want to PERMANENTLY DESTROY ${destroyModalItem.item.name}? This action cannot be undone.`}
            confirmLabel="Destroy"
            variant="danger"
            onCancel={() => setDestroyModalItem(null)}
            onConfirm={() => {
              if ((window as any).socket) {
                (window as any).socket.emit("destroy_item", { 
                  inventoryIndex: destroyModalItem.index 
                });
              }
              setDestroyModalItem(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

Inventory.displayName = "Inventory";
