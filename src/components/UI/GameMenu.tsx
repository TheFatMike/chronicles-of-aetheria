import { motion } from "motion/react";
import { LogOut, LayoutGrid, Play, X, Settings, Target, Mountain } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";

interface GameMenuProps {
  onClose: () => void;
  onSelectCharacter: () => void;
  onLogout: () => void;
}

export const GameMenu = ({ onClose, onSelectCharacter, onLogout }: GameMenuProps) => {
  const { setActiveMenu, devMode, setDevMode, id: currentPlayerId, players } = useGameStore(useShallow(state => ({
    setActiveMenu: state.setActiveMenu,
    devMode: state.devMode,
    setDevMode: state.setDevMode,
    id: state.id,
    players: state.players
  })));

  const localPlayer = currentPlayerId ? players[currentPlayerId] : null;
  const isDev = 
    localPlayer?.role === 'dev' || 
    localPlayer?.role === 'admin' ||
    (localPlayer?.characterName === 'Michael'); // Fallback for name if role sync is weird

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#2d221a] border-4 border-[#4a3a2a] rounded shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-[#1a1410] border-b-2 border-[#4a3a2a] flex justify-between items-center">
          <span className="font-fantasy text-xs text-[#8b6b4d] uppercase tracking-[0.2em]">Game Menu</span>
          <button onClick={onClose} className="text-[#8b6b4d] hover:text-[#f4e4bc] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 space-y-4">
          <MenuButton 
            icon={<Play size={18} />} 
            label="Return to Game" 
            onClick={onClose} 
            primary
          />
          
          {isDev && (
            <>
              <MenuButton 
                icon={<Mountain size={18} />} 
                label={devMode ? "Disable World Editor" : "Enable World Editor"} 
                onClick={() => {
                  setDevMode(!devMode);
                  onClose();
                }} 
              />
              <MenuButton 
                icon={<Target size={18} />} 
                label="Spawner Management" 
                onClick={() => {
                  setActiveMenu('spawners');
                  onClose();
                }} 
              />
            </>
          )}

          <MenuButton 
            icon={<LayoutGrid size={18} />} 
            label="Character Select" 
            onClick={onSelectCharacter} 
          />
          <MenuButton 
            icon={<Settings size={18} />} 
            label="Settings" 
            onClick={() => alert("Settings coming soon...")} 
          />
          
          <div className="pt-4 mt-4 border-t-2 border-[#4a3a2a]">
            <MenuButton 
              icon={<LogOut size={18} />} 
              label="Log Out" 
              onClick={onLogout} 
              danger
            />
          </div>
        </div>
        
        <div className="p-3 bg-black/20 text-center font-serif italic text-[10px] text-[#6d5540]">
          Thy journey persists in the ether...
        </div>
      </motion.div>
    </motion.div>
  );
};

interface MenuButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}

const MenuButton = ({ icon, label, onClick, primary, danger }: MenuButtonProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 rounded border-2 transition-all font-fantasy uppercase tracking-widest text-xs ${
      primary 
        ? "bg-[#c2a472] border-[#f4e4bc] text-[#1a1410] hover:bg-[#d4b98a]" 
        : danger
          ? "border-red-900/30 bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500"
          : "border-[#4a3a2a] bg-black/20 text-[#8b6b4d] hover:border-[#8b6b4d] hover:text-[#f4e4bc]"
    }`}
  >
    {icon}
    {label}
  </button>
);
