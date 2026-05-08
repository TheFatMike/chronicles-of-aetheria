import React, { memo, useMemo } from "react";
import { motion } from "motion/react";
import { X, Shield, Sword, Gem, Shirt, Footprints, Info, Activity, Zap, HardDrive, Target, Heart } from "lucide-react";
import { Character, EquipmentSlots, InventoryItem, Stats } from "../../types";
import { calculateTotalStats } from "../../lib/gameUtils";
import { useGameStore } from "../../store/useGameStore";

interface CharacterInfoProps {
  character: Character;
  onClose: () => void;
  onUnequip: (slot: keyof EquipmentSlots) => void;
}

export const CharacterInfo = memo(({ character, onClose, onUnequip }: CharacterInfoProps) => {
  const equipment = character.equipment || {
    head: null,
    chest: null,
    legs: null,
    boots: null,
    weapon: null,
    offhand: null,
    accessory: null,
  };

  const stats = character.stats;

  const totalStats = useMemo(() => calculateTotalStats(character.stats, character.equipment), [character.stats, character.equipment]);
  
  const bonusStats = useMemo(() => {
    const bonus: any = {};
    (Object.keys(stats) as Array<keyof Stats>).forEach((s) => {
      bonus[s] = totalStats[s] - stats[s];
    });
    return bonus;
  }, [totalStats, stats]);

  const getSlotIcon = (slot: string) => {
    switch (slot) {
      case "head": return <Shield className="w-6 h-6" />;
      case "chest": return <Shirt className="w-6 h-6" />;
      case "legs": return <Activity className="w-6 h-6" />;
      case "boots": return <Footprints className="w-6 h-6" />;
      case "weapon": return <Sword className="w-6 h-6" />;
      case "offhand": return <Shield className="w-6 h-6" />;
      case "accessory": return <Gem className="w-6 h-6" />;
      default: return <Info className="w-6 h-6" />;
    }
  };

  const renderSlot = (slot: keyof EquipmentSlots, label: string) => {
    const item = equipment[slot];
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-[#8b6b4d] font-fantasy font-bold">{label}</span>
        <div 
          className={`w-14 h-14 rounded-lg border-2 ${item ? 'border-[#c2a472] bg-[#2d221a]' : 'border-[#4a3a2a]/30 bg-[#1a140f]'} flex items-center justify-center relative group/slot cursor-pointer transition-all hover:border-[#c2a472]/60 overflow-hidden shrink-0`}
          onClick={() => item && onUnequip(slot)}
        >
          {item ? (
            <div className="w-full h-full p-2 flex items-center justify-center bg-linear-to-br from-[#c2a472]/10 to-transparent">
               <span className="text-2xl select-none">{item.icon}</span>
               {/* Tooltip */}
               <div className="absolute left-full ml-4 top-0 w-48 bg-[#1a140f] border border-[#4a3a2a] p-3 rounded-lg shadow-2xl opacity-0 group-hover/slot:opacity-100 pointer-events-none transition-opacity z-50">
                 <div className="text-[#f4e4bc] font-bold text-xs mb-1">{item.name}</div>
                 <div className="text-[#8b6b4d] text-[10px] uppercase mb-2">{item.rarity} {item.type}</div>
                 {item.stats && Object.entries(item.stats).map(([s, val]) => (
                   <div key={s} className="text-[#c2a472] text-[10px] flex justify-between">
                     <span className="capitalize">{s}</span>
                     <span>+{val}</span>
                   </div>
                 ))}
                 <div className="mt-2 pt-2 border-t border-[#4a3a2a]/30 text-[#8b6b4d]/80 text-[10px] italic">
                   Click to unequip
                 </div>
               </div>
            </div>
          ) : (
            <div className="text-[#4a3a2a] opacity-30">
              {getSlotIcon(slot as string)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onClose} />
      
      <div className="bg-[#1a140f] border-4 border-[#4a3a2a] rounded-xl overflow-hidden shadow-2xl pointer-events-auto w-full max-w-2xl h-[600px] flex flex-row relative z-10 transition-all duration-300">
        
        {/* Left Part: Character & Equipment */}
        <div className="flex-1 p-8 border-r border-[#4a3a2a]/30 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-display font-black text-[#f4e4bc] leading-none mb-1 uppercase tracking-tight">Hero Profile</h2>
              <p className="text-[10px] font-fantasy text-[#8b6b4d] uppercase tracking-[0.2em]">{character.name} • Level {character.level} {character.class}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-row items-center justify-center gap-8 py-4">
            <div className="flex flex-col gap-4 flex-wrap justify-center">
              {renderSlot("head", "Head")}
              {renderSlot("chest", "Chest")}
              {renderSlot("legs", "Legs")}
              {renderSlot("boots", "Boots")}
            </div>

            <div className="relative w-40 h-80 bg-[#2d221a]/30 rounded-3xl border border-[#4a3a2a]/20 flex items-center justify-center overflow-hidden shrink-0">
               <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                 <Activity className="w-32 h-32 text-[#c2a472]" />
               </div>
               <div className="z-10 text-6xl opacity-50 drop-shadow-[0_0_20px_rgba(194,164,114,0.3)]">
                  {character.class === "warrior" && "🛡️"}
                  {character.class === "mage" && "✨"}
                  {character.class === "ranger" && "🏹"}
                  {character.class === "rogue" && "🔪"}
                  {character.class === "priest" && "📜"}
               </div>
               <div className="absolute bottom-10 w-24 h-4 bg-black/40 rounded-[100%] blur-md" />
            </div>

            <div className="flex flex-col gap-4 flex-wrap justify-center">
              {renderSlot("weapon", "Primary")}
              {renderSlot("offhand", "Off-hand")}
              {renderSlot("accessory", "Relic")}
            </div>
          </div>
        </div>

        {/* Right Part: Stats & Attributes */}
        <div className="w-72 bg-[#120e0a] p-8 flex flex-col overflow-y-auto custom-scrollbar border-l border-[#4a3a2a]">
          <div className="flex justify-between items-start mb-8">
             <div className="px-3 py-1 bg-[#2d221a] border border-[#4a3a2a] rounded text-[10px] font-mono text-[#f4e4bc]">BASE ATTRIBUTES</div>
             <button 
              onClick={onClose}
              className="text-[#8b6b4d] hover:text-[#f4e4bc] transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6 flex-1">
             {[
               { icon: <Zap className="w-4 h-4" />, label: "Strength", value: stats.strength, bonus: bonusStats.strength, color: "#ef4444" },
               { icon: <Target className="w-4 h-4" />, label: "Dexterity", value: stats.dexterity, bonus: bonusStats.dexterity, color: "#22c55e" },
               { icon: <HardDrive className="w-4 h-4" />, label: "Intelligence", value: stats.intelligence, bonus: bonusStats.intelligence, color: "#3b82f6" },
               { icon: <Activity className="w-4 h-4" />, label: "Wisdom", value: stats.wisdom, bonus: bonusStats.wisdom, color: "#eab308" },
               { icon: <Heart className="w-4 h-4" />, label: "Stamina", value: stats.stamina, bonus: bonusStats.stamina, color: "#f97316" },
             ].map((stat) => (
               <div key={stat.label} className="group">
                 <div className="flex justify-between items-center mb-1.5">
                   <div className="flex items-center gap-2">
                     <div className="text-[#8b6b4d]" style={{ color: stat.bonus > 0 ? stat.color : undefined }}>{stat.icon}</div>
                     <span className="text-[11px] font-bold text-[#c2a472] uppercase tracking-wider">{stat.label}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <span className="text-sm font-mono text-[#f4e4bc] font-bold">{stat.value + (stat.bonus || 0)}</span>
                     {stat.bonus > 0 && <span className="text-[10px] font-mono text-green-500">+{stat.bonus}</span>}
                   </div>
                 </div>
                 <div className="h-1 bg-[#1a140f] rounded-full overflow-hidden border border-[#4a3a2a]/20">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (stat.value + (stat.bonus || 0)) * 2)}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: stat.color }}
                    />
                 </div>
               </div>
             ))}
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center px-4 py-2 bg-red-950/30 border border-red-900/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-[10px] font-bold text-red-200/50 uppercase tracking-widest whitespace-nowrap">Health</span>
              </div>
              <span className="text-sm font-mono text-red-200 font-bold ml-2">{character.hp} / {character.maxHp}</span>
            </div>
            <div className="flex justify-between items-center px-4 py-2 mt-4 bg-blue-950/30 border border-blue-900/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-bold text-blue-200/50 uppercase tracking-widest whitespace-nowrap">Mana</span>
              </div>
              <span className="text-sm font-mono text-blue-200 font-bold ml-2">{character.mp} / {character.maxMp}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

CharacterInfo.displayName = "CharacterInfo";
