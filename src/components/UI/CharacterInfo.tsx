import React, { memo, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Shield, Sword, Gem, Shirt, Footprints, Info, Activity, Zap, HardDrive, Target, Heart, Sparkles, Wind, Crosshair, Swords } from "lucide-react";
import { Character, EquipmentSlots, InventoryItem, Stats } from "../../types";
import { calculateTotalStats, calculatePhysicalDamage, calculateMagicDamage, calculateHPRegen, calculateMPRegen } from "../../lib/gameUtils";
import { useGameStore } from "../../store/useGameStore";
import { ContextMenu } from "./ContextMenu";
import { useScaffold } from "./GameScaffold";
import { CharacterPreview } from "./CharacterPreview";

interface CharacterInfoProps {
  character: Character;
  onClose: () => void;
  onUnequip: (slot: keyof EquipmentSlots) => void;
}

export const CharacterInfo = memo(({ character, onClose, onUnequip }: CharacterInfoProps) => {
  const [contextMenu, setContextMenu] = React.useState<{x: number, y: number, slot: keyof EquipmentSlots, item: InventoryItem} | null>(null);
  const [hoveredItem, setHoveredItem] = React.useState<{item: InventoryItem, x: number, y: number} | null>(null);
  const { toLogical } = useScaffold();

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
  
  const physDmg = useMemo(() => calculatePhysicalDamage(totalStats), [totalStats]);
  const magDmg = useMemo(() => calculateMagicDamage(totalStats), [totalStats]);
  const hpRegen = useMemo(() => calculateHPRegen(totalStats), [totalStats]);
  const mpRegen = useMemo(() => calculateMPRegen(totalStats), [totalStats]);

  const bonusStats = useMemo(() => {
    const bonus: any = {};
    (Object.keys(stats) as Array<keyof Stats>).forEach((s) => {
      bonus[s] = totalStats[s] - stats[s];
    });
    return bonus;
  }, [totalStats, stats]);

  const getSlotIcon = (slot: string) => {
    switch (slot) {
      case "head": return <Shield className="w-5 h-5" />;
      case "chest": return <Shirt className="w-5 h-5" />;
      case "legs": return <Activity className="w-5 h-5" />;
      case "boots": return <Footprints className="w-5 h-5" />;
      case "weapon": return <Sword className="w-5 h-5" />;
      case "offhand": return <Shield className="w-5 h-5" />;
      case "accessory": return <Gem className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, slot: keyof EquipmentSlots, item: InventoryItem) => {
    e.preventDefault();
    const logical = toLogical(e.clientX, e.clientY);
    setContextMenu({ x: logical.x, y: logical.y, slot, item });
    setHoveredItem(null);
  };

  const handleItemHover = (item: InventoryItem, e: React.MouseEvent) => {
    if (contextMenu) return;
    const logical = toLogical(e.clientX, e.clientY);
    setHoveredItem({ item, x: logical.x, y: logical.y });
  };

  const renderSlot = (slot: keyof EquipmentSlots, label: string) => {
    const item = equipment[slot];
    return (
      <div 
        className="group/slot flex items-center gap-3 bg-[#1a140f]/40 p-1.5 rounded-lg border border-[#4a3a2a]/30 hover:border-[#c2a472]/40 transition-colors cursor-pointer" 
        onClick={() => {
          item && onUnequip(slot);
          setHoveredItem(null);
        }}
        onContextMenu={(e) => item && handleContextMenu(e, slot, item)}
        onMouseEnter={(e) => item && handleItemHover(item, e)}
        onMouseLeave={() => setHoveredItem(null)}
        onMouseMove={(e) => item && handleItemHover(item, e)}
      >
        <div className={`w-10 h-10 rounded border ${item ? 'border-[#c2a472] bg-[#2d221a]' : 'border-[#4a3a2a]/40 bg-[#120e0a]'} flex items-center justify-center relative shrink-0`}>
          {item ? (
            <span className="text-xl select-none">{item.icon}</span>
          ) : (
            <div className="text-[#4a3a2a] opacity-40">{getSlotIcon(slot as string)}</div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[8px] uppercase tracking-tighter text-[#8b6b4d] font-fantasy">{label}</span>
          <span className={`text-[10px] font-bold truncate ${item ? 'text-[#f4e4bc]' : 'text-[#4a3a2a]'}`}>
            {item ? item.name : "Empty Slot"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      className="fixed top-24 left-8 z-50 pointer-events-none"
    >
      <div className="bg-[#1a140f]/98 backdrop-blur-xl border-2 border-[#4a3a2a] rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)] pointer-events-auto w-[680px] h-[520px] flex flex-col relative border-t-[#c2a472]/20">
        
        {/* Header Overlay */}
        <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-[#c2a472]/10 to-transparent pointer-events-none" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8b6b4d] hover:text-[#f4e4bc] p-2 z-20 hover:rotate-90 transition-all duration-300"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left: Equipment List */}
          <div className="w-56 p-5 flex flex-col gap-2 border-r border-[#4a3a2a]/30">
            <h3 className="text-[10px] font-fantasy font-black text-[#8b6b4d] uppercase tracking-[0.3em] mb-2 border-b border-[#4a3a2a]/40 pb-2">Loadout</h3>
            {renderSlot("head", "Helmet")}
            {renderSlot("chest", "Body Armor")}
            {renderSlot("legs", "Legwear")}
            {renderSlot("boots", "Footwear")}
            {renderSlot("weapon", "Primary Weapon")}
            {renderSlot("offhand", "Off-hand / Shield")}
            {renderSlot("accessory", "Enchanted Relic")}
          </div>

          {/* Center: Character Visual & Name */}
          <div className="flex-1 relative flex flex-col items-center justify-center p-6 bg-[#0c0a08]/40">
             <div className="mb-6 text-center z-10">
                <div className="text-[10px] font-fantasy text-[#c2a472] uppercase tracking-[0.4em] mb-1">Level {character.level} {character.class}</div>
                <h2 className="text-4xl font-display font-black text-[#f4e4bc] uppercase tracking-tighter italic scale-y-110 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                  {character.name}
                </h2>
             </div>

             <div className="relative w-72 h-72 flex items-center justify-center">
                {/* Visual Aura */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                  className="absolute inset-0 border border-dashed border-[#c2a472]/20 rounded-full scale-110"
                />
                
                <div className="absolute inset-0 z-10">
                  <CharacterPreview character={character} interactive zoom={1.2} />
                </div>

                <div className="absolute bottom-4 w-48 h-8 bg-black/60 rounded-[100%] blur-2xl" />
             </div>

             {/* Resources at bottom of center */}
             <div className="w-full mt-auto space-y-3">
                <div className="space-y-1">
                   <div className="flex justify-between items-end px-1">
                      <span className="text-[8px] font-black text-red-500/80 uppercase tracking-widest flex items-center gap-1">
                        <Heart size={8} /> Health
                      </span>
                      <span className="text-[10px] font-mono text-red-100 font-bold">{character.hp} / {character.maxHp}</span>
                   </div>
                   <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-red-950/30">
                      <div className="h-full bg-linear-to-r from-red-800 to-red-500" style={{ width: `${(character.hp / character.maxHp) * 100}%` }} />
                   </div>
                </div>
                <div className="space-y-1">
                   <div className="flex justify-between items-end px-1">
                      <span className="text-[8px] font-black text-blue-500/80 uppercase tracking-widest flex items-center gap-1">
                        <Zap size={8} /> Mana
                      </span>
                      <span className="text-[10px] font-mono text-blue-100 font-bold">{character.mp} / {character.maxMp}</span>
                   </div>
                   <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-blue-950/30">
                      <div className="h-full bg-linear-to-r from-blue-800 to-blue-500" style={{ width: `${(character.mp / character.maxMp) * 100}%` }} />
                   </div>
                </div>
             </div>
          </div>

          {/* Right: Detailed Stats */}
          <div className="w-64 bg-[#120e0a]/60 p-6 border-l border-[#4a3a2a]/30 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] font-fantasy font-black text-[#8b6b4d] uppercase tracking-[0.3em] mb-4 border-b border-[#4a3a2a]/40 pb-2">Attributes</h3>
            
            <div className="grid grid-cols-1 gap-2 mb-6">
              {[
                { label: "STR", val: totalStats.strength, bonus: bonusStats.strength, icon: <Zap size={10} />, color: "text-red-400" },
                { label: "DEX", val: totalStats.dexterity, bonus: bonusStats.dexterity, icon: <Target size={10} />, color: "text-green-400" },
                { label: "INT", val: totalStats.intelligence, bonus: bonusStats.intelligence, icon: <HardDrive size={10} />, color: "text-blue-400" },
                { label: "WIS", val: totalStats.wisdom, bonus: bonusStats.wisdom, icon: <Activity size={10} />, color: "text-yellow-400" },
                { label: "STA", val: totalStats.stamina, bonus: bonusStats.stamina, icon: <Heart size={10} />, color: "text-orange-400" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between bg-black/20 p-2 rounded border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={s.color}>{s.icon}</span>
                    <span className="text-[10px] font-bold text-[#8b6b4d]">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-[#f4e4bc] font-bold">{s.val}</span>
                    {s.bonus > 0 && <span className="text-[8px] font-mono text-green-500">+{s.bonus}</span>}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-[10px] font-fantasy font-black text-[#8b6b4d] uppercase tracking-[0.3em] mb-4 border-b border-[#4a3a2a]/40 pb-2">Combat Power</h3>
            
            <div className="space-y-3">
              <StatRow icon={<Swords size={12} />} label="Attack Power" value={physDmg.toFixed(1)} />
              <StatRow icon={<Sparkles size={12} />} label="Magic Power" value={magDmg.toFixed(1)} />
              <StatRow icon={<Activity size={12} />} label="HP Regen" value={`${hpRegen}/3s`} />
              <StatRow icon={<Zap size={12} />} label="MP Regen" value={`${mpRegen}/3s`} />
              <StatRow icon={<Wind size={12} />} label="Movement" value="1.0x" />
              <StatRow icon={<Crosshair size={12} />} label="Crit Chance" value="5.0%" />
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu Overlay - Moved outside the relative container */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          title={contextMenu.item.name}
          onClose={() => setContextMenu(null)}
          options={[
            {
              label: "Unequip Item",
              icon: <Sword size={14} />,
              onClick: () => {
                onUnequip(contextMenu.slot);
                setHoveredItem(null);
              }
            }
          ]}
        />
      )}

      {/* Item Tooltip */}
      <AnimatePresence>
        {hoveredItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-none z-100 bg-[#1a140f]/98 backdrop-blur-xl border-2 border-[#c2a472]/40 p-4 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] w-64 lg:w-72"
            style={{ 
              position: 'fixed',
              top: Math.min(1080 - 300, hoveredItem.y - 10),
              left: hoveredItem.x > 1920 / 2 ? hoveredItem.x - 280 : hoveredItem.x + 20,
              pointerEvents: 'none',
              zIndex: 100
            }}
          >
            <div className="text-[#f4e4bc] font-display font-black text-lg mb-1 uppercase italic tracking-tighter">
              {hoveredItem.item.name}
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-fantasy text-[#8b6b4d] uppercase tracking-widest">
                {hoveredItem.item.rarity} {hoveredItem.item.type}
              </span>
              {hoveredItem.item.quantity && hoveredItem.item.quantity > 1 && (
                <span className="text-xs font-mono text-[#c2a472]">x{hoveredItem.item.quantity}</span>
              )}
            </div>

            {hoveredItem.item.stats && (
              <div className="space-y-1 bg-black/20 p-2 rounded border border-white/5">
                {Object.entries(hoveredItem.item.stats).map(([stat, value]) => (
                  <div key={stat} className="flex justify-between text-[11px]">
                    <span className="text-[#8b6b4d] uppercase tracking-wider">{stat}</span>
                    <span className="text-[#c2a472] font-mono font-bold">+{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 text-[8px] text-[#8b6b4d] font-fantasy uppercase">
               <Info className="w-3 h-3" />
               <span>Right-Click for Options</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

const StatRow = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex justify-between items-center px-1">
    <div className="flex items-center gap-2 text-[#8b6b4d]">
      <span className="opacity-60">{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-xs font-mono text-[#c2a472] font-black">{value}</span>
  </div>
);

CharacterInfo.displayName = "CharacterInfo";
