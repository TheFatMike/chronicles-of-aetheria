import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';
import { Users, X, Shield, Star } from 'lucide-react';

export const PartyFrames = () => {
  const party = useGameStore((state) => state.party);

  if (!party) return null;

  return (
    <div className="fixed left-6 top-24 z-40 flex flex-col gap-3 pointer-events-none">
      {/* Active Party Frames */}
      <AnimatePresence>
        {party.memberDetails?.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-48 bg-slate-900/90 border border-slate-700/50 rounded-lg p-2 pointer-events-auto shadow-lg backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 overflow-hidden">
                {party.leaderId === member.id && <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />}
                <span className="text-[10px] font-bold text-white truncate uppercase tracking-tighter">{member.name}</span>
              </div>
              <span className="text-[8px] font-bold opacity-50 uppercase">{member.class}</span>
            </div>

            {/* HP Bar */}
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-1 border border-black/20">
              <motion.div 
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                initial={{ width: '100%' }}
                animate={{ width: `${(member.hp / member.maxHp) * 100}%` }}
              />
            </div>

            {/* MP Bar */}
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden border border-black/20">
              <motion.div 
                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                initial={{ width: '100%' }}
                animate={{ width: `${(member.mp / member.maxMp) * 100}%` }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
