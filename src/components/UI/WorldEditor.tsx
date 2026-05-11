/**
 * @file src/components/UI/WorldEditor.tsx
 * @description The master interface for the in-game world building tools.
 * Orchestrates the palette, inspector, outliner, and specialized tools like terrain sculpting.
 * @importance Essential: Empowers developers and creators to build and refine the game world in real-time.
 */
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { WorldObject } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import { Save, Settings2, Activity, List } from 'lucide-react';
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
    setActiveMenu,
    editorShowOutliner,
    setEditorShowOutliner,
    editorStartPosition,
    setEditorStartPosition,
    requestTeleport
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
    setActiveMenu: s.setActiveMenu,
    editorShowOutliner: s.editorShowOutliner,
    setEditorShowOutliner: s.setEditorShowOutliner,
    editorStartPosition: s.editorStartPosition,
    setEditorStartPosition: s.setEditorStartPosition,
    requestTeleport: s.requestTeleport,
    worldEditorBuffer: s.worldEditorBuffer,
    worldEditorDeleted: s.worldEditorDeleted,
    clearEditorBuffer: s.clearEditorBuffer,
    updateWorldObject: s.updateWorldObject,
    addWorldObject: s.addWorldObject
  })));

  const [activeCategory, setActiveCategory] = useState('nature');
  
  // Pathing Defaults
  const [activePathId, setActivePathId] = useState('new_path');
  const [nextWaypointOrder, setNextWaypointOrder] = useState(1);

  // Capture start position when entering editor
  useEffect(() => {
    if (isEditorOpen && !editorStartPosition) {
      const me = players[currentPlayerId || ""];
      if (me?.pos) {
        setEditorStartPosition([...me.pos]);
      }
    }
  }, [isEditorOpen, currentPlayerId, players, editorStartPosition, setEditorStartPosition]);

  const localPlayer = currentPlayerId ? players[currentPlayerId] : null;
  
  // Robust access check: Check character role OR account role mapping
  const hasAccess = 
    localPlayer?.role === 'dev' || 
    localPlayer?.role === 'admin' || 
    localPlayer?.role === 'mod' ||
    (userEmail && (userEmail.toLowerCase() === "michaeljhoward94@gmail.com"));

  const selectedObject = selectedWorldObjectId ? worldObjects[selectedWorldObjectId] : null;

  const updateSelected = (data: Partial<WorldObject>) => {
    if (selectedWorldObjectId && selectedObject) {
      let finalData = { ...data };
      if (gridSnap && data.pos) {
        finalData.pos = snapVectorToGrid(data.pos as [number, number, number]);
      }
      useGameStore.getState().updateWorldObject(selectedWorldObjectId, finalData);
    }
  };

  const handleSaveSession = () => {
    if (!socket) return;
    
    const saves = Object.entries(useGameStore.getState().worldEditorBuffer).map(([id, data]) => ({
      id,
      ...data
    }));
    
    const deletes = useGameStore.getState().worldEditorDeleted;
    const terrain = Object.entries(useGameStore.getState().terrainEditorBuffer).map(([key, val]) => {
      const [x, z] = key.split('_').map(Number);
      return { x, z, ...val };
    });

    if (saves.length > 0 || deletes.length > 0 || terrain.length > 0) {
      socket.emit("batch_save_world_objects", { saves, deletes, terrain });
    }

    if (editorStartPosition) {
      requestTeleport([...editorStartPosition]);
      setEditorStartPosition(null);
    }

    useGameStore.getState().clearEditorBuffer();
    setEditorSelectedType(null);
    setSelectedWorldObjectId(null);
    setEditorOpen(false);
  };

  const handleCancelSession = () => {
    if (editorStartPosition) {
      requestTeleport([...editorStartPosition]);
      setEditorStartPosition(null);
    }

    useGameStore.getState().clearEditorBuffer();
    setEditorSelectedType(null);
    setSelectedWorldObjectId(null);
    setEditorOpen(false);
    // Request a sync to revert local changes
    socket.emit("request_world_sync");
  };

  const duplicateSelected = () => {
    if (selectedObject) {
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

      useGameStore.getState().addWorldObject(newData);
      setSelectedWorldObjectId(newId);
    }
  };

  // Handle placement with defaults
  useEffect(() => {
    if (!socket) return;
    
    const handlePlace = (e: any) => {
      const { point, type, modelUrl } = e.detail;
      const newId = crypto.randomUUID();
      
      const newObj: any = {
        id: newId,
        type: type,
        pos: [point.x, point.y || 0, point.z],
        rot: [0, 0, 0],
        scale: 1,
        modelUrl: modelUrl
      };

      if (type === 'waypoint') {
        newObj.pathId = activePathId;
        newObj.waypointId = nextWaypointOrder.toString();
        newObj.nextWaypointId = (nextWaypointOrder + 1).toString();
        setNextWaypointOrder(prev => prev + 1);
      }

      useGameStore.getState().addWorldObject(newObj);
      setSelectedWorldObjectId(newId);
    };

    window.addEventListener('editor_place_object', handlePlace);
    return () => window.removeEventListener('editor_place_object', handlePlace);
  }, [socket, activePathId, nextWaypointOrder]);

  if (!devMode || !hasAccess) return null;

  return (
    <div className="fixed bottom-24 right-8 z-50 flex flex-col items-end gap-5 pointer-events-none">
      <div className="flex items-center gap-3">
        {isEditorOpen && (
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditorShowOutliner(!editorShowOutliner)}
              className={`pointer-events-auto px-4 h-14 rounded-2xl flex items-center gap-2 transition-all duration-300 shadow-xl border border-white/10 backdrop-blur-xl font-bold uppercase tracking-widest text-[9px] ${
                editorShowOutliner
                  ? 'bg-blue-500 text-white shadow-blue-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white'
              }`}
            >
              <List size={16} />
              {editorShowOutliner ? 'Hide Outliner' : 'Show Outliner'}
            </motion.button>

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
          </div>
        )}

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isEditorOpen ? handleSaveSession : () => setEditorOpen(true)}
          className={`pointer-events-auto px-8 h-14 rounded-2xl flex items-center gap-4 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-xl font-black uppercase tracking-[0.2em] text-[10px] ring-1 ring-white/5 ${
            isEditorOpen 
              ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-slate-950/90 text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <div className={`transition-transform duration-500 ${isEditorOpen ? 'rotate-0' : ''}`}>
            {isEditorOpen ? <Save size={18} strokeWidth={2.5} /> : <Settings2 size={18} strokeWidth={2.5} />}
          </div>
          {isEditorOpen ? 'Save & Exit' : 'Launch Studio'}
        </motion.button>

        {isEditorOpen && (
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCancelSession}
            className="pointer-events-auto px-6 h-14 rounded-2xl flex items-center gap-4 transition-all duration-500 bg-slate-950/90 text-red-400 hover:text-red-300 border border-white/10 backdrop-blur-xl font-black uppercase tracking-[0.2em] text-[10px] ring-1 ring-white/5 shadow-xl"
          >
            Cancel
          </motion.button>
        )}
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

            {editorShowOutliner && <EditorOutliner socket={socket} />}

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
