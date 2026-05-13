/**
 * @file src/components/UI/Minimap.tsx
 * @description A dynamic, circular mini-map HUD element.
 * Tracks player position, entities, and world objects in real-time.
 * Features glassmorphism, smooth animations, and auto-updating markers.
 */
import React, { memo, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { 
  Navigation2, 
  Plus, 
  Minus, 
  Compass,
  Zap,
  Map as MapIcon,
  ShoppingBag,
  Coins,
  Warehouse,
  Trophy
} from "lucide-react";

const MINIMAP_SIZE = 220; // Size in pixels
const DEFAULT_ZOOM = 2; // Pixels per world unit

export const Minimap = memo(() => {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  
  // Select necessary state from the store
  const { 
    localPlayerPos, 
    localPlayerRot, 
    players, 
    entities, 
    worldObjects, 
    activeQuests,
    setActiveMenu,
    uiScale,
    localPlayerId
  } = useGameStore(
    useShallow((s) => ({
      localPlayerPos: s.players[s.id || ""]?.pos || s.localPlayer?.pos || [0, 0, 0],
      localPlayerRot: s.players[s.id || ""]?.rot || s.localPlayer?.rot || [0, 0, 0],
      players: s.players,
      entities: s.entities,
      worldObjects: s.worldObjects,
      activeQuests: s.activeQuests,
      setActiveMenu: s.setActiveMenu,
      uiScale: s.uiScale,
      localPlayerId: s.id
    }))
  );

  // Helper to convert world units to map pixels relative to player
  const getMapPos = (pos: [number, number, number]) => {
    const dx = (pos[0] - localPlayerPos[0]) * zoom;
    const dz = (pos[2] - localPlayerPos[2]) * zoom;
    return { x: dx, y: dz };
  };

  // Filter quest objectives for markers
  const questMarkers = useMemo(() => {
    const markers: { id: string; name: string; pos: [number, number, number] }[] = [];
    Object.values(activeQuests).forEach(quest => {
      quest.objectives.forEach(obj => {
        if (!obj.completed && obj.type === 'talk') {
          // We look for the NPC in worldObjects or entities
          const target = Object.values(entities).find(e => e.name === obj.targetName) ||
                         Object.values(worldObjects).find(o => o.name === obj.targetName);
          if (target) {
            markers.push({ id: `quest-${quest.id}-${obj.id}`, name: quest.title, pos: target.pos });
          }
        }
      });
    });
    return markers;
  }, [activeQuests, entities, worldObjects]);

  // Handle zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));

  return (
    <div className="flex flex-col items-end gap-3 pointer-events-auto">
      {/* Main Mini-map Container */}
      <div 
        className="relative rounded-full border-[3px] border-aetheria-800 shadow-aetheria-lg overflow-hidden bg-aetheria-950/80 backdrop-blur-sm group cursor-crosshair"
        style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
      >
        {/* Decorative Grid Lines (Moving with player) */}
        <div 
          className="absolute -inset-full pointer-events-none opacity-10"
          style={{ 
            backgroundImage: 'radial-gradient(var(--color-aetheria-400) 1px, transparent 1px)',
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            transform: `translate(${-localPlayerPos[0] * zoom}px, ${-localPlayerPos[2] * zoom}px)`
          }}
        />

        {/* Dynamic Map Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          
          {/* Entity Markers */}
          {Object.values(entities).map((entity) => {
            const { x, y } = getMapPos(entity.pos);
            const isVisible = Math.sqrt(x*x + y*y) < MINIMAP_SIZE / 2;
            if (!isVisible || entity.isDead) return null;

            // Determine icon or dot based on role
            let markerContent = (
              <div className={`w-full h-full rounded-full border border-black/40 shadow-sm ${
                entity.type === 'enemy' ? 'bg-red-500 shadow-red-500/50' : 'bg-green-500 shadow-green-500/50'
              }`} />
            );

            if (entity.role?.toLowerCase().includes('merchant')) {
              markerContent = <ShoppingBag size={10} className="text-aetheria-400" fill="currentColor" />;
            } else if (entity.role?.toLowerCase().includes('bank')) {
              markerContent = <Warehouse size={10} className="text-blue-400" fill="currentColor" />;
            }

            return (
              <motion.div
                key={entity.id}
                initial={false}
                animate={{ x, y }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
                className="absolute flex items-center justify-center w-3 h-3"
              >
                {markerContent}
              </motion.div>
            );
          })}

          {/* Other Players */}
          {Object.entries(players).map(([id, player]) => {
            if (id === localPlayerId) return null; // Skip local
            const { x, y } = getMapPos(player.pos || [0, 0, 0]);
            const isVisible = Math.sqrt(x*x + y*y) < MINIMAP_SIZE / 2;
            if (!isVisible) return null;

            return (
              <motion.div
                key={id}
                initial={false}
                animate={{ x, y }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
                className="absolute w-2.5 h-2.5 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              />
            );
          })}

          {/* Teleport Crystals */}
          {Object.values(worldObjects).filter(o => o.type === 'teleport_crystal').map((crystal) => {
            const { x, y } = getMapPos(crystal.pos);
            const isVisible = Math.sqrt(x*x + y*y) < MINIMAP_SIZE / 2;
            if (!isVisible) return null;

            return (
              <motion.div
                key={crystal.id}
                initial={false}
                animate={{ x, y }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
                className="absolute text-[#a855f7] drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]"
              >
                <Zap size={14} fill="currentColor" />
              </motion.div>
            );
          })}

          {/* Quest Markers */}
          {questMarkers.map((marker) => {
            const { x, y } = getMapPos(marker.pos);
            const isVisible = Math.sqrt(x*x + y*y) < MINIMAP_SIZE / 2;
            if (!isVisible) return null;

            return (
              <motion.div
                key={marker.id}
                initial={false}
                animate={{ x, y }}
                transition={{ type: "spring", damping: 30, stiffness: 200 }}
                className="absolute text-aetheria-400 font-black text-xs drop-shadow-[0_0_3px_rgba(var(--color-aetheria-400-rgb),0.8)]"
              >
                !
              </motion.div>
            );
          })}

          {/* Local Player (Fixed in center) */}
          <div className="relative z-10">
            <div className="absolute inset-0 bg-aetheria-200 rounded-full blur-sm opacity-20 scale-150" />
            <motion.div 
              style={{ rotate: -localPlayerRot[1] * (180 / Math.PI) }}
              className="relative w-5 h-5 flex items-center justify-center text-aetheria-200"
            >
              <Navigation2 size={18} fill="currentColor" className="drop-shadow-[0_0_10px_rgba(244,228,188,0.5)]" />
            </motion.div>
          </div>
        </div>

        {/* Compass Ring Overlay */}
        <div className="absolute inset-0 border-10 border-black/20 rounded-full pointer-events-none" />
        
        {/* Cardinal Directions */}
        <div className="absolute inset-2 pointer-events-none text-[9px] font-black text-aetheria-400/60 font-serif">
          <span className="absolute top-0 left-1/2 -translate-x-1/2">N</span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2">S</span>
          <span className="absolute left-0 top-1/2 -translate-y-1/2">W</span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2">E</span>
        </div>

        {/* Zoom Controls Overlay */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={handleZoomIn}
            className="p-1 bg-black/40 hover:bg-black/60 rounded text-white transition-colors"
          >
            <Plus size={12} />
          </button>
          <button 
            onClick={handleZoomOut}
            className="p-1 bg-black/40 hover:bg-black/60 rounded text-white transition-colors"
          >
            <Minus size={12} />
          </button>
        </div>
      </div>

    </div>
  );
});

Minimap.displayName = "Minimap";
