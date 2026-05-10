import React, { useState, memo } from "react";
import { motion } from "motion/react";
import { Character } from "../../types";
import { Plus, ChevronRight, Trash2, LogOut, ArrowUpDown } from "lucide-react";
import { ParticleEffect } from "./Particles";
import { CharacterPreview } from "./CharacterPreview";
import { CharacterCard } from "./CharacterCard";

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
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      {/* Background Ambience - localized to provide some depth even within scaffold */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-[#4a3420]/10 via-transparent to-transparent pointer-events-none" />
      
      <ParticleEffect />

      {/* Top Left Logout Button */}
      <motion.button 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onLogout}
        className="fixed top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 px-4 py-2 border border-[#4a3a2a]/40 text-[#8b6b4d] hover:border-red-500 hover:text-red-500 transition-all font-fantasy text-[10px] uppercase tracking-widest bg-black/40 backdrop-blur-sm rounded z-50 group shadow-lg"
      >
        <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
        Log Out
      </motion.button>
      
      <div className="relative z-10 w-full h-full flex flex-col items-center max-w-5xl mx-auto px-4 py-6 sm:py-10 overflow-hidden">
        {/* Header Section (Fixed) */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 shrink-0"
        >
          <h1 className="text-3xl sm:text-5xl font-display font-black text-[#f4e4bc] mb-1 sm:mb-2 tracking-widest uppercase drop-shadow-[0_0_15px_rgba(194,164,114,0.3)]">
            Character Select
          </h1>
          <p className="text-[#8b6b4d] font-serif italic text-sm sm:text-lg opacity-80">
            Choose a character to continue your journey
          </p>
          
          <div className="h-px w-32 bg-linear-to-r from-transparent via-[#4a3a2a] to-transparent mx-auto mt-4" />
        </motion.div>

        {/* Sort Bar (Fixed) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-6 shrink-0"
        >
          <span className="text-[8px] sm:text-[10px] font-fantasy text-[#4a3a2a] uppercase tracking-[0.2em] self-center mr-1 sm:mr-2">Sort By:</span>
          {(["name", "level", "class"] as const).map((field) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded border transition-all font-fantasy text-[8px] sm:text-[10px] uppercase tracking-widest ${
                sortBy === field 
                  ? "bg-[#c2a472]/10 border-[#c2a472] text-[#f4e4bc] shadow-[0_0_10px_rgba(194,164,114,0.1)]" 
                  : "border-[#4a3a2a] text-[#6d5540] hover:border-[#8b6b4d] bg-black/20"
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
        </motion.div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="flex-1 w-full overflow-y-auto custom-scrollbar px-2 sm:px-4 pt-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
            {sortedCharacters.map((char) => (
              <CharacterCard
                key={char.id}
                char={char}
                isHighlighted={highlightedId === char.id}
                isDeleting={deletingId === char.id}
                onSelect={setHighlightedId}
                onDeleteClick={handleDeleteClick}
                onConfirmDelete={confirmDelete}
                onCancelDelete={cancelDelete}
                itemVariants={item}
              />
            ))}

            {/* New Character Button */}
            {characters.length < 6 && (
              <motion.button
                whileHover={{ y: -5 }}
                onClick={onNew}
                className="border-2 border-dashed border-[#4a3a2a] rounded p-6 flex flex-col items-center justify-center text-[#8b6b4d] hover:border-[#c2a472] hover:text-[#c2a472] transition-all bg-black/20 group h-full min-h-[200px]"
              >
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#4a3a2a] flex items-center justify-center mb-4 group-hover:border-[#c2a472] transition-colors">
                  <Plus size={20} />
                </div>
                <span className="text-xs font-fantasy font-bold uppercase tracking-[0.3em] text-center">Embody New Hero</span>
              </motion.button>
            )}
          </div>
        </motion.div>
        
        {/* Footer Actions (Fixed) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 shrink-0 flex flex-col items-center gap-4 w-full"
        >
          <div className="h-px w-full bg-linear-to-r from-transparent via-[#4a3a2a] to-transparent mb-1" />
          
          <div className="flex flex-col items-center gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!highlightedId}
              onClick={handleEnterWorld}
              className={`px-20 py-4 text-xl font-fantasy uppercase tracking-[0.4em] transition-all shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded relative overflow-hidden group ${
                highlightedId 
                  ? "bg-[#c2a472] text-[#1a1410] hover:bg-[#d4b98a] border-y-2 border-[#f4e4bc]/40" 
                  : "bg-black/40 text-[#4a3a2a] border border-[#4a3a2a] cursor-not-allowed opacity-50"
              }`}
            >
              {highlightedId && (
                <motion.div 
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-sheen pointer-events-none"
                />
              )}
              Enter World
            </motion.button>
          </div>
          
          <div className="text-[#4a3a2a] font-serif text-[8px] sm:text-[10px] uppercase tracking-widest opacity-60">
            Chronicles of Aetheria &copy; 2026
          </div>
        </motion.div>
      </div>
    </div>
  );
});

CharacterSelection.displayName = "CharacterSelection";
