import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { WorldObject } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import { Save, Settings2, Activity } from 'lucide-react';
import { EditorPalette } from './EditorPalette';
import { EditorInspector } from './EditorInspector';
import { EditorOutliner } from './EditorOutliner';
import { snapVectorToGrid } from '../../lib/gameUtils';

export const WorldEditor = ({ socket, userEmail }: { socket: any, userEmail?: string | null }) => {
  const { 
    devMode, 
    worldObjects, 
    editorSelectedType, 
    setEditorSelectedType,
    selectedWorldObjectId,
    setSelectedWorldObjectId,
    players,
    currentPlayerId,
    isEditorOpen,
    setEditorOpen,
    gridSnap,
    setGridSnap,
    editorTransformMode,
    setEditorTransformMode,
    editorBrushSize,
    setEditorBrushSize,
    editorBrushStrength,
    setEditorBrushStrength,
    activeMenu,
    setActiveMenu
  } = useGameStore(useShallow(s => ({
    devMode: s.devMode,
    worldObjects: s.worldObjects,
    editorSelectedType: s.editorSelectedType,
    setEditorSelectedType: s.setEditorSelectedType,
    selectedWorldObjectId: s.selectedWorldObjectId,
    setSelectedWorldObjectId: s.setSelectedWorldObjectId,
    players: s.players,
    currentPlayerId: s.id,
    isEditorOpen: s.isEditorOpen,
    setEditorOpen: s.setEditorOpen,
    gridSnap: s.gridSnap,
    setGridSnap: s.setGridSnap,
    editorTransformMode: s.editorTransformMode,
    setEditorTransformMode: s.setEditorTransformMode,
    editorBrushSize: s.editorBrushSize,
    setEditorBrushSize: s.setEditorBrushSize,
    editorBrushStrength: s.editorBrushStrength,
    setEditorBrushStrength: s.setEditorBrushStrength,
    activeMenu: s.activeMenu,
    setActiveMenu: s.setActiveMenu
  })));

  const [activeCategory, setActiveCategory] = useState('nature');
  
  // Pathing Defaults
  const [activePathId, setActivePathId] = useState('new_path');
  const [nextWaypointOrder, setNextWaypointOrder] = useState(1);

  const localPlayer = currentPlayerId ? players[currentPlayerId] : null;
  
  // Robust access check: Check character role OR account role mapping
  const hasAccess = 
    localPlayer?.role === 'dev' || 
    localPlayer?.role === 'admin' || 
    localPlayer?.role === 'mod' ||
    (userEmail && (userEmail.toLowerCase() === "michaeljhoward94@gmail.com"));

  const selectedObject = selectedWorldObjectId ? worldObjects[selectedWorldObjectId] : null;

  const updateSelected = (data: Partial<WorldObject>) => {
    if (selectedWorldObjectId && selectedObject && socket) {
      let finalData = { ...data };
      if (gridSnap && data.pos) {
        finalData.pos = snapVectorToGrid(data.pos as [number, number, number]);
      }
      socket.emit("save_world_object", { ...selectedObject, ...finalData });
    }
  };

  const duplicateSelected = () => {
    if (selectedObject && socket) {
      const newId = crypto.randomUUID();
      const newData: any = {
        ...selectedObject,
        id: newId,
        pos: [selectedObject.pos[0] + 1, selectedObject.pos[1], selectedObject.pos[2] + 1]
      };
      
      // Auto-increment on duplicate if it's a waypoint
      if (selectedObject.type === 'waypoint' && selectedObject.waypointId) {
        newData.waypointId = (Number(selectedObject.waypointId) + 1).toString();
      }

      socket.emit("save_world_object", newData);
      setSelectedWorldObjectId(newId);
    }
  };

  // Handle placement with defaults
  useEffect(() => {
    if (!socket) return;
    
    const handlePlace = (e: any) => {
      const { point, type } = e.detail;
      if (type === 'waypoint') {
        socket.emit("save_world_object", {
          id: crypto.randomUUID(),
          type: 'waypoint',
          pos: [point.x, 0, point.z],
          rot: [0, 0, 0],
          scale: 1,
          pathId: activePathId,
          waypointId: nextWaypointOrder.toString(),
          nextWaypointId: (nextWaypointOrder + 1).toString()
        });
        setNextWaypointOrder(prev => prev + 1);
      }
    };

    window.addEventListener('editor_place_object', handlePlace);
    return () => window.removeEventListener('editor_place_object', handlePlace);
  }, [socket, activePathId, nextWaypointOrder]);

  if (!devMode || !hasAccess) return null;

  return (
    <div className="fixed bottom-24 right-8 z-50 flex flex-col items-end gap-5 pointer-events-none">
      <div className="flex items-center gap-3">
        {isEditorOpen && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveMenu(activeMenu === 'spawners' ? null : 'spawners')}
            className={`pointer-events-auto px-4 h-14 rounded-2xl flex items-center gap-2 transition-all duration-300 shadow-xl border border-white/10 backdrop-blur-xl font-bold uppercase tracking-widest text-[9px] ${
              activeMenu === 'spawners'
                ? 'bg-red-500 text-white shadow-red-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white'
            }`}
          >
            <Activity size={16} />
            {activeMenu === 'spawners' ? 'Hide Spawners' : 'Manage Spawners'}
          </motion.button>
        )}

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setEditorOpen(!isEditorOpen)}
          className={`pointer-events-auto px-8 h-14 rounded-2xl flex items-center gap-4 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-xl font-black uppercase tracking-[0.2em] text-[10px] ring-1 ring-white/5 ${
            isEditorOpen 
              ? 'bg-amber-500 text-white shadow-amber-500/20' 
              : 'bg-slate-950/90 text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <div className={`transition-transform duration-500 ${isEditorOpen ? 'rotate-180' : ''}`}>
            <Settings2 size={18} strokeWidth={2.5} />
          </div>
          {isEditorOpen ? 'Exit Studio' : 'Launch Studio'}
        </motion.button>
      </div>

      <AnimatePresence>
        {isEditorOpen && (
          <>
            <EditorPalette 
              gridSnap={gridSnap}
              setGridSnap={setGridSnap}
              editorSelectedType={editorSelectedType}
              setEditorSelectedType={setEditorSelectedType}
              editorTransformMode={editorTransformMode}
              setEditorTransformMode={setEditorTransformMode}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              activePathId={activePathId}
              setActivePathId={setActivePathId}
              nextWaypointOrder={nextWaypointOrder}
              setNextWaypointOrder={setNextWaypointOrder}
              editorBrushSize={editorBrushSize}
              setEditorBrushSize={setEditorBrushSize}
              editorBrushStrength={editorBrushStrength}
              setEditorBrushStrength={setEditorBrushStrength}
            />

            <EditorOutliner socket={socket} />

            <EditorInspector 
              selectedObject={selectedObject}
              setSelectedWorldObjectId={setSelectedWorldObjectId}
              duplicateSelected={duplicateSelected}
              updateSelected={updateSelected}
              socket={socket}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
