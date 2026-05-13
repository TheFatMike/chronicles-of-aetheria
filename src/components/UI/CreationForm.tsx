/**
 * @file src/components/UI/CreationForm.tsx
 * @description Manages the data entry and validation for character creation.
 * Handles name input, class selection, and color customization.
 * @importance Essential: Ensures that player-created characters have valid and complete data before entering the game.
 */
import { motion, AnimatePresence } from "motion/react";
import { User, Shield, Info, ChevronRight } from "lucide-react";
import { CHARACTER_CLASSES } from "../../constants";

interface CreationFormProps {
  characterName: string;
  handleNameChange: (val: string) => void;
  isLoading: boolean;
  displayError: string | null;
  selectedClassIdx: number;
  setSelectedClassIdx: (idx: number) => void;
  handleComplete: () => void;
}

export const CreationForm = ({
  characterName,
  handleNameChange,
  isLoading,
  displayError,
  selectedClassIdx,
  setSelectedClassIdx,
  handleComplete
}: CreationFormProps) => {
  return (
    <div className="col-span-12 lg:col-span-5 bg-[#251b14] border-2 sm:border-4 border-aetheria-800 rounded p-6 sm:p-10 flex flex-col justify-start shadow-2xl relative h-fit">
      <div className="space-y-8 sm:space-y-12">
        <div>
          <h3 className="text-[10px] sm:text-sm border-b-2 border-aetheria-800 pb-2 sm:pb-3 mb-6 sm:mb-8 flex items-center gap-2 sm:gap-3 font-fantasy text-aetheria-400 uppercase tracking-widest">
            <User size={14} className="sm:w-4 sm:h-4" />
            Vessel Identity
          </h3>
          <div className="relative group">
            <input
              type="text"
              value={characterName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter Name..."
              disabled={isLoading}
              className={`w-full bg-black/40 border-2 p-5 font-serif text-lg text-aetheria-200 placeholder:text-aetheria-800 focus:outline-none transition-colors tracking-wide ${displayError ? "border-red-900 focus:border-red-500" : "border-aetheria-800 focus:border-aetheria-400"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              maxLength={20}
            />
            <AnimatePresence>
              {displayError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-red-500 text-[10px] font-fantasy uppercase tracking-widest mt-2 flex items-center gap-2"
                >
                  <Info size={12} />
                  {displayError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div>
          <h3 className="text-sm border-b-2 border-aetheria-800 pb-3 mb-6 flex items-center gap-3 font-fantasy text-aetheria-400 uppercase tracking-widest">
            <Shield size={16} />
            Ascension Path
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {CHARACTER_CLASSES.map((c: any, i: number) => (
              <button
                key={c.id}
                onClick={() => setSelectedClassIdx(i)}
                className={`w-full p-4 flex justify-between items-center border-2 transition-all group ${selectedClassIdx === i
                    ? "border-aetheria-400 bg-aetheria-400 text-[#1a1410]"
                    : "border-aetheria-800 bg-black/20 text-[#6d5540] hover:border-[#6d5540]"
                  }`}
              >
                <span className="text-sm font-fantasy uppercase tracking-widest">{c.name}</span>
                {selectedClassIdx === i ? <ChevronRight size={18} /> : <div className="w-1.5 h-1.5 bg-aetheria-800 rotate-45 group-hover:bg-[#6d5540]" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={handleComplete}
          disabled={characterName.length < 3 || isLoading}
          className={`w-full py-6 text-sm font-fantasy uppercase tracking-[0.4em] transition-all shadow-xl flex items-center justify-center gap-3 ${characterName.length >= 3 && !isLoading
              ? "bg-aetheria-400 text-[#1a1410] hover:bg-[#d4b98a] active:scale-[0.98] border-t-2 border-t-aetheria-200 border-b-2 border-b-aetheria-600"
              : "bg-[#1a1410] text-aetheria-800 cursor-not-allowed border-2 border-aetheria-800"
            }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-[#1a1410] border-t-transparent rounded-full animate-spin" />
              Binding...
            </>
          ) : (
            "Embody Hero"
          )}
        </button>
      </div>
    </div>
  );
};
