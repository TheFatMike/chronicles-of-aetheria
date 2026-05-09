import React from "react";
import { motion } from "motion/react";
import { Briefcase, User, Scroll, Shield, Map as MapIcon, Settings } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";

export const NavigationMenu = () => {
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
    setSkillsOpen
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
    setSkillsOpen: s.setSkillsOpen
  })));

  const menuItems = [
    { id: 'menu', icon: <User size={20} />, label: 'Character', key: 'C' },
    { id: 'inventory', icon: <Briefcase size={20} />, label: 'Inventory', key: 'B' },
    { id: 'skills', icon: <Shield size={20} />, label: 'Skills', key: 'K' },
    { id: 'quests', icon: <Scroll size={20} />, label: 'Quests', key: 'J' },
    { id: 'map', icon: <MapIcon size={20} />, label: 'Map', key: 'M' },
  ];

  return (
    <div className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-50 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-[#1a140f]/90 backdrop-blur-md rounded-lg border-2 border-[#4a3a2a] shadow-2xl">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            if (item.id === 'inventory') setInventoryOpen(!isInventoryOpen);
            else if (item.id === 'menu') setCharacterOpen(!isCharacterOpen);
            else if (item.id === 'quests') setQuestsOpen(!isQuestsOpen);
            else if (item.id === 'skills') setSkillsOpen(!isSkillsOpen);
            else setActiveMenu(activeMenu === item.id ? null : item.id as any);
          }}
          className={`relative group p-2 rounded-full transition-all duration-300
            ${(item.id === 'inventory' && isInventoryOpen) || 
              (item.id === 'menu' && isCharacterOpen) || 
              (item.id === 'quests' && isQuestsOpen) ||
              (item.id === 'skills' && isSkillsOpen) ||
              activeMenu === item.id 
              ? 'bg-[#c2a472] text-[#1a140f] shadow-[0_0_15px_rgba(194,164,114,0.4)] scale-110' 
              : 'text-[#8b6b4d] hover:text-[#f4e4bc] hover:bg-white/5'
            }
          `}
        >
          {item.icon}
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-2 py-1 bg-[#1a140f] border border-[#4a3a2a] rounded text-[10px] font-fantasy uppercase tracking-widest text-[#f4e4bc] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
            {item.label} <span className="text-[#8b6b4d] ml-1">[{item.key}]</span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#4a3a2a]" />
          </div>
        </button>
      ))}
      
      <div className="w-px h-6 bg-[#4a3a2a] mx-1" />
      
      <button
        onClick={() => {}} // Could open system menu
        className="p-2 text-[#8b6b4d] hover:text-[#f4e4bc] hover:bg-white/5 rounded-full transition-all"
      >
        <Settings size={20} />
      </button>
    </div>
  );
};
