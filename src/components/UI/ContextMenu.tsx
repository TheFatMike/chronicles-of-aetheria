import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Handshake, MessageSquare, X, ShieldAlert } from 'lucide-react';

export interface ContextMenuOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  title?: string;
  options: ContextMenuOption[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, title, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay on screen
  const menuWidth = 180;
  const menuHeight = options.length * 40 + (title ? 40 : 0);
  
  let finalX = x;
  let finalY = y;

  if (x + menuWidth > window.innerWidth) finalX = x - menuWidth;
  if (y + menuHeight > window.innerHeight) finalY = y - menuHeight;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-1000 pointer-events-none">
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -5 }}
          style={{ top: finalY, left: finalX }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute w-[180px] bg-[#1a1410]/95 backdrop-blur-md border-2 border-[#4a3a2a] rounded shadow-2xl overflow-hidden pointer-events-auto"
        >
          {title && (
            <div className="px-3 py-2 border-b border-[#4a3a2a] bg-black/40">
              <span className="text-[10px] font-fantasy uppercase tracking-widest text-[#c2a472]">{title}</span>
            </div>
          )}
          
          <div className="py-1">
            {options.map((option, idx) => (
              <button
                key={idx}
                disabled={option.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  option.onClick();
                  onClose();
                }}
                className={`w-full px-3 py-2 flex items-center gap-3 transition-colors text-left
                  ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#c2a472]/10'}
                `}
              >
                <span className={`${option.color || 'text-[#f4e4bc]'}`}>
                  {option.icon}
                </span>
                <span className={`text-xs font-serif ${option.color || 'text-[#f4e4bc]'}`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
