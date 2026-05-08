import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';
import { Users, X, Shield, Star } from 'lucide-react';

export const PartyFrames = () => {
  const party = useGameStore((state) => state.party);
  const partyInvite = useGameStore((state) => state.partyInvite);
  const setPartyInvite = useGameStore((state) => state.setPartyInvite);
  const connected = useGameStore((state) => state.connected);
  const socket = connected ? (window as any).socket : null;

  const handleAccept = () => {
    if (partyInvite && socket) {
      socket.emit("party_accept", partyInvite.fromId);
    }
    setPartyInvite(null);
  };

  const handleDecline = () => {
    setPartyInvite(null);
  };

  if (!party && !partyInvite) return null;

  return (
    <div className="fixed left-6 top-24 z-40 flex flex-col gap-3 pointer-events-none">
      {/* Active Party Frames */}
      <AnimatePresence>
        {party && party.memberDetails.map((member, i) => (
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

      {/* Invite Notification */}
      <AnimatePresence>
        {partyInvite && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-64 bg-amber-500/95 border border-amber-400 rounded-xl p-4 pointer-events-auto shadow-2xl flex flex-col gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-amber-950 font-black uppercase tracking-widest leading-none">Party Invitation</p>
                <p className="text-sm text-white font-bold">{partyInvite.fromName} invited you.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleAccept}
                className="bg-white text-amber-600 py-2 rounded-lg text-xs font-black uppercase hover:bg-amber-50 transition-colors"
              >
                Accept
              </button>
              <button 
                onClick={handleDecline}
                className="bg-amber-600 text-white py-2 rounded-lg text-xs font-black uppercase hover:bg-amber-700 transition-colors"
              >
                Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
