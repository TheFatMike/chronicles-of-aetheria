/**
 * @file src/components/UI/SplitStackModal.tsx
 * @description A utility modal for dividing stacks of items in the inventory.
 * Provides a simple slider or input to choose the amount to split.
 * @importance Essential: Key for inventory management and preparing items for trade or use.
 */
import { motion } from "motion/react";
import { InventoryItem } from "@shared/types";

interface SplitStackModalProps {
  item: InventoryItem;
  amount: number;
  setAmount: (amount: number) => void;
  onCancel: () => void;
  onConfirm: (amount: number) => void;
}

export const SplitStackModal = ({ item, amount, setAmount, onCancel, onConfirm }: SplitStackModalProps) => {
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#1a140f]/95 border-2 border-[#4a3a2a] p-4 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-[260px] pointer-events-auto relative overflow-hidden"
      >
        {/* Parchment Texture */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />

        <div className="relative z-10">
          <h3 className="text-sm font-display font-black text-[#f4e4bc] uppercase text-center mb-4 tracking-widest">Split {item.name}</h3>
          <input
            type="range"
            min="1"
            max={item.quantity! - 1}
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value))}
            className="w-full accent-[#c2a472] mb-2 cursor-pointer"
          />
          <div className="flex justify-center mb-4">
            <span className="text-[#fbbf24] font-mono font-bold text-lg">{amount} <span className="text-xs text-[#8b6b4d]">/ {item.quantity}</span></span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onCancel} 
              className="py-2 border border-[#4a3a2a] text-[#8b6b4d] uppercase text-xs font-bold hover:bg-black/40 transition-all active:scale-95 tracking-widest"
            >
              Cancel
            </button>
            <button 
              onClick={() => onConfirm(amount)} 
              className="py-2 bg-[#c2a472] text-[#1a140f] font-black uppercase text-xs hover:bg-[#d4b98a] transition-all active:scale-95 tracking-widest shadow-lg shadow-amber-900/20"
            >
              Split
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
