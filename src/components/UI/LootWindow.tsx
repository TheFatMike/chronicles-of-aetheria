import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { X, Coins } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface LootWindowProps {
  socket: Socket | null;
}

export const LootWindow: React.FC<LootWindowProps> = ({ socket }) => {
  const activeLoot = useGameStore(s => s.activeLoot);
  const setActiveLoot = useGameStore(s => s.setActiveLoot);

  if (!activeLoot) return null;

  const handleTakeItem = (index: number) => {
    socket?.emit("take_loot_item", { 
      targetId: activeLoot.targetId, 
      lootIndex: index 
    });
  };

  const handleTakeAll = () => {
    socket?.emit("take_all_loot", { targetId: activeLoot.targetId });
    setActiveLoot(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl w-80 pointer-events-auto overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Loot</h3>
          <button 
            onClick={() => setActiveLoot(null)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Items Grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {activeLoot.items.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => item && handleTakeItem(idx)}
                className={`
                  aspect-square rounded border-2 border-slate-800 bg-slate-950/50 flex items-center justify-center relative group
                  ${item ? 'cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/10' : 'opacity-30'}
                  transition-all
                `}
              >
                {item && (
                  <>
                    <img src={item.icon} alt={item.name} className="w-8 h-8 object-contain" />
                    {item.quantity > 1 && (
                      <span className="absolute bottom-0 right-1 text-[10px] font-bold text-white drop-shadow-md">
                        {item.quantity}
                      </span>
                    )}
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-black/90 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                      <div className="font-bold mb-1" style={{ color: item.rarity === 'common' ? '#9ca3af' : item.rarity === 'rare' ? '#3b82f6' : '#a855f7' }}>
                        {item.name}
                      </div>
                      <div className="text-slate-400 italic capitalize">{item.rarity} {item.type}</div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Gold Display */}
          {activeLoot.gold > 0 && (
            <div className="flex items-center gap-2 mb-4 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded">
              <Coins size={16} className="text-amber-400" />
              <span className="text-sm font-bold text-amber-100">{activeLoot.gold} Gold</span>
            </div>
          )}

          {/* Actions */}
          <button
            onClick={handleTakeAll}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow-lg shadow-amber-900/20 transition-all active:scale-95"
          >
            Take All
          </button>
        </div>
      </div>
    </div>
  );
};
