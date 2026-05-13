/**
 * @file src/components/UI/NotificationManager.tsx
 * @description Manages and displays temporary in-game notifications.
 * Handles alerts for party invites, trade requests, and system messages.
 * @importance Essential: Provides non-intrusive feedback to the player about external events and social interactions.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { UserPlus, Handshake, Check, X } from 'lucide-react';

export const NotificationManager = () => {
  const {
    partyInvite,
    setPartyInvite,
    tradeRequest,
    setTradeRequest,
    socket
  } = useGameStore(useShallow((state) => ({
    partyInvite: state.partyInvite,
    setPartyInvite: state.setPartyInvite,
    tradeRequest: state.tradeRequest,
    setTradeRequest: state.setTradeRequest,
    socket: (window as any).socket // Using the global socket ref
  })));

  const handlePartyAccept = () => {
    if (partyInvite && socket) {
      socket.emit("party_accept", partyInvite.fromId);
    }
    setPartyInvite(null);
  };

  const handleTradeAccept = () => {
    if (tradeRequest && socket) {
      socket.emit("trade_accept", tradeRequest.fromId);
    }
    setTradeRequest(null);
  };

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-100 flex flex-col items-center gap-4 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence>
        {/* Party Invite */}
        {partyInvite && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="bg-aetheria-950/95 backdrop-blur-md border-2 border-aetheria-400 p-4 rounded shadow-aetheria-lg pointer-events-auto flex flex-col gap-3 w-full"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-aetheria-400/20 rounded text-aetheria-400">
                <UserPlus size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-aetheria-200 font-fantasy text-sm uppercase tracking-wider">Party Invite</h4>
                <p className="text-aetheria-400 text-xs font-serif">
                  <span className="text-white font-bold">{partyInvite.fromName}</span> wants to adventure with you!
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={handlePartyAccept}
                className="flex-1 bg-[#22c55e]/20 hover:bg-[#22c55e]/30 border border-[#22c55e]/50 text-[#22c55e] py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-widest"
              >
                <Check size={14} /> Accept
              </button>
              <button
                onClick={() => setPartyInvite(null)}
                className="flex-1 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 border border-[#ef4444]/50 text-[#ef4444] py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-widest"
              >
                <X size={14} /> Decline
              </button>
            </div>
          </motion.div>
        )}

        {/* Trade Request */}
        {tradeRequest && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="bg-aetheria-950/95 backdrop-blur-md border-2 border-blue-500/50 p-4 rounded shadow-aetheria-lg pointer-events-auto flex flex-col gap-3 w-full"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded text-blue-400">
                <Handshake size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-aetheria-200 font-fantasy text-sm uppercase tracking-wider">Trade Request</h4>
                <p className="text-blue-400 text-xs font-serif">
                  <span className="text-white font-bold">{tradeRequest.fromName}</span> wants to trade items.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={handleTradeAccept}
                className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 text-blue-400 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-widest"
              >
                <Check size={14} /> Accept
              </button>
              <button
                onClick={() => setTradeRequest(null)}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors uppercase tracking-widest"
              >
                <X size={14} /> Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
