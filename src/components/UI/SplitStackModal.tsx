import { motion } from "motion/react";
import { InventoryItem } from "../../types";

interface SplitStackModalProps {
  item: InventoryItem;
  amount: number;
  setAmount: (amount: number) => void;
  onCancel: () => void;
  onConfirm: (amount: number) => void;
}

export const SplitStackModal = ({ item, amount, setAmount, onCancel, onConfirm }: SplitStackModalProps) => {
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 pointer-events-auto">
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#2d221a] border-4 border-[#4a3a2a] p-6 rounded-xl shadow-2xl w-full max-w-xs"
      >
        <h3 className="text-lg font-display font-black text-[#f4e4bc] uppercase text-center mb-4">Split {item.name}</h3>
        <input
          type="range"
          min="1"
          max={item.quantity! - 1}
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value))}
          className="w-full accent-[#c2a472] mb-4"
        />
        <div className="flex justify-center mb-6">
          <span className="text-[#34d399] font-mono font-bold text-lg">{amount} / {item.quantity}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={onCancel} className="py-2 border border-[#4a3a2a] text-[#8b6b4d] uppercase text-xs hover:bg-black/20 transition-colors">Cancel</button>
          <button 
            onClick={() => onConfirm(amount)} 
            className="py-2 bg-[#c2a472] text-[#1a140f] font-black uppercase text-xs hover:bg-[#d4b98a] transition-colors"
          >
            Split
          </button>
        </div>
      </motion.div>
    </div>
  );
};
