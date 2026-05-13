/**
 * @file src/components/UI/ContextMenu.tsx
 * @description A dynamic menu that appears at the cursor's position based on user interaction.
 * Provides relevant actions like trade, invite to party, or view info when clicking on entities.
 * @importance Essential: Offers a quick and intuitive way for players to interact with the game world and others.
 */
import React, { memo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useScaffold } from "./GameScaffold";

interface ContextMenuProps {
  x: number;
  y: number;
  title: string;
  options: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'default' | 'danger';
    disabled?: boolean;
  }[];
  onClose: () => void;
}

export const ContextMenu = memo(({ x, y, title, options, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const { dimensions } = useScaffold();
  
  // Adjust position if menu goes off screen (using logical coordinates)
  const menuWidth = 180;
  const menuHeight = options.length * 40 + 60;
  
  let finalX = x;
  let finalY = y;

  if (x + menuWidth > dimensions.width) finalX = x - menuWidth;
  if (y + menuHeight > dimensions.height) finalY = y - menuHeight;

  return (
    <div 
      className="fixed inset-0 z-100 pointer-events-none"
    >
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="absolute pointer-events-auto bg-aetheria-950/98 backdrop-blur-xl border-2 border-aetheria-800 rounded-lg shadow-aetheria-lg overflow-hidden w-[180px]"
        style={{
          left: finalX,
          top: finalY,
        }}
      >
        {/* Header */}
        <div className="px-4 py-2 bg-aetheria-900 border-b border-aetheria-800">
          <span className="text-[10px] font-fantasy font-black uppercase tracking-[0.2em] text-aetheria-400 truncate block">
            {title}
          </span>
        </div>

        {/* Options */}
        <div className="py-1">
          {options.map((option, idx) => (
            <button
              key={idx}
              disabled={option.disabled}
              onClick={() => {
                if (option.disabled) return;
                option.onClick();
                onClose();
              }}
              className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all group hover:pl-6
                ${option.disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                ${!option.disabled && option.variant === 'danger' 
                  ? 'hover:bg-red-950/40 text-red-400/80 hover:text-red-400' 
                  : !option.disabled ? 'hover:bg-aetheria-400/10 text-aetheria-600 hover:text-aetheria-200' : 'text-stone-600'}
              `}
            >
              {option.icon && (
                <span className="opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all">
                  {option.icon}
                </span>
              )}
              <span className="text-xs font-bold uppercase tracking-widest truncate">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
});

ContextMenu.displayName = "ContextMenu";
