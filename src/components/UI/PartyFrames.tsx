/**
 * @file src/components/UI/PartyFrames.tsx
 * @description Renders health and status frames for all members of the player's party.
 * Provides real-time updates on party vitals and leader status.
 * @importance Essential: Critical for cooperative gameplay, allowing players to monitor and support their teammates.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';
import { Users, X, Shield, Star } from 'lucide-react';

export const PartyFrames = () => {
  const party = useGameStore((state) => state.party);
  const playerId = useGameStore((state) => state.id);

  if (!party || !party.memberDetails) return null;

  // Filter out self
  const otherMembers = party.memberDetails.filter(m => m.id !== playerId);

  if (otherMembers.length === 0) return null;

  return (
    <div className="fixed left-6 top-24 z-40 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {otherMembers.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className="w-56 bg-aetheria-950/90 backdrop-blur-xl border-2 border-aetheria-400/30 rounded-xl p-3 pointer-events-auto shadow-[0_10px_30px_rgba(0,0,0,0.6)] relative overflow-hidden group"
          >
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between mb-2 relative z-10">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-black/40 border border-aetheria-400/20 flex items-center justify-center text-aetheria-200 text-[10px] font-black uppercase">
                    {member.name.charAt(0)}
                  </div>
                  {party.leaderId === member.id && (
                    <div className="absolute -top-1 -left-1 bg-amber-500 rounded-full p-0.5 shadow-lg border border-amber-300">
                      <Star size={8} className="text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-aetheria-200 truncate uppercase tracking-tight">{member.name}</span>
                  <span className="text-[7px] font-black text-aetheria-600 uppercase tracking-[0.15em] opacity-60">LVL {member.level || 1} • {member.class}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 relative z-10">
              {/* HP Bar */}
              <div className="h-2 w-full bg-black/60 rounded-sm overflow-hidden border border-aetheria-400/10 shadow-inner">
                <motion.div
                  className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(member.hp / member.maxHp) * 100}%` }}
                />
              </div>

              {/* MP Bar */}
              <div className="h-1.5 w-full bg-black/60 rounded-sm overflow-hidden border border-aetheria-400/10 shadow-inner">
                <motion.div
                  className="h-full bg-linear-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(member.mp / member.maxMp) * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
