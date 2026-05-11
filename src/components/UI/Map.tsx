/**
 * @file src/components/UI/Map.tsx
 * @description The in-game world map interface.
 * Shows the player's position, party members, and key points of interest.
 * @importance Essential: Crucial for navigation and coordination within the expansive game world.
 */
import React, { memo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Map as MapIcon, Users, Navigation, X, ZoomIn, ZoomOut, Compass } from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { DESIGN_RES } from "./GameScaffold";

interface MapProps {
  localPlayerId: string | null;
  worldSize?: number;
}

export const Map = memo(({ localPlayerId, worldSize = 400 }: MapProps) => {
  const players = useGameStore(useShallow((state) => Object.keys(state.players)));
  const playerCount = useGameStore((state) => Object.keys(state.players).length);
  const setActiveMenu = useGameStore(s => s.setActiveMenu);
  
  // Immersive full-screen size (using logical coordinates)
  const [mapSize, setMapSize] = useState(Math.min(DESIGN_RES.width * 0.8, DESIGN_RES.height * 0.8, 800));

  useEffect(() => {
    const handleResize = () => {
      setMapSize(Math.min(DESIGN_RES.width * 0.8, DESIGN_RES.height * 0.8, 800));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scale = mapSize / worldSize;

  const toMapCoords = (pos: [number, number, number]): [number, number] => {
    const x = (pos[0] + worldSize / 2) * scale;
    const y = (pos[2] + worldSize / 2) * scale;
    return [x, y];
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-12 pointer-events-none"
    >
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="bg-[#1a140f] w-full max-w-6xl h-full max-h-[90vh] rounded-2xl border-4 border-[#4a3a2a] shadow-[0_0_100px_rgba(0,0,0,0.9)] pointer-events-auto relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background texture decor */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-[#1a140f]/20 to-[#1a140f] pointer-events-none" />
        
        {/* Header */}
        <div className="relative z-20 flex items-center justify-between p-6 sm:p-8 border-b border-[#4a3a2a] bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#c2a472] rounded-xl shadow-lg rotate-3">
              <MapIcon className="w-8 h-8 text-[#1a140f]" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-[#f4e4bc] tracking-tighter uppercase italic">Grand Atlas of Aetheria</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[10px] text-[#8b6b4d] font-fantasy uppercase tracking-[0.3em]">Imperial Cartography Dept.</p>
                <div className="w-1.5 h-1.5 rounded-full bg-[#c2a472] animate-pulse" />
                <span className="text-[10px] text-[#c2a472] font-mono font-bold uppercase">{playerCount} Heroes Online</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setActiveMenu(null)}
            className="p-2 text-[#8b6b4d] hover:text-[#f4e4bc] hover:bg-white/5 rounded-full transition-all group"
          >
            <X size={32} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Map Body */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#0c0a08]">
           {/* Decorative Compass */}
           <div className="absolute bottom-12 right-12 opacity-10 pointer-events-none">
              <Compass size={200} className="text-[#c2a472] animate-[spin_60s_linear_infinite]" />
           </div>

           <div 
            className="relative bg-[#2d221a] border-4 border-[#4a3a2a] rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ width: mapSize, height: mapSize }}
          >
            {/* Topographic Texture */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/worn-dots.png')]" />
            
            {/* Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-10 pointer-events-none">
              {Array.from({ length: 100 }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-[#c2a472]/40" />
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
            <Landmark 
              x={15} z={-20} 
              label="Ancient Watchtower" 
              icon="🏰" 
              scale={scale} 
              worldSize={worldSize} 
            />
            <Landmark 
              x={-50} z={60} 
              label="Whispering Grove" 
              icon="🌳" 
              scale={scale} 
              worldSize={worldSize} 
            />
            <Landmark 
              x={0} z={0} 
              label="The Great Plaza" 
              icon="⚖️" 
              scale={scale} 
              worldSize={worldSize} 
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="relative z-20 p-6 border-t border-[#4a3a2a] bg-black/40 flex items-center justify-between">
           <div className="flex gap-8">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-[#f4e4bc] shadow-[0_0_10px_rgba(244,228,188,0.5)]" />
                 <span className="text-xs font-fantasy text-[#f4e4bc] uppercase tracking-widest">Imperial Scout (You)</span>
              </div>
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-[#c2a472]/60 border border-[#c2a472]" />
                 <span className="text-xs font-fantasy text-[#8b6b4d] uppercase tracking-widest">Other Travelers</span>
              </div>
           </div>
           <div className="text-[10px] text-[#4a3a2a] font-mono uppercase tracking-tighter">
              Coordinates: Auto-Sync Active • Latency 14ms • Revision 4.2.0
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

const Landmark = ({ x, z, label, icon, scale, worldSize }: any) => (
  <div 
    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-help z-10"
    style={{ 
      left: (x + worldSize / 2) * scale, 
      top: (z + worldSize / 2) * scale 
    }}
  >
    <div className="text-2xl drop-shadow-lg transition-transform group-hover:scale-125">{icon}</div>
    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1a140f] border border-[#c2a472]/30 px-2 py-1 rounded text-[8px] font-black text-[#c2a472] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl">
       {label}
    </div>
  </div>
);

const MapMarker = memo(({ id, isLocal, toMapCoords }: { id: string, isLocal: boolean, toMapCoords: any }) => {
  const player = useGameStore(useShallow((state) => state.players[id]));
  if (!player) return null;

  const [x, y] = toMapCoords(player.pos || [0, 0, 0]);

  return (
    <motion.div
      initial={false}
      animate={{ left: x, top: y }}
      transition={{ type: "spring", damping: 25, stiffness: 120 }}
      className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
    >
      {isLocal ? (
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute inset-0 bg-[#f4e4bc] rounded-full blur-md"
          />
          <div 
            className="w-5 h-5 rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center justify-center z-10 relative ring-2 ring-[#1a140f]"
            style={{ backgroundColor: player.color }}
          >
            <Navigation 
              className="w-3 h-3 text-white fill-current" 
              style={{ transform: `rotate(${player.rot?.[1] || 0}rad)` }}
            />
          </div>
          <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#f4e4bc] px-2 py-1 rounded text-[9px] font-black text-[#1a140f] border border-white/20 pointer-events-none shadow-2xl uppercase">
            YOU
          </div>
        </div>
      ) : (
        <div className="relative">
          <div 
            className="w-4 h-4 rounded-full border-2 border-[#1a140f] shadow-lg flex items-center justify-center transition-transform group-hover:scale-125"
            style={{ backgroundColor: player.color }}
          />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-2 py-1 rounded text-[8px] font-black text-[#f4e4bc] border border-[#c2a472]/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-tighter">
            {player.characterName}
          </div>
        </div>
      )}
    </motion.div>
  );
});

Map.displayName = "Map";
