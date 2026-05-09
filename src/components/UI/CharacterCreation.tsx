import React, { useState, memo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { CHARACTER_CLASSES } from "../../constants";
import { ParticleEffect } from "./Particles";
import { ChevronLeft } from "lucide-react";
import { ClassPreview } from "./ClassPreview";
import { CreationForm } from "./CreationForm";

interface CharacterCreationProps {
  onComplete: (data: { characterName: string; class: string; color: string }) => void;
  onCancel: () => void;
  error?: string | null;
  isLoading?: boolean;
  onClearError?: () => void;
  canCancel?: boolean;
}

export const CharacterCreation = memo(({ onComplete, onCancel, error, isLoading, onClearError, canCancel = true }: CharacterCreationProps) => {
  const [characterName, setCharacterName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedClassIdx, setSelectedClassIdx] = useState(0);

  const selectedClass = CHARACTER_CLASSES[selectedClassIdx];

  const validateName = (name: string) => {
    if (name.length > 0 && name.length < 3) return "Name is too short (min 3)";
    if (name.length > 16) return "Name is too long (max 16)";
    if (name.length > 0 && !/^[a-zA-Z0-9 ]+$/.test(name)) return "Letters, numbers, and spaces only";
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
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform sm:w-5 sm:h-5" />
          <span className="font-fantasy text-[10px] sm:text-xs uppercase tracking-[0.3em]">Back</span>
        </motion.button>
      )}
      
      <div className="absolute inset-0 overflow-y-auto custom-scrollbar pt-8">
        <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-6 py-8 lg:py-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-5xl w-full grid grid-cols-12 gap-4 lg:gap-6 relative z-10"
          >
            <ClassPreview selectedClass={selectedClass} />
            
            <CreationForm 
              characterName={characterName}
              handleNameChange={handleNameChange}
              isLoading={isLoading || false}
              displayError={displayError || null}
              selectedClassIdx={selectedClassIdx}
              setSelectedClassIdx={setSelectedClassIdx}
              handleComplete={handleComplete}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
});

CharacterCreation.displayName = "CharacterCreation";
