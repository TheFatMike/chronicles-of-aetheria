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
        className="bg-aetheria-950/95 border-2 border-aetheria-800 p-4 rounded-xl shadow-aetheria-lg w-full max-w-[280px] pointer-events-auto relative overflow-hidden"
      >
        {/* Parchment Texture */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${variant === 'danger' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
              {variant === 'danger' ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <h3 className="text-sm font-display font-black text-aetheria-200 uppercase tracking-wider">{title}</h3>
          </div>

          <p className="text-aetheria-600 text-[11px] mb-4 leading-relaxed">
            {message}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onCancel} 
              className="py-2 border border-aetheria-800 text-aetheria-600 uppercase text-xs font-bold hover:bg-black/40 transition-all active:scale-95 tracking-widest"
            >
              {cancelLabel}
            </button>
            <button 
              onClick={onConfirm} 
              className={`py-2 text-aetheria-950 font-black uppercase text-xs transition-all active:scale-95 tracking-widest shadow-lg ${
                variant === 'danger' 
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' 
                  : 'bg-aetheria-400 hover:bg-aetheria-200 shadow-gold-glow/20'
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
