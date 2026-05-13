/**
 * @file src/components/UI/TradeWindow.tsx
 * @description The interface for secure item and gold trading between players.
 * Supports offering items, locking the trade, and final confirmation from both parties.
 * @importance Essential: Provides a safe environment for player-to-player commerce and interaction.
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';
import * as Icons from 'lucide-react';
import { X, Lock, Unlock, Check, Coins, ArrowLeftRight } from 'lucide-react';
import { InventoryItem, ItemRarity } from '../../types';
import { formatGold, formatGoldDetailed } from '../../lib/currency';

const getRarityColor = (rarity: ItemRarity | undefined) => {
  if (!rarity) return "border-[#4a3a2a]/20 text-[#c2a472]";
  switch (rarity) {
    case "uncommon": return "border-[#34d399] text-[#34d399]";
    case "rare": return "border-[#60a5fa] text-[#60a5fa]";
    case "epic": return "border-[#a855f7] text-[#a855f7]";
    case "legendary": return "border-[#fbbf24] text-[#fbbf24]";
    default: return "border-[#4a3a2a] text-[#c2a472]";
  }
};

const getRarityBg = (rarity: ItemRarity | undefined) => {
  if (!rarity) return "bg-black/20 shadow-inner";
  switch (rarity) {
    case "uncommon": return "bg-[#34d399]/10 shadow-[inset_0_0_10px_rgba(52,211,153,0.2)]";
    case "rare": return "bg-[#60a5fa]/10 shadow-[inset_0_0_10px_rgba(96,165,250,0.2)]";
    case "epic": return "bg-[#a855f7]/10 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]";
    case "legendary": return "bg-[#fbbf24]/10 shadow-[inset_0_0_10px_rgba(251,191,36,0.2)]";
    default: return "bg-black/20 shadow-inner";
  }
};

export const TradeWindow = () => {
  const { activeTrade, setActiveTrade, players, id: localId } = useGameStore();
  const socket = (window as any).socket;
  
  const [goldInput, setGoldInput] = useState(0);

  const isP1 = activeTrade?.p1 === localId;
  const myData = useMemo(() => {
    if (!activeTrade) return null;
    return isP1 
      ? { items: activeTrade.p1Items, gold: activeTrade.p1Gold, locked: activeTrade.p1Locked, confirmed: activeTrade.p1Confirmed, name: activeTrade.p1Name } 
      : { items: activeTrade.p2Items, gold: activeTrade.p2Gold, locked: activeTrade.p2Locked, confirmed: activeTrade.p2Confirmed, name: activeTrade.p2Name };
  }, [activeTrade, isP1]);

  const theirData = useMemo(() => {
    if (!activeTrade) return null;
    return isP1 
      ? { items: activeTrade.p2Items, gold: activeTrade.p2Gold, locked: activeTrade.p2Locked, confirmed: activeTrade.p2Confirmed, name: activeTrade.p2Name } 
      : { items: activeTrade.p1Items, gold: activeTrade.p1Gold, locked: activeTrade.p1Locked, confirmed: activeTrade.p1Confirmed, name: activeTrade.p1Name };
  }, [activeTrade, isP1]);

  const mySlots = useMemo(() => {
    const arr = Array(8).fill(null);
    if (myData) {
      myData.items.forEach((item, i) => { if (i < 8) arr[i] = item; });
    }
    return arr;
  }, [myData]);

  const theirSlots = useMemo(() => {
    const arr = Array(8).fill(null);
    if (theirData) {
      theirData.items.forEach((item, i) => { if (i < 8) arr[i] = item; });
    }
    return arr;
  }, [theirData]);

  if (!activeTrade || !myData || !theirData) return null;

  const handleCancel = () => {
    if (socket) socket.emit("trade_cancel", activeTrade.id);
  };

  const handleLock = () => {
    if (socket) socket.emit("trade_lock", { tradeId: activeTrade.id, gold: goldInput });
  };

  const handleConfirm = () => {
    if (socket) socket.emit("trade_confirm", activeTrade.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-0 z-150 flex items-center justify-center p-4 pointer-events-none"
    >
      <div className="bg-[#1a1410] border-4 border-[#4a3a2a] p-6 rounded-xl shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-2xl pointer-events-auto relative max-h-[85%] overflow-y-auto custom-scrollbar">
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6 border-b border-[#4a3a2a] pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4a3a2a] rounded shadow-inner">
              <ArrowLeftRight className="w-6 h-6 text-[#c2a472]" />
            </div>
            <div>
              <h2 className="text-2xl font-fantasy font-black text-[#f4e4bc] tracking-widest uppercase">Trading Hall</h2>
              <p className="text-[10px] text-[#8b6b4d] font-fantasy uppercase tracking-[0.2em]">Secure Exchange</p>
            </div>
          </div>
          <button onClick={handleCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors group">
            <X className="w-5 h-5 text-[#8b6b4d] group-hover:text-red-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8 relative z-10">
          {/* My Side */}
          <div className={`space-y-4 p-4 rounded-lg border-2 transition-colors ${myData.locked ? 'bg-green-900/10 border-green-500/30' : 'bg-black/20 border-[#4a3a2a]'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#f4e4bc] font-fantasy uppercase tracking-wider text-sm">{myData.name} (You)</span>
              {myData.locked && <Lock size={14} className="text-green-500 animate-pulse" />}
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {mySlots.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    if (item && !myData.locked && socket) {
                      socket.emit("trade_remove_item", { tradeId: activeTrade.id, tradeIndex: i });
                    }
                  }}
                  className={`aspect-square border-2 rounded flex items-center justify-center transition-all
                    ${item ? getRarityColor(item.rarity) : 'border-[#4a3a2a]/30 bg-black/40'}
                    ${myData.locked ? 'opacity-80' : item ? 'hover:border-red-500 cursor-pointer' : ''}
                  `}
                >
                  {item && (
                    <div className={`w-full h-full flex items-center justify-center p-1 ${getRarityBg(item.rarity)}`}>
                      {React.createElement((Icons as any)[item.icon] || Icons.HelpCircle, { size: 24 })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-[10px] text-[#8b6b4d] uppercase font-fantasy tracking-widest block mb-1">Your Gold Offer</label>
              <div className="flex items-center gap-2 bg-black/40 p-2 rounded border border-[#4a3a2a]">
                <Coins className="text-yellow-500 w-4 h-4" />
                <input 
                  type="number"
                  disabled={myData.locked}
                  value={goldInput}
                  onChange={(e) => setGoldInput(Math.max(0, parseInt(e.target.value) || 0))}
                  className="bg-transparent text-[#fbbf24] font-mono font-bold text-sm w-full focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Their Side */}
          <div className={`space-y-4 p-4 rounded-lg border-2 transition-colors ${theirData.locked ? 'bg-green-900/10 border-green-500/30' : 'bg-black/20 border-[#4a3a2a]'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#f4e4bc] font-fantasy uppercase tracking-wider text-sm">{theirData.name}</span>
              {theirData.locked && <Lock size={14} className="text-green-500 animate-pulse" />}
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {theirSlots.map((item, i) => (
                <div 
                  key={i} 
                  className={`aspect-square border-2 rounded flex items-center justify-center
                    ${item ? getRarityColor(item.rarity) : 'border-[#4a3a2a]/30 bg-black/40'}
                  `}
                >
                  {item && (
                    <div className={`w-full h-full flex items-center justify-center p-1 ${getRarityBg(item.rarity)}`}>
                      {React.createElement((Icons as any)[item.icon] || Icons.HelpCircle, { size: 24 })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-[10px] text-[#8b6b4d] uppercase font-fantasy tracking-widest block mb-1">Their Gold Offer</label>
              <div className="flex items-center gap-2 bg-black/40 p-2 rounded border border-[#4a3a2a] opacity-80">
                <Coins className="text-yellow-500 w-4 h-4" />
                <span 
                  className="text-[#fbbf24] font-mono font-bold text-sm cursor-help"
                  title={`${formatGoldDetailed(theirData.gold)} Gold Coins`}
                >
                  {formatGold(theirData.gold)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-8 flex gap-4 relative z-10 border-t border-[#4a3a2a] pt-6">
          <button 
            onClick={handleCancel}
            className="px-6 py-3 border-2 border-[#4a3a2a] text-[#8b6b4d] font-fantasy uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-all rounded"
          >
            Cancel
          </button>
          
          {!myData.locked ? (
            <button 
              onClick={handleLock}
              className="flex-1 bg-[#c2a472] hover:bg-[#d4b98a] text-[#1a1410] font-fantasy font-black uppercase tracking-[0.2em] py-3 rounded shadow-lg transition-all flex items-center justify-center gap-3"
            >
              <Lock size={18} /> Lock Offer
            </button>
          ) : (
            <button 
              disabled={!theirData.locked || myData.confirmed}
              onClick={handleConfirm}
              className={`flex-1 font-fantasy font-black uppercase tracking-[0.2em] py-3 rounded shadow-lg transition-all flex items-center justify-center gap-3
                ${!theirData.locked ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 
                  myData.confirmed ? 'bg-green-600 text-white' : 'bg-green-500 hover:bg-green-400 text-white animate-pulse'}
              `}
            >
              <Check size={18} /> {myData.confirmed ? 'Confirmed!' : 'Accept Trade'}
            </button>
          )}
        </div>

        {/* Warning Toast */}
        <AnimatePresence>
          {myData.locked && !theirData.locked && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -bottom-12 left-0 right-0 text-center"
            >
              <span className="text-[10px] text-yellow-500 font-fantasy uppercase tracking-widest bg-black/60 px-4 py-2 rounded-full border border-yellow-500/30 backdrop-blur-sm">
                Waiting for {theirData.name} to lock their offer...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
