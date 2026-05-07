import { useGameStore } from "../../store/useGameStore";
import { Package, User, Map as MapIcon, Menu, ArrowUp } from "lucide-react";
import { motion } from "motion/react";

export const MobileControls = () => {
  const isMobile = useGameStore((state) => state.isMobile);
  const setActiveMenu = useGameStore((state) => state.setActiveMenu);
  const activeMenu = useGameStore((state) => state.activeMenu);

  if (!isMobile) return null;

  const toggleMenu = (menu: 'inventory' | 'menu' | 'map') => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const buttonClass = "w-12 h-12 rounded-full bg-[#1a140f]/80 backdrop-blur-md border-2 border-[#4a3a2a] flex items-center justify-center text-[#c2a472] active:scale-95 active:bg-[#4a3a2a] transition-all";

  return (
    <>
      {/* Top Right Quick Access */}
      <div className="fixed top-6 right-6 flex flex-col gap-3 z-50">
        <button 
          onClick={() => toggleMenu('map')} 
          className={buttonClass}
          aria-label="Map"
        >
          <MapIcon size={24} />
        </button>
        <button 
          onClick={() => toggleMenu('inventory')} 
          className={buttonClass}
          aria-label="Inventory"
        >
          <Package size={24} />
        </button>
        <button 
          onClick={() => toggleMenu('menu')} 
          className={buttonClass}
          aria-label="Character"
        >
          <User size={24} />
        </button>
      </div>

      {/* Bottom Right Actions */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-50 items-end">
        {/* Jump Button (Simulated via a store value or event later, for now just UI) */}
        {/* Actually, let's make it work with the movement hook if possible */}
        <button 
          className="w-16 h-16 rounded-full bg-[#3b82f6]/40 backdrop-blur-md border-4 border-[#3b82f6]/80 flex items-center justify-center text-white active:scale-110 active:bg-[#3b82f6]/60 transition-all shadow-lg"
          onTouchStart={() => {
            // We'll need to trigger jump in usePlayerMovement
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
          }}
          onTouchEnd={() => {
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
          }}
        >
          <ArrowUp size={32} strokeWidth={3} />
        </button>
      </div>
      
      {/* Camera Rotation Helper */}
      {/* For mobile, we should probably allow swiping on the right half of the screen to rotate */}
      {/* This is best handled in usePlayerMovement with touch events */}
    </>
  );
};
