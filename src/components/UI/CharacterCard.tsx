import { motion, AnimatePresence } from "motion/react";
import { Trash2, ChevronRight } from "lucide-react";
import { Character } from "../../types";
import { CharacterPreview } from "./CharacterPreview";

interface CharacterCardProps {
  char: Character;
  isHighlighted: boolean;
  isDeleting: boolean;
  onSelect: (id: string) => void;
  onDeleteClick: (e: React.MouseEvent, id: string) => void;
  onConfirmDelete: (e: React.MouseEvent, char: Character) => void;
  onCancelDelete: (e: React.MouseEvent) => void;
  itemVariants: any;
}

export const CharacterCard = ({
  char,
  isHighlighted,
  isDeleting,
  onSelect,
  onDeleteClick,
  onConfirmDelete,
  onCancelDelete,
  itemVariants
}: CharacterCardProps) => {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -5 }}
      onClick={() => onSelect(char.id)}
      className={`bg-[#1a1410] border rounded p-5 text-left group transition-all relative overflow-hidden shadow-2xl cursor-pointer ${
        isHighlighted 
          ? "border-[#c2a472] ring-1 ring-[#c2a472]/30 shadow-[0_0_40px_rgba(194,164,114,0.15)] scale-[1.02]" 
          : "border-[#4a3a2a] hover:border-[#8b6b4d] opacity-80 hover:opacity-100"
      }`}
    >
      {/* Sheen Effect */}
      <motion.div
        className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-sheen pointer-events-none"
        initial={false}
      />

      <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-transparent to-black/30 pointer-events-none" />
      
      <div className="flex justify-between items-start mb-4 h-36 relative">
        <div className="absolute inset-0 z-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <CharacterPreview character={char} rotation zoom={1.3} />
        </div>
        
        <div className="flex flex-col items-end gap-2 ml-auto z-10 relative">
          <span className="text-[10px] font-fantasy text-[#8b6b4d] uppercase tracking-widest bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-white/10">Lv. {char.level}</span>
          
          <AnimatePresence mode="wait">
            {isDeleting ? (
              <motion.div 
                key="confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2"
              >
                <button 
                  onClick={(e) => onConfirmDelete(e, char)}
                  className="px-2 py-1 text-[8px] bg-red-900/80 text-red-100 border border-red-500/50 rounded uppercase font-fantasy hover:bg-red-600 transition-colors backdrop-blur-md"
                >
                  Confirm
                </button>
                <button 
                  onClick={onCancelDelete}
                  className="px-2 py-1 text-[8px] bg-stone-800/80 text-stone-300 border border-stone-600 rounded uppercase font-fantasy hover:bg-stone-700 transition-colors backdrop-blur-md"
                >
                  No
                </button>
              </motion.div>
            ) : (
              <motion.button 
                key="delete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={(e) => onDeleteClick(e, char.id)}
                className="p-1.5 text-red-900/60 hover:text-red-500 transition-colors bg-black/60 backdrop-blur-md rounded border border-white/5 hover:border-red-500/30"
              >
                <Trash2 size={12} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <h2 className="text-xl font-display font-bold text-[#f4e4bc] mb-0.5 group-hover:text-white transition-colors flex items-center gap-2">
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
      <p className="text-[#8b6b4d] font-fantasy text-[10px] uppercase tracking-[0.2em] mb-3">{char.class}</p>

      <div className="flex items-center justify-end pt-3 border-t border-[#4a3a2a]">
        <ChevronRight size={14} className={`${isHighlighted ? "text-[#c2a472] translate-x-1" : "text-[#4a3a2a]"} transition-all`} />
      </div>
    </motion.div>
  );
};
