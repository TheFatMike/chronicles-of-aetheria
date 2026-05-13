/**
 * @file src/components/UI/ClassPreview.tsx
 * @description Displays details about a specific character class during the creation process.
 * Shows class-specific stats, descriptions, and icon.
 * @importance Essential: Helps players make an informed decision when choosing their character's path.
 */
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import { Briefcase } from "lucide-react";

interface ClassPreviewProps {
  selectedClass: any;
}

export const ClassPreview = ({ selectedClass }: ClassPreviewProps) => {
  return (
    <div className="col-span-12 lg:col-span-7 bg-aetheria-900 border-2 lg:border-4 border-aetheria-800 rounded p-6 lg:p-12 flex flex-col justify-start overflow-hidden relative shadow-aetheria-lg h-fit">
      <div className="absolute top-0 right-0 w-full h-full bg-linear-to-br from-transparent to-black/20 pointer-events-none" />
      
      <div>
         <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="h-px sm:h-0.5 flex-1 bg-linear-to-r from-transparent to-aetheria-600" />
            <span className="text-aetheria-600 uppercase tracking-[0.4em] text-[8px] sm:text-xs font-display font-bold text-center">Divine Ascendance</span>
            <div className="h-px sm:h-0.5 flex-1 bg-linear-to-l from-transparent to-aetheria-600" />
         </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedClass.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <h1 className="text-4xl sm:text-7xl font-display font-black text-aetheria-200 mb-4 sm:mb-6 leading-tight drop-shadow-lg">{selectedClass.name}</h1>
            <p className="text-aetheria-600/80 font-serif italic text-sm sm:text-xl leading-relaxed max-w-sm border-l-2 border-aetheria-600 pl-4 sm:pl-6 py-1 sm:py-2">
              {selectedClass.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 relative z-10">
        {Object.entries(selectedClass.stats).map(([stat, val]) => (
          <div key={stat} className="bg-black/60 border border-aetheria-800 p-3 sm:p-5 rounded relative group">
            <span className="text-aetheria-800 text-[8px] sm:text-[10px] uppercase font-fantasy mb-0.5 sm:mb-1 block tracking-wider">{stat}</span>
            <div className="flex items-end gap-2 sm:gap-3">
              <span className="text-xl sm:text-3xl font-display font-bold text-aetheria-200 leading-none">{val as number}</span>
              <div className="flex-1 h-1 sm:h-1.5 bg-aetheria-800 rounded-full mb-0.5 sm:mb-1 overflow-hidden">
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
      <div className="mt-6 sm:mt-8 border-t border-aetheria-800 pt-4 sm:pt-6">
        <h3 className="text-aetheria-600 font-fantasy text-[8px] sm:text-[10px] uppercase tracking-[0.3em] mb-3 sm:mb-4 flex items-center gap-2">
          <Briefcase size={12} className="sm:w-3.5 sm:h-3.5" />
          Initial Provisions
        </h3>
        <div className="flex gap-2 sm:gap-3">
          {selectedClass.startingGear?.map((item: any, i: number) => (
            <div key={i} className="group relative">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black/60 border-2 border-aetheria-800 rounded flex items-center justify-center hover:border-aetheria-400 transition-colors cursor-help">
                {React.createElement((Icons as any)[item.icon] || Icons.HelpCircle, {
                  size: 16,
                  className: "text-aetheria-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] sm:w-5 sm:h-5"
                })}
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-aetheria-950 border border-aetheria-800 rounded text-[8px] font-fantasy uppercase tracking-widest text-aetheria-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                {item.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
