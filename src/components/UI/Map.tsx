import React, { memo } from "react";
import { motion } from "motion/react";
import { Map as MapIcon, Users, Navigation } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";

interface MapProps {
  localPlayerId: string | null;
  worldSize?: number;
}

export const Map = memo(({ localPlayerId, worldSize = 400 }: MapProps) => {
  const players = useGameStore(useShallow((state) => Object.keys(state.players)));
  const playerCount = useGameStore((state) => Object.keys(state.players).length);
  const mapSize = 300; // px
  const scale = mapSize / worldSize;

  const toMapCoords = (pos: [number, number, number]): [number, number] => {
    const x = (pos[0] + worldSize / 2) * scale;
    const y = (pos[2] + worldSize / 2) * scale;
    return [x, y];
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      <div className="bg-[#1a140f]/95 backdrop-blur-xl p-8 rounded-xl border-4 border-[#4a3a2a] shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto relative overflow-hidden">
        {/* Background texture decor */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6 border-b border-[#4a3a2a] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#4a3a2a] rounded-lg">
                <MapIcon className="w-6 h-6 text-[#c2a472]" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black text-[#f4e4bc] tracking-tight">WORLD ATLAS</h2>
                <p className="text-[10px] text-[#8b6b4d] font-fantasy uppercase tracking-[0.2em] mt-0.5">Verdant Realm Explorer</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-[#c2a472] text-xs font-fantasy">
                <Users className="w-3 h-3" />
                <span>{playerCount} HEROES IN REALM</span>
              </div>
            </div>
          </div>

          <div 
            className="relative bg-[#2d221a] border-2 border-[#4a3a2a] rounded-lg overflow-hidden shadow-inner"
            style={{ width: mapSize, height: mapSize }}
          >
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-10 pointer-events-none">
              {Array.from({ length: 64 }).map((_, i) => (
                <div key={i} className="border border-[#c2a472]/20" />
              ))}
            </div>

            {/* Players */}
            {players.map((id) => (
              <MapMarker 
                key={id} 
                id={id} 
                isLocal={id === localPlayerId} 
                toMapCoords={toMapCoords} 
              />
            ))}

            {/* Landmarks */}
            <div 
              className="absolute w-4 h-4 bg-gray-500/50 border border-gray-400 -translate-x-1/2 -translate-y-1/2"
              style={{ 
                left: (15 + worldSize / 2) * scale, 
                top: (-20 + worldSize / 2) * scale 
              }}
            />
            <div 
              className="absolute w-3 h-3 bg-blue-400/50 rounded-full blur-[2px] animate-pulse -translate-x-1/2 -translate-y-1/2"
              style={{ 
                left: (0 + worldSize / 2) * scale, 
                top: (-15 + worldSize / 2) * scale 
              }}
            />
          </div>

          <div className="mt-6 flex justify-between items-end border-t border-[#4a3a2a] pt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#f4e4bc]" />
                <span className="text-[10px] text-[#8b6b4d] font-fantasy uppercase tracking-wider">Your Position</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#c2a472]" />
                <span className="text-[10px] text-[#8b6b4d] font-fantasy uppercase tracking-wider">Fellow Heroes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const MapMarker = memo(({ id, isLocal, toMapCoords }: { id: string, isLocal: boolean, toMapCoords: any }) => {
  const player = useGameStore(useShallow((state) => state.players[id]));
  if (!player) return null;

  const [x, y] = toMapCoords(player.pos || [0, 0, 0]);

  return (
    <motion.div
      initial={false}
      animate={{ left: x, top: y }}
      transition={{ type: "spring", damping: 20, stiffness: 100 }}
      className="absolute -translate-x-1/2 -translate-y-1/2 group"
    >
      {isLocal ? (
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-[#f4e4bc] rounded-full blur-sm opacity-50"
          />
          <div 
            className="w-4 h-4 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-10 relative"
            style={{ backgroundColor: player.color }}
          >
            <Navigation 
              className="w-2 h-2 text-white fill-current" 
              style={{ transform: `rotate(${player.rot?.[1] || 0}rad)` }}
            />
          </div>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/20 pointer-events-none">
            YOU ({player.characterName})
          </div>
        </div>
      ) : (
        <div className="relative">
          <div 
            className="w-3 h-3 rounded-full border border-black/50 shadow-md"
            style={{ backgroundColor: player.color }}
          />
          <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/60 px-2 py-0.5 rounded text-[9px] font-medium text-[#f4e4bc] border border-[#c2a472]/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {player.characterName}
          </div>
        </div>
      )}
    </motion.div>
  );
});

Map.displayName = "Map";
