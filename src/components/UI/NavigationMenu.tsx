/**
 * @file src/components/UI/NavigationMenu.tsx
 * @description The main navigation bar for accessing in-game systems.
 * Provides quick links to Inventory, Character Info, Skills, Quests, and the Map.
 * @importance Essential: The primary interface for navigating between the game's various feature windows.
 */
import React from "react";
import { motion } from "motion/react";
import { Briefcase, User, Scroll, Shield, Map as MapIcon, Settings, Zap } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";

interface NavigationMenuProps {
  onOpenSettings?: () => void;
}

export const NavigationMenu = ({ onOpenSettings }: NavigationMenuProps) => {
  const {
    activeMenu,
    setActiveMenu,
    isInventoryOpen,
    setInventoryOpen,
    isCharacterOpen,
    setCharacterOpen,
    isQuestsOpen,
    setQuestsOpen,
    isSkillsOpen,
    setSkillsOpen,
    isPassiveTreeOpen,
    setPassiveTreeOpen
  } = useGameStore(useShallow((s) => ({
    activeMenu: s.activeMenu,
    setActiveMenu: s.setActiveMenu,
    isInventoryOpen: s.isInventoryOpen,
    setInventoryOpen: s.setInventoryOpen,
    isCharacterOpen: s.isCharacterOpen,
    setCharacterOpen: s.setCharacterOpen,
    isQuestsOpen: s.isQuestsOpen,
    setQuestsOpen: s.setQuestsOpen,
    isSkillsOpen: s.isSkillsOpen,
    setSkillsOpen: s.setSkillsOpen,
    isPassiveTreeOpen: s.isPassiveTreeOpen,
    setPassiveTreeOpen: s.setPassiveTreeOpen
  })));

  const menuItems = [
    { id: 'menu', icon: <User size={20} />, label: 'Character', key: 'C' },
    { id: 'inventory', icon: <Briefcase size={20} />, label: 'Inventory', key: 'B' },
    { id: 'skills', icon: <Shield size={20} />, label: 'Skills', key: 'K' },
    { id: 'passives', icon: <Zap size={20} />, label: 'Talents', key: 'N' },
    { id: 'quests', icon: <Scroll size={20} />, label: 'Quests', key: 'J' },
    { id: 'map', icon: <MapIcon size={20} />, label: 'Map', key: 'M' },
  ];

  return (
    <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-aetheria-950/90 backdrop-blur-md rounded-lg border-2 border-aetheria-800 shadow-2xl pointer-events-auto">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            if (item.id === 'inventory') setInventoryOpen(!isInventoryOpen);
            else if (item.id === 'menu') setCharacterOpen(!isCharacterOpen);
            else if (item.id === 'quests') setQuestsOpen(!isQuestsOpen);
            else if (item.id === 'skills') setSkillsOpen(!isSkillsOpen);
            else if (item.id === 'passives') setPassiveTreeOpen(!isPassiveTreeOpen);
            else setActiveMenu(activeMenu === item.id ? null : item.id as any);
          }}
          className={`relative group p-2 rounded-full transition-all duration-300
            ${(item.id === 'inventory' && isInventoryOpen) ||
              (item.id === 'menu' && isCharacterOpen) ||
              (item.id === 'quests' && isQuestsOpen) ||
              (item.id === 'skills' && isSkillsOpen) ||
              (item.id === 'passives' && isPassiveTreeOpen) ||
              activeMenu === item.id
              ? 'bg-aetheria-400 text-aetheria-950 shadow-gold-glow scale-110'
              : 'text-aetheria-600 hover:text-aetheria-200 hover:bg-white/5'
            }
          `}
        >
          {item.icon}

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-2 py-1 bg-aetheria-950 border border-aetheria-800 rounded text-[10px] font-fantasy uppercase tracking-widest text-aetheria-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
            {item.label} <span className="text-aetheria-600 ml-1">[{item.key}]</span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-aetheria-800" />
          </div>
        </button>
      ))}

      <div className="w-px h-6 bg-aetheria-800 mx-1" />

      <button
        onClick={onOpenSettings}
        className="p-2 text-aetheria-600 hover:text-aetheria-200 hover:bg-white/5 rounded-full transition-all"
      >
        <Settings size={20} />
      </button>
    </div>
  );
};
