/**
 * @file src/components/UI/QuantitySelector.tsx
 * @description A themed modal for selecting item quantities.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface QuantitySelectorProps {
  isOpen: boolean;
  title: string;
  max: number;
  initialValue?: number;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  isOpen,
  title,
  max,
  initialValue = 1,
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) setValue(initialValue);
  }, [isOpen, initialValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) return;
    setValue(Math.min(max, Math.max(1, val)));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-250 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 bg-[#1a1410] border-2 border-[#4a3420] rounded-lg shadow-2xl overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="bg-[#2d1e14] px-4 py-3 border-b border-[#4a3420]">
              <h3 className="text-[#d4c3a1] font-bold text-sm uppercase tracking-wider">{title}</h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <input
                  type="number"
                  value={value}
                  onChange={handleInputChange}
                  className="w-24 bg-[#0d0907] border border-[#4a3420] text-[#d4c3a1] text-2xl font-bold text-center py-2 rounded focus:outline-none focus:border-[#8b6b4a]"
                />
                
                <div className="w-full px-2">
                  <input
                    type="range"
                    min="1"
                    max={max}
                    value={value}
                    onChange={(e) => setValue(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#2d1e14] rounded-lg appearance-none cursor-pointer accent-[#8b6b4a]"
                  />
                  <div className="flex justify-between mt-2 text-[10px] text-[#8b6b4a] uppercase font-bold">
                    <span>1</span>
                    <span>Max: {max}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex border-t border-[#4a3420]">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 text-xs font-bold text-[#8b6b4a] hover:bg-[#2d1e14] transition-colors border-r border-[#4a3420] uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(value)}
                className="flex-1 px-4 py-3 text-xs font-bold text-[#d4c3a1] hover:bg-[#2d1e14] transition-colors uppercase"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
