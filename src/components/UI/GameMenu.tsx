/**
 * @file src/components/UI/GameMenu.tsx
 * @description The escape/pause menu for the game.
 * Provides access to settings, character selection, logout, and world editing tools.
 * @importance Essential: The main hub for meta-actions and navigating out of the active gameplay state.
 */
import { useState } from "react";
import { motion } from "motion/react";
import { LogOut, LayoutGrid, Play, X, Settings, Target, Mountain, ArrowLeft, Maximize, Sun } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";

interface GameMenuProps {
  onClose: () => void;
  onSelectCharacter: () => void;
  onLogout: () => void;
}

export const GameMenu = ({ onClose, onSelectCharacter, onLogout }: GameMenuProps) => {
  const [view, setView] = useState<'menu' | 'settings'>('menu');
  const { setActiveMenu, devMode, setDevMode, id: currentPlayerId, players, uiScale, setUIScale, brightness, setBrightness, showAllNames, setShowAllNames } = useGameStore(useShallow(state => ({
    setActiveMenu: state.setActiveMenu,
    devMode: state.devMode,
    setDevMode: state.setDevMode,
    id: state.id,
    players: state.players,
    uiScale: state.uiScale,
    setUIScale: state.setUIScale,
    brightness: state.brightness,
    setBrightness: state.setBrightness,
    showAllNames: state.showAllNames,
    setShowAllNames: state.setShowAllNames
  })));

  const localPlayer = currentPlayerId ? players[currentPlayerId] : null;
  const isDev = 
    localPlayer?.role === 'dev' || 
    localPlayer?.role === 'admin' ||
    (localPlayer?.name === 'Michael'); // Fallback for name if role sync is weird

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#2d221a] border-4 border-[#4a3a2a] rounded shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-[#1a1410] border-b-2 border-[#4a3a2a] flex justify-between items-center">
          <div className="flex items-center gap-2">
            {view === 'settings' && (
              <button 
                onClick={() => setView('menu')}
                className="text-[#8b6b4d] hover:text-[#f4e4bc] transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <span className="font-fantasy text-xs text-[#8b6b4d] uppercase tracking-[0.2em]">
              {view === 'menu' ? 'Game Menu' : 'Settings'}
            </span>
          </div>
          <button onClick={onClose} className="text-[#8b6b4d] hover:text-[#f4e4bc] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-8 space-y-4">
          {view === 'menu' ? (
            <>
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
                onClick={() => setView('settings')} 
              />
              
              <div className="pt-4 mt-4 border-t-2 border-[#4a3a2a]">
                <MenuButton 
                  icon={<LogOut size={18} />} 
                  label="Log Out" 
                  onClick={onLogout} 
                  danger
                />
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[#f4e4bc] font-fantasy text-[10px] uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Maximize size={12} />
                    <span>UI Scale</span>
                  </div>
                  <span>{(uiScale * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.5" 
                  step="0.05"
                  value={uiScale}
                  onChange={(e) => setUIScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#c2a472]"
                />
                <div className="flex justify-between text-[8px] text-[#6d5540] font-serif italic">
                  <span>Small</span>
                  <span>Standard</span>
                  <span>Large</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-[#f4e4bc] font-fantasy text-[10px] uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Sun size={12} />
                    <span>Brightness</span>
                  </div>
                  <span>{(brightness * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1"
                  value={brightness}
                  onChange={(e) => setBrightness(parseFloat(e.target.value))}
                  className="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#c2a472]"
                />
                <div className="flex justify-between text-[8px] text-[#6d5540] font-serif italic">
                  <span>Dim</span>
                  <span>Normal</span>
                  <span>Brilliant</span>
                </div>
              </div>

              <div className="p-3 bg-black/20 rounded border border-[#4a3a2a]/50">
                <p className="text-[9px] text-[#8b6b4d] leading-relaxed">
                  Adjusting the UI scale helps visibility on smaller displays or high-resolution monitors.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded border border-[#4a3a2a]/50 hover:border-[#8b6b4d]/50 transition-colors cursor-pointer"
                onClick={() => setShowAllNames(!showAllNames)}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[#f4e4bc] font-fantasy text-[10px] uppercase tracking-wider">Show All Nameplates</span>
                  <span className="text-[8px] text-[#8b6b4d] italic">Always show names for all entities</span>
                </div>
                <div className={`w-8 h-4 rounded-full transition-colors relative ${showAllNames ? 'bg-[#c2a472]' : 'bg-black/40'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-[#f4e4bc] transition-all ${showAllNames ? 'left-[17px]' : 'left-0.5'}`} />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-3 bg-black/20 text-center font-serif italic text-[10px] text-[#6d5540]">
          {view === 'menu' ? 'Thy journey persists in the ether...' : 'Calibrating the vision of the realm...'}
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
