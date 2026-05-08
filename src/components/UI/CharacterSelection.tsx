import React, { useState, memo } from "react";
import { motion } from "motion/react";
import { Character } from "../../types";
import { User, Plus, ChevronRight, Sword, Zap, Target, Trash2, LogOut, Shield, Heart, HelpCircle, ArrowUpDown } from "lucide-react";
import { ParticleEffect } from "./Particles";

interface CharacterSelectionProps {
  characters: Character[];
  onSelect: (character: Character) => void;
  onNew: () => void;
  onDelete: (character: Character) => void;
  onLogout: () => void;
}

export const CharacterSelection = memo(({ characters, onSelect, onNew, onDelete, onLogout }: CharacterSelectionProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(characters.length > 0 ? characters[0].id : null);
  const [sortBy, setSortBy] = useState<"name" | "level" | "class">("level");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedCharacters = [...characters].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") comparison = a.name.localeCompare(b.name);
    else if (sortBy === "level") comparison = a.level - b.level;
    else if (sortBy === "class") comparison = a.class.localeCompare(b.class);
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const toggleSort = (field: "name" | "level" | "class") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "level" ? "desc" : "asc");
    }
  };

  const getClassIcon = (classId: string) => {
    switch (classId) {
      case "warrior": return <Sword size={20} />;
      case "mage": return <Zap size={20} />;
      case "ranger": return <Target size={20} />;
      case "priest": return <Heart size={20} />;
      case "rogue": return <Shield size={20} />;
      default: return <User size={20} />;
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const confirmDelete = (e: React.MouseEvent, char: Character) => {
    e.stopPropagation();
    onDelete(char);
    setDeletingId(null);
    if (highlightedId === char.id) setHighlightedId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  const handleEnterWorld = () => {
    const char = characters.find(c => c.id === highlightedId);
    if (char) onSelect(char);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="fixed inset-0 bg-[#1a1410] text-[#e2d1b0] z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-10 pointer-events-none"></div>
      
      <ParticleEffect />
      
      <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-6 py-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl w-full flex flex-col relative z-10"
          >
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-display font-black text-[#f4e4bc] mb-2 sm:mb-4 tracking-widest uppercase">Character Select</h1>
          <p className="text-[#8b6b4d] font-serif italic text-sm sm:text-xl underline underline-offset-4 sm:underline-offset-8 decoration-[#4a3a2a]">Choose a character to continue your journey</p>
        </div>

        {/* Sort Bar */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-4 sm:mb-8">
          <span className="text-[8px] sm:text-[10px] font-fantasy text-[#4a3a2a] uppercase tracking-[0.2em] self-center mr-1 sm:mr-2">Sort By:</span>
          {(["name", "level", "class"] as const).map((field) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border transition-all font-fantasy text-[8px] sm:text-[10px] uppercase tracking-widest ${
                sortBy === field 
                  ? "bg-[#c2a472]/10 border-[#c2a472] text-[#f4e4bc]" 
                  : "border-[#4a3a2a] text-[#6d5540] hover:border-[#8b6b4d]"
              }`}
            >
              {field}
              {sortBy === field && (
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: sortOrder === "asc" ? 0 : 180 }}
                >
                  <ArrowUpDown size={10} />
                </motion.div>
              )}
            </button>
          ))}
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-2 sm:p-4"
        >
          {sortedCharacters.map((char) => {
            const isHighlighted = highlightedId === char.id;
            return (
              <motion.div
                key={char.id}
                variants={item}
                whileHover={{ y: -5 }}
                onClick={() => setHighlightedId(char.id)}
                className={`bg-[#2d221a] border-2 rounded p-6 text-left group transition-all relative overflow-hidden shadow-2xl cursor-pointer ${
                  isHighlighted ? "border-[#c2a472] ring-2 ring-[#c2a472]/20 shadow-[0_0_30px_rgba(194,164,114,0.15)]" : "border-[#4a3a2a] hover:border-[#8b6b4d]"
                }`}
              >
                {/* Sheen Effect */}
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-sheen pointer-events-none"
                  initial={false}
                />

                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-transparent to-black/30 pointer-events-none" />
                
                <div className="flex justify-between items-start mb-6">
                  <div 
                    className="w-12 h-12 rounded border-2 border-[#4a3a2a] flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: char.color }}
                  >
                    {getClassIcon(char.class)}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-fantasy text-[#8b6b4d] uppercase tracking-widest bg-black/40 px-2 py-1 rounded">Lv. {char.level}</span>
                    
                    {deletingId === char.id ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => confirmDelete(e, char)}
                          className="px-2 py-1 text-[8px] bg-red-900/40 text-red-100 border border-red-500/50 rounded uppercase font-fantasy hover:bg-red-600 transition-colors"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={cancelDelete}
                          className="px-2 py-1 text-[8px] bg-stone-800 text-stone-300 border border-stone-600 rounded uppercase font-fantasy hover:bg-stone-700 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => handleDeleteClick(e, char.id)}
                        className="p-1.5 text-red-900/40 hover:text-red-500 transition-colors bg-black/20 rounded border border-transparent hover:border-red-500/30"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <h2 className="text-2xl font-display font-bold text-[#f4e4bc] mb-1 group-hover:text-white transition-colors flex items-center gap-2">
                  {char.name}
                  {char.role && char.role !== 'player' && (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-widest ${
                      char.role === 'dev' ? "bg-red-500/20 border-red-500 text-red-400" :
                      char.role === 'admin' ? "bg-orange-500/20 border-orange-500 text-orange-400" :
                      "bg-blue-500/20 border-blue-500 text-blue-400"
                    }`}>
                      {char.role}
                    </span>
                  )}
                </h2>
                <p className="text-[#8b6b4d] font-fantasy text-xs uppercase tracking-[0.2em] mb-4">{char.class}</p>

                <div className="flex items-center justify-end pt-4 border-t border-[#4a3a2a]">
                  <ChevronRight size={16} className={`${isHighlighted ? "text-[#c2a472] translate-x-1" : "text-[#4a3a2a]"} transition-all`} />
                </div>
              </motion.div>
            );
          })}

          {/* New Character Button */}
          <motion.button
            whileHover={{ y: -5 }}
            onClick={onNew}
            className="border-2 border-dashed border-[#4a3a2a] rounded p-6 flex flex-col items-center justify-center text-[#8b6b4d] hover:border-[#c2a472] hover:text-[#c2a472] transition-all bg-black/10 group h-full min-h-[160px]"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#4a3a2a] flex items-center justify-center mb-4 group-hover:border-[#c2a472] transition-colors">
              <Plus size={24} />
            </div>
            <span className="text-sm font-fantasy font-bold uppercase tracking-[0.3em]">Embody New Hero</span>
          </motion.button>
        </motion.div>
        
        <div className="mt-12 flex flex-col items-center gap-6">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!highlightedId}
            onClick={handleEnterWorld}
            className={`px-12 py-4 text-lg font-fantasy uppercase tracking-[0.4em] transition-all shadow-2xl rounded ${
              highlightedId 
                ? "bg-[#c2a472] text-[#1a1410] hover:bg-[#d4b98a] border-y-2 border-[#f4e4bc]/40" 
                : "bg-black/20 text-[#4a3a2a] border-2 border-[#4a3a2a] cursor-not-allowed opacity-50"
            }`}
          >
            Enter World
          </motion.button>

          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-6 py-2 border-2 border-[#4a3a2a] text-[#8b6b4d] hover:border-red-500 hover:text-red-500 transition-all font-fantasy text-xs uppercase tracking-widest bg-black/20 rounded"
          >
            <LogOut size={14} />
            Log Out
          </button>
        </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
});

CharacterSelection.displayName = "CharacterSelection";
