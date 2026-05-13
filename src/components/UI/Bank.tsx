/**
 * @file src/components/UI/Bank.tsx
 * @description The character's long-term storage interface.
 * Facilitates moving items between the player's active inventory and their personal bank vault.
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { InventoryItem } from "@shared/types";
import * as Icons from "lucide-react";
import { Landmark, X, ArrowLeftRight, ChevronUp } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useScaffold } from "./GameScaffold";
import { InventorySlot } from "./InventorySlot";
import { ItemTooltip } from "./ItemTooltip";

import { QuantitySelector } from "./QuantitySelector";

interface BankProps {
  bankItems: (InventoryItem | null)[];
  inventoryItems: (InventoryItem | null)[];
  onClose: () => void;
  onDeposit: (inventoryIndex: number, bankIndex?: number, amount?: number, all?: boolean) => void;
  onWithdraw: (bankIndex: number, inventoryIndex?: number, amount?: number, all?: boolean) => void;
  onMoveBankItem: (fromIndex: number, toIndex: number) => void;
  onMoveInventoryItem: (fromIndex: number, toIndex: number) => void;
  onDepositAll: () => void;
}

export const Bank = React.memo(({ 
  bankItems, 
  inventoryItems,
  onClose, 
  onDeposit, 
  onWithdraw,
  onMoveBankItem,
  onMoveInventoryItem,
  onDepositAll
}: BankProps) => {
  const [dragOverIndex, setDragOverIndex] = useState<{type: 'bank' | 'inventory', index: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{item: InventoryItem, x: number, y: number} | null>(null);
  const [quantitySelector, setQuantitySelector] = useState<{
    isOpen: boolean;
    item: InventoryItem;
    type: 'deposit' | 'withdraw';
    index: number;
  } | null>(null);

  const [bankContextMenu, setBankContextMenu] = useState<{ 
    x: number, 
    y: number, 
    item: InventoryItem, 
    index: number, 
    type: 'bank' | 'inventory' 
  } | null>(null);

  const { toLogical } = useScaffold();

  // Ensure we have exactly 50 bank slots (5 rows of 10)
  const bankSlots = React.useMemo(() => {
    const arr = Array(50).fill(null);
    bankItems.forEach((item, i) => { if (i < 50) arr[i] = item; });
    return arr;
  }, [bankItems]);

  const handleItemHover = (item: InventoryItem, e: React.MouseEvent) => {
    if (isDragging) return;
    const logical = toLogical(e.clientX, e.clientY);
    setHoveredItem({ item, x: logical.x, y: logical.y });
  };

  const handleDragStart = (e: React.DragEvent, item: InventoryItem, index: number, type: 'bank' | 'inventory') => {
    setHoveredItem(null);
    setIsDragging(true);
    e.dataTransfer.setData("application/json", JSON.stringify({ item, fromIndex: index, type }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, toIndex: number, toType: 'bank' | 'inventory') => {
    e.preventDefault();
    setDragOverIndex(null);
    setIsDragging(false);
    
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      
      if (data.type === 'inventory' && toType === 'bank') {
        onDeposit(data.fromIndex, toIndex);
      } else if (data.type === 'bank' && toType === 'inventory') {
        onWithdraw(data.fromIndex, toIndex);
      } else if (data.type === 'bank' && toType === 'bank') {
        if (data.fromIndex !== toIndex) onMoveBankItem(data.fromIndex, toIndex);
      } else if (data.type === 'inventory' && toType === 'inventory') {
        if (data.fromIndex !== toIndex) onMoveInventoryItem(data.fromIndex, toIndex);
      }
    } catch (err) {
      console.error("Bank Drop Error:", err);
    }
  };

  const handleBankContextMenu = (e: React.MouseEvent, item: InventoryItem, index: number, type: 'bank' | 'inventory') => {
    e.preventDefault();
    const logical = toLogical(e.clientX, e.clientY);
    setBankContextMenu({ x: logical.x, y: logical.y, item, index, type });
  };

  const executeContextAction = (action: 'single' | 'all' | 'x') => {
    if (!bankContextMenu) return;
    const { index, type, item } = bankContextMenu;
    
    if (type === 'inventory') {
      if (action === 'single') onDeposit(index, undefined, 1, false);
      else if (action === 'all') onDeposit(index, undefined, undefined, true);
      else if (action === 'x') {
        setQuantitySelector({ isOpen: true, item, type: 'deposit', index });
      }
    } else {
      if (action === 'single') onWithdraw(index, undefined, 1, false);
      else if (action === 'all') onWithdraw(index, undefined, undefined, true);
      else if (action === 'x') {
        setQuantitySelector({ isOpen: true, item, type: 'withdraw', index });
      }
    }
    setBankContextMenu(null);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-center pt-[10vh] pointer-events-none p-4" onClick={() => setBankContextMenu(null)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[#1a140f]/95 p-6 rounded-2xl border-4 border-[#c2a472]/40 shadow-[0_0_100px_rgba(0,0,0,0.9)] pointer-events-auto relative w-full max-w-2xl flex flex-col gap-6 max-h-[85%]"
      >
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/black-linen.png')] pointer-events-none rounded-xl" />
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#4a3a2a] pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#c2a472]/20 rounded-lg border border-[#c2a472]/30">
              <Landmark className="w-6 h-6 text-[#fbbf24]" />
            </div>
            <div>
              <h2 className="text-xl font-display font-black text-[#f4e4bc] uppercase tracking-tighter">Bank</h2>
              <p className="text-[10px] text-[#8b6b4d] uppercase tracking-widest font-bold opacity-60">Personal Storage</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:text-white transition-colors p-2">
            <X className="w-6 h-6 text-[#8b6b4d]" />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-8 relative z-10 overflow-y-auto custom-scrollbar pr-2 -mr-2">
          {/* Bank Slots Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#8b6b4d] font-bold">Bank Vault (50 Slots)</h3>
            </div>
            <div className="grid grid-cols-10 gap-2 bg-black/40 p-3 rounded-lg border border-[#4a3a2a]/50">
              {bankSlots.map((item, i) => (
                <InventorySlot
                  key={`bank-${i}`}
                  item={item}
                  index={i}
                  isDragOver={dragOverIndex?.type === 'bank' && dragOverIndex.index === i}
                  onDragStart={(e, it, idx) => handleDragStart(e, it, idx, 'bank')}
                  onDragOver={(idx) => setDragOverIndex({ type: 'bank', index: idx })}
                  onDrop={(e, idx) => handleDrop(e, idx, 'bank')}
                  onClick={() => onWithdraw(i)}
                  onContextMenu={(e, it, idx) => handleBankContextMenu(e, it, idx, 'bank')}
                  onHover={handleItemHover}
                  onMouseLeave={() => setHoveredItem(null)}
                  onDragEnd={() => { setIsDragging(false); setDragOverIndex(null); }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-center">
             <div className="flex items-center gap-4 py-2 px-6 bg-[#c2a472]/10 border border-[#c2a472]/20 rounded-full group">
               <div className="w-12 h-px bg-[#c2a472]/30" />
               <button 
                 onClick={onDepositAll}
                 className="flex items-center gap-3 px-4 py-1 rounded-full hover:bg-[#c2a472]/20 transition-all text-[#c2a472] hover:text-[#fbbf24] active:scale-95"
                 title="Deposit All Items"
               >
                 <ChevronUp className="w-4 h-4" />
                 <span className="text-[9px] font-bold uppercase tracking-widest">Deposit All</span>
                 <ChevronUp className="w-4 h-4" />
               </button>
               <div className="w-12 h-px bg-[#c2a472]/30" />
             </div>
          </div>

          {/* Quick Access Inventory (Bottom) */}
          <div className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#8b6b4d] font-bold">Your Inventory</h3>
            <div className="grid grid-cols-10 gap-2 bg-black/20 p-3 rounded-lg border border-[#4a3a2a]/30">
              {inventoryItems.slice(0, 20).map((item, i) => (
                <InventorySlot
                  key={`inv-${i}`}
                  item={item}
                  index={i}
                  isDragOver={dragOverIndex?.type === 'inventory' && dragOverIndex.index === i}
                  onDragStart={(e, it, idx) => handleDragStart(e, it, idx, 'inventory')}
                  onDragOver={(idx) => setDragOverIndex({ type: 'inventory', index: idx })}
                  onDrop={(e, idx) => handleDrop(e, idx, 'inventory')}
                  onClick={() => onDeposit(i)}
                  onContextMenu={(e, it, idx) => handleBankContextMenu(e, it, idx, 'inventory')}
                  onHover={handleItemHover}
                  onMouseLeave={() => setHoveredItem(null)}
                  onDragEnd={() => { setIsDragging(false); setDragOverIndex(null); }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-2 text-center">
          <p className="text-[9px] text-[#8b6b4d] uppercase tracking-widest opacity-40 italic">
            Right-click for options • Drag and Drop to transfer
          </p>
        </div>
      </motion.div>

      {/* Bank Context Menu */}
      <AnimatePresence>
        {bankContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ left: bankContextMenu.x, top: bankContextMenu.y }}
            className="fixed z-100 bg-[#1a140f] border-2 border-[#c2a472]/40 rounded-lg shadow-2xl overflow-hidden min-w-[140px] pointer-events-auto"
          >
            <div className="px-3 py-2 bg-[#c2a472]/10 border-b border-[#4a3a2a] mb-1">
               <span className="text-[10px] text-[#c2a472] font-black uppercase tracking-widest">{bankContextMenu.item.name}</span>
            </div>
            <button 
              onClick={() => executeContextAction('single')}
              className="w-full text-left px-4 py-2 text-xs text-[#f4e4bc] hover:bg-[#c2a472] hover:text-[#1a140f] transition-colors flex items-center gap-2"
            >
              {bankContextMenu.type === 'inventory' ? 'Deposit' : 'Withdraw'} One
            </button>
            <button 
              onClick={() => executeContextAction('all')}
              className="w-full text-left px-4 py-2 text-xs text-[#f4e4bc] hover:bg-[#c2a472] hover:text-[#1a140f] transition-colors flex items-center gap-2"
            >
              {bankContextMenu.type === 'inventory' ? 'Deposit' : 'Withdraw'} All
            </button>
            <button 
              onClick={() => executeContextAction('x')}
              className="w-full text-left px-4 py-2 text-xs text-[#f4e4bc] hover:bg-[#c2a472] hover:text-[#1a140f] transition-colors flex items-center gap-2"
            >
              {bankContextMenu.type === 'inventory' ? 'Deposit' : 'Withdraw'} X...
            </button>
            <div className="h-px bg-[#4a3a2a] my-1" />
            <button 
              onClick={() => setBankContextMenu(null)}
              className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Tooltip */}
      <AnimatePresence>
        {hoveredItem && (
          <ItemTooltip item={hoveredItem.item} x={hoveredItem.x} y={hoveredItem.y} />
        )}
      </AnimatePresence>

      {/* Quantity Selector Modal */}
      {quantitySelector && (
        <QuantitySelector
          isOpen={quantitySelector.isOpen}
          title={quantitySelector.type === 'deposit' ? 'DEPOSIT QUANTITY' : 'WITHDRAW QUANTITY'}
          max={quantitySelector.item.quantity || 1}
          onConfirm={(amount) => {
            if (quantitySelector.type === 'deposit') {
              onDeposit(quantitySelector.index, undefined, amount, false);
            } else {
              onWithdraw(quantitySelector.index, undefined, amount, false);
            }
            setQuantitySelector(null);
          }}
          onCancel={() => setQuantitySelector(null)}
        />
      )}
    </div>
  );
});

Bank.displayName = "Bank";
