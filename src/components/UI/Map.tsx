/**
 * @file src/components/UI/Map.tsx
 * @description The in-game world map interface.
 * Shows the player's position, NPCs, world objects, and quest objectives.
 * Features interactive Zoom and Pan for exploring the expansive world.
 */
import React, { memo, useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { 
  Map as MapIcon, 
  X, 
  Compass, 
  Navigation2, 
  ShoppingBag, 
  Warehouse, 
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize
} from "lucide-react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { useScaffold } from "./GameScaffold";

interface MapProps {
  localPlayerId: string | null;
  worldSize?: number;
}

export const Map = memo(({ localPlayerId, worldSize = 800 }: MapProps) => {
  const { 
    players, 
    entities, 
    worldObjects, 
    activeQuests, 
    setActiveMenu 
  } = useGameStore(
    useShallow((s) => ({
      players: s.players,
      entities: s.entities,
      worldObjects: s.worldObjects,
      activeQuests: s.activeQuests,
      setActiveMenu: s.setActiveMenu,
    }))
  );

  const playerCount = Object.keys(players).length;
  const { dimensions } = useScaffold();
  
  // Interactive State
  const [zoom, setZoom] = useState(1);
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Base size calculation
  const baseSize = Math.min(dimensions.width * 0.8, dimensions.height * 0.8, 800);
  const [mapSize, setMapSize] = useState(baseSize);

  useEffect(() => {
    const newBase = Math.min(dimensions.width * 0.8, dimensions.height * 0.8, 800);
    setMapSize(newBase);
  }, [dimensions]);

  const scale = (mapSize / worldSize) * zoom;

  const toMapCoords = (pos: [number, number, number]): [number, number] => {
    const x = (pos[0] + worldSize / 2) * scale;
    const y = (pos[2] + worldSize / 2) * scale;
    return [x, y];
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(4, prev + delta)));
  };

  const handleReset = () => {
    setZoom(1);
  };

  // Filter quest objectives for markers
  const questMarkers = useMemo(() => {
    const markers: { id: string; name: string; pos: [number, number, number] }[] = [];
    Object.values(activeQuests).forEach(quest => {
      quest.objectives.forEach(obj => {
        if (!obj.completed && obj.type === 'talk') {
          const target = Object.values(entities).find(e => e.name === obj.targetName) ||
                         Object.values(worldObjects).find(o => o.name === obj.targetName);
          if (target) markers.push({ id: `map-quest-${quest.id}-${obj.id}`, name: quest.title, pos: target.pos });
        }
      });
    });
    return markers;
  }, [activeQuests, entities, worldObjects]);

  // Handle mouse wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    e.stopPropagation(); // Prevent zooming the game camera
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    handleZoom(delta);
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
        className="bg-aetheria-950 w-full max-w-6xl h-full max-h-[90%] rounded-2xl border-4 border-aetheria-800 shadow-aetheria-lg pointer-events-auto relative overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Parchment Texture Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
        
        {/* Header */}
        <div className="relative z-20 flex items-center justify-between p-6 border-b border-aetheria-800 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-aetheria-400 rounded-xl shadow-lg rotate-2">
              <MapIcon className="w-8 h-8 text-aetheria-950" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black text-aetheria-200 tracking-tighter uppercase italic">Grand Atlas of Aetheria</h2>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-aetheria-600 font-fantasy uppercase tracking-[0.3em]">
                <span>Imperial Cartography Dept.</span>
                <div className="w-1.5 h-1.5 rounded-full bg-aetheria-400 animate-pulse" />
                <span className="text-aetheria-400 font-mono font-bold tracking-normal">{playerCount} Heroes Active</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="flex bg-black/40 rounded-full border border-aetheria-800 overflow-hidden">
               <button onClick={() => handleZoom(0.2)} className="p-2 text-aetheria-400 hover:bg-white/5 transition-colors"><ZoomIn size={20} /></button>
               <button onClick={handleReset} className="p-2 text-aetheria-400 hover:bg-white/5 transition-colors border-x border-aetheria-800"><Maximize size={20} /></button>
               <button onClick={() => handleZoom(-0.2)} className="p-2 text-aetheria-400 hover:bg-white/5 transition-colors"><ZoomOut size={20} /></button>
            </div>
            
            <button 
              onClick={() => setActiveMenu(null)}
              className="p-2 text-aetheria-600 hover:text-aetheria-200 hover:bg-white/5 rounded-full transition-all group"
            >
              <X size={32} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        {/* Map Body */}
        <div 
          className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#0c0a08] cursor-grab active:cursor-grabbing"
          onWheel={onWheel}
        >
           {/* Decorative Compass */}
           <div className="absolute bottom-12 right-12 opacity-10 pointer-events-none">
              <Compass size={240} className="text-aetheria-400 animate-[spin_120s_linear_infinite]" />
           </div>

           <motion.div 
            drag
            dragConstraints={{
              left: -mapSize * zoom / 2,
              right: mapSize * zoom / 2,
              top: -mapSize * zoom / 2,
              bottom: mapSize * zoom / 2
            }}
            className="relative bg-aetheria-900 border-4 border-aetheria-800 rounded-lg shadow-aetheria-lg"
            style={{ width: mapSize * zoom, height: mapSize * zoom }}
          >
            {/* Grid & Texture */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/worn-dots.png')]" />
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-10 pointer-events-none">
              {Array.from({ length: 100 }).map((_, i) => (
                <div key={i} className="border-[0.5px] border-aetheria-400/40" />
              ))}
            </div>

            {/* Players */}
            {Object.keys(players).map((id) => (
              <MapMarker 
                key={id} 
                id={id} 
                isLocal={id === localPlayerId} 
                toMapCoords={toMapCoords} 
                zoom={zoom}
              />
            ))}

            {/* NPCs & Entities */}
            {Object.values(entities).map((entity) => {
              if (entity.isDead) return null;
              const [x, y] = toMapCoords(entity.pos);
              
              let icon = <div className={`w-2.5 h-2.5 rounded-full border border-black/40 ${entity.type === 'enemy' ? 'bg-red-500' : 'bg-green-500'}`} />;
              if (entity.role?.toLowerCase().includes('merchant')) icon = <ShoppingBag size={14} className="text-yellow-400" fill="currentColor" />;
              if (entity.role?.toLowerCase().includes('bank')) icon = <Warehouse size={14} className="text-blue-400" fill="currentColor" />;

              return (
                <div key={entity.id} className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-help z-10" style={{ left: x, top: y }}>
                  <motion.div style={{ scale: 1/Math.sqrt(zoom) }}>
                    {icon}
                  </motion.div>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-aetheria-950 border border-aetheria-400/30 px-2 py-1 rounded text-[9px] font-bold text-aetheria-200 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl">
                    {entity.name} {entity.role ? `(${entity.role})` : ''}
                  </div>
                </div>
              );
            })}

            {/* Teleport Crystals */}
            {Object.values(worldObjects).filter(o => o.type === 'teleport_crystal').map((crystal) => {
              const [x, y] = toMapCoords(crystal.pos);
              return (
                <div key={crystal.id} className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-help z-10" style={{ left: x, top: y }}>
                   <motion.div style={{ scale: 1/Math.sqrt(zoom) }}>
                    <Zap size={16} className="text-[#a855f7] drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]" fill="currentColor" />
                  </motion.div>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-aetheria-950 border border-[#a855f7]/30 px-2 py-1 rounded text-[9px] font-bold text-[#c084fc] uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl">
                    {crystal.name || 'Teleport Crystal'}
                  </div>
                </div>
              );
            })}

            {/* Quest Markers */}
            {questMarkers.map((marker) => {
              const [x, y] = toMapCoords(marker.pos);
              return (
                <div key={marker.id} className="absolute -translate-x-1/2 -translate-y-1/2 group z-20" style={{ left: x, top: y }}>
                  <motion.div 
                    style={{ scale: 1/Math.sqrt(zoom) }}
                    className="bg-yellow-400 text-black font-black w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-[0_0_15px_rgba(250,204,21,0.6)] border-2 border-black animate-bounce"
                  >
                    !
                  </motion.div>
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-aetheria-950 border border-yellow-400/30 px-2 py-1 rounded text-[9px] font-bold text-yellow-400 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-2xl">
                    Objective: {marker.name}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Footer Info */}
        <div className="relative z-20 p-6 border-t border-aetheria-800 bg-black/60 flex items-center justify-between">
           <div className="flex gap-8">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-aetheria-200 shadow-[0_0_10px_rgba(244,228,188,0.5)]" />
                 <span className="text-[10px] font-fantasy text-aetheria-200 uppercase tracking-[0.2em]">Imperial Scout (You)</span>
              </div>
              <div className="flex items-center gap-3 text-aetheria-600">
                 <ShoppingBag size={12} className="text-yellow-400" />
                 <span className="text-[10px] font-fantasy uppercase tracking-[0.2em]">Merchants</span>
              </div>
              <div className="flex items-center gap-3 text-aetheria-600">
                 <Zap size={12} className="text-[#a855f7]" />
                 <span className="text-[10px] font-fantasy uppercase tracking-[0.2em]">Teleports</span>
              </div>
           </div>
           <div className="text-[10px] text-aetheria-800 font-mono uppercase tracking-widest">
              Cartographic Data Rev. 4.3.0 • Zoom: {zoom.toFixed(1)}x • Grid Scale: 1:50
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

const MapMarker = memo(({ id, isLocal, toMapCoords, zoom }: { id: string, isLocal: boolean, toMapCoords: any, zoom: number }) => {
  const player = useGameStore(useShallow((state) => state.players[id]));
  if (!player) return null;

  const [x, y] = toMapCoords(player.pos || [0, 0, 0]);

  return (
    <motion.div
      initial={false}
      animate={{ left: x, top: y }}
      transition={{ type: "spring", damping: 25, stiffness: 120 }}
      className="absolute -translate-x-1/2 -translate-y-1/2 group z-30"
    >
      {isLocal ? (
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute inset-0 bg-aetheria-200 rounded-full blur-md"
          />
          <motion.div 
            style={{ scale: 1/Math.sqrt(zoom) }}
            className="w-5 h-5 rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] flex items-center justify-center z-10 relative ring-2 ring-aetheria-950"
          >
            <div 
              className="w-full h-full rounded-full"
              style={{ backgroundColor: player.color }}
            />
            <Navigation2 
              className="absolute w-4 h-4 text-white fill-current" 
              style={{ transform: `rotate(${-player.rot?.[1] || 0}rad)` }}
            />
          </motion.div>
          <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-aetheria-200 px-2 py-1 rounded text-[9px] font-black text-aetheria-950 border border-white/20 pointer-events-none shadow-2xl uppercase">
            YOU
          </div>
        </div>
      ) : (
        <div className="relative">
          <motion.div 
            style={{ scale: 1/Math.sqrt(zoom), backgroundColor: player.color }}
            className="w-4 h-4 rounded-full border-2 border-aetheria-950 shadow-lg flex items-center justify-center transition-transform group-hover:scale-125"
          />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-2 py-1 rounded text-[8px] font-black text-aetheria-200 border border-aetheria-400/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-tighter">
            {player.name}
          </div>
        </div>
      )}
    </motion.div>
  );
});

Map.displayName = "Map";
