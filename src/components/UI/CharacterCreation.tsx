import React, { useState, memo, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { CHARACTER_CLASSES } from "../../constants";
import * as Icons from "lucide-react";
import { ParticleEffect } from "./Particles";
import { ChevronRight, ChevronLeft, User, Shield, Info, Briefcase } from "lucide-react";

interface CharacterCreationProps {
  onComplete: (data: { characterName: string; class: string; color: string }) => void;
  onCancel: () => void;
  error?: string | null;
  isLoading?: boolean;
  onClearError?: () => void;
  canCancel?: boolean;
}

export const CharacterCreation = memo(({ onComplete, onCancel, error, isLoading, onClearError, canCancel = true }: CharacterCreationProps) => {
  const [step, setStep] = useState(0);
  const [characterName, setCharacterName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedClassIdx, setSelectedClassIdx] = useState(0);

  const selectedClass = CHARACTER_CLASSES[selectedClassIdx];

  const validateName = (name: string) => {
    if (name.length > 0 && name.length < 3) {
      return "Name is too short (min 3)";
    }
    if (name.length > 16) {
      return "Name is too long (max 16)";
    }
    if (name.length > 0 && !/^[a-zA-Z0-9 ]+$/.test(name)) {
      return "Letters, numbers, and spaces only";
    }
    return null;
  };

  const handleNameChange = (val: string) => {
    setCharacterName(val);
    setLocalError(validateName(val));
    if (error && onClearError) onClearError();
  };

  const handleComplete = () => {
    const err = validateName(characterName);
    if (err || characterName.length < 3) {
      if (!err) setLocalError("Name is too short (min 3)");
      return;
    }
    onComplete({
      characterName: characterName.trim(),
      class: selectedClass.id,
      color: selectedClass.color,
    });
  };

  const displayError = localError || error;

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-10 pointer-events-none"></div>
      
      {/* Dynamic Class Aura - Portaled to full screen background */}
      {createPortal(
        <AnimatePresence>
          <motion.div
            key={selectedClass.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 pointer-events-none z-0"
            style={{ 
              background: `radial-gradient(circle at 50% 50%, ${selectedClass.color} 0%, transparent 80%)` 
            }}
          />
        </AnimatePresence>,
        document.getElementById('pre-game-bg-container') || document.body
      )}

      <ParticleEffect />
      
      {/* Back Button */}
      {canCancel && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onCancel}
          className="fixed top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 sm:gap-3 text-[#8b6b4d] hover:text-[#f4e4bc] transition-colors z-60 group px-2 sm:px-4 py-1.5 sm:py-2 border-2 border-[#4a3a2a]/20 hover:border-[#4a3a2a] rounded bg-black/40 backdrop-blur-sm"
        >
          <ChevronRight size={16} className="rotate-180 group-hover:-translate-x-1 transition-transform sm:w-5 sm:h-5" />
          <span className="font-fantasy text-[10px] sm:text-xs uppercase tracking-[0.3em]">Back</span>
        </motion.button>
      )}
      
      <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-6 py-8 lg:py-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-5xl w-full grid grid-cols-12 gap-4 lg:gap-6 relative z-10"
          >
        {/* Left: Preview/Class Display */}
        <div className="col-span-12 lg:col-span-7 bg-[#2d221a] border-2 lg:border-4 border-[#4a3a2a] rounded p-6 lg:p-12 flex flex-col justify-start overflow-hidden relative shadow-2xl h-fit">
          <div className="absolute top-0 right-0 w-full h-full bg-linear-to-br from-transparent to-black/20 pointer-events-none" />
          
          <div>
             <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="h-px sm:h-0.5 flex-1 bg-linear-to-r from-transparent to-[#8b6b4d]" />
                <span className="text-[#8b6b4d] uppercase tracking-[0.4em] text-[8px] sm:text-xs font-display font-bold text-center">Divine Ascendance</span>
                <div className="h-px sm:h-0.5 flex-1 bg-linear-to-l from-transparent to-[#8b6b4d]" />
             </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedClass.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h1 className="text-4xl sm:text-7xl font-display font-black text-[#f4e4bc] mb-4 sm:mb-6 leading-tight drop-shadow-lg">{selectedClass.name}</h1>
                <p className="text-[#a88a6d] font-serif italic text-sm sm:text-xl leading-relaxed max-w-sm border-l-2 border-[#8b6b4d] pl-4 sm:pl-6 py-1 sm:py-2">
                  {selectedClass.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 relative z-10">
            {Object.entries(selectedClass.stats).map(([stat, val]) => (
              <div key={stat} className="bg-black/60 border border-[#4a3a2a] p-3 sm:p-5 rounded relative group">
                <span className="text-[#6d5540] text-[8px] sm:text-[10px] uppercase font-fantasy mb-0.5 sm:mb-1 block tracking-wider">{stat}</span>
                <div className="flex items-end gap-2 sm:gap-3">
                  <span className="text-xl sm:text-3xl font-display font-bold text-[#f4e4bc] leading-none">{val as number}</span>
                  <div className="flex-1 h-1 sm:h-1.5 bg-[#4a3a2a] rounded-full mb-0.5 sm:mb-1 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((val as number) / 20) * 100}%` }}
                      className="h-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                      style={{ backgroundColor: selectedClass.color }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Starting Gear Preview */}
          <div className="mt-6 sm:mt-8 border-t border-[#4a3a2a] pt-4 sm:pt-6">
            <h3 className="text-[#8b6b4d] font-fantasy text-[8px] sm:text-[10px] uppercase tracking-[0.3em] mb-3 sm:mb-4 flex items-center gap-2">
              <Briefcase size={12} className="sm:w-3.5 sm:h-3.5" />
              Initial Provisions
            </h3>
            <div className="flex gap-2 sm:gap-3">
              {(selectedClass as any).startingGear?.map((item: any, i: number) => (
                <div key={i} className="group relative">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black/60 border-2 border-[#4a3a2a] rounded flex items-center justify-center hover:border-[#c2a472] transition-colors cursor-help">
                    {React.createElement((Icons as any)[item.icon] || Icons.HelpCircle, {
                      size: 16,
                      className: "text-[#c2a472] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] sm:w-5 sm:h-5"
                    })}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1410] border border-[#4a3a2a] rounded text-[8px] font-fantasy uppercase tracking-widest text-[#f4e4bc] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="col-span-12 lg:col-span-5 bg-[#251b14] border-2 sm:border-4 border-[#4a3a2a] rounded p-6 sm:p-10 flex flex-col justify-start shadow-2xl relative h-fit">
          <div className="space-y-8 sm:space-y-12">
            <div>
              <h3 className="text-[10px] sm:text-sm border-b-2 border-[#4a3a2a] pb-2 sm:pb-3 mb-6 sm:mb-8 flex items-center gap-2 sm:gap-3 font-fantasy text-[#c2a472] uppercase tracking-widest">
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
                  className={`w-full bg-black/40 border-2 p-5 font-serif text-lg text-[#f4e4bc] placeholder:text-[#4a3a2a] focus:outline-none transition-colors tracking-wide ${
                    displayError ? "border-red-900 focus:border-red-500" : "border-[#4a3a2a] focus:border-[#c2a472]"
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
              <h3 className="text-sm border-b-2 border-[#4a3a2a] pb-3 mb-6 flex items-center gap-3 font-fantasy text-[#c2a472] uppercase tracking-widest">
                <Shield size={16} />
                Ascension Path
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {CHARACTER_CLASSES.map((c: any, i: number) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClassIdx(i)}
                    className={`w-full p-4 flex justify-between items-center border-2 transition-all group ${
                      selectedClassIdx === i 
                        ? "border-[#c2a472] bg-[#c2a472] text-[#1a1410]" 
                        : "border-[#4a3a2a] bg-black/20 text-[#6d5540] hover:border-[#6d5540]"
                    }`}
                  >
                    <span className="text-sm font-fantasy uppercase tracking-widest">{c.name}</span>
                    {selectedClassIdx === i ? <ChevronRight size={18} /> : <div className="w-1.5 h-1.5 bg-[#4a3a2a] rotate-45 group-hover:bg-[#6d5540]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
 
          <div className="mt-8">
            <button
              onClick={handleComplete}
              disabled={characterName.length < 3 || !!localError || isLoading}
              className={`w-full py-6 text-sm font-fantasy uppercase tracking-[0.4em] transition-all shadow-xl flex items-center justify-center gap-3 ${
                characterName.length >= 3 && !localError && !isLoading
                ? "bg-[#c2a472] text-[#1a1410] hover:bg-[#d4b98a] active:scale-[0.98] border-t-2 border-t-[#f4e4bc] border-b-2 border-b-[#8b6b4d]"
                : "bg-[#1a1410] text-[#4a3a2a] cursor-not-allowed border-2 border-[#4a3a2a]"
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
          </motion.div>
        </div>
      </div>
    </div>
  );
});

CharacterCreation.displayName = "CharacterCreation";
