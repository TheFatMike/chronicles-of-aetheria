/**
 * @file src/components/UI/ConfirmationModal.tsx
 * @description A generic reusable modal for confirming critical actions.
 * Used for character deletion, item destruction, and other irreversible steps.
 * @importance Essential: Provides a safety net for users, preventing accidental data loss or unwanted actions.
 */
import { motion } from "motion/react";
import { AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'info';
}

export const ConfirmationModal = ({ 
  title, 
  message, 
  confirmLabel = "Confirm", 
  cancelLabel = "Cancel", 
  onConfirm, 
  onCancel,
  variant = 'info'
}: ConfirmationModalProps) => {
  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center pointer-events-none">
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="bg-[#1a140f]/95 border-2 border-[#4a3a2a] p-4 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-[280px] pointer-events-auto relative overflow-hidden"
      >
        {/* Parchment Texture */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${variant === 'danger' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
              {variant === 'danger' ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <h3 className="text-sm font-display font-black text-[#f4e4bc] uppercase tracking-wider">{title}</h3>
          </div>

          <p className="text-[#8b6b4d] text-[11px] mb-4 leading-relaxed">
            {message}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onCancel} 
              className="py-2 border border-[#4a3a2a] text-[#8b6b4d] uppercase text-xs font-bold hover:bg-black/40 transition-all active:scale-95 tracking-widest"
            >
              {cancelLabel}
            </button>
            <button 
              onClick={onConfirm} 
              className={`py-2 text-[#1a140f] font-black uppercase text-xs transition-all active:scale-95 tracking-widest shadow-lg ${
                variant === 'danger' 
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
                  : 'bg-[#c2a472] hover:bg-[#d4b98a] shadow-amber-900/20'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
