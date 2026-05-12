/**
 * @file src/components/UI/WorldEditor.tsx
 * @description The master interface for the in-game world building tools.
 * Orchestrates the palette, inspector, outliner, and specialized tools like terrain sculpting.
 * @importance Essential: Empowers developers and creators to build and refine the game world in real-time.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { WorldObject } from '../../types';
import { AnimatePresence, motion } from 'motion/react';
import { Save, Settings2, Activity, List } from 'lucide-react';
import { AssetLibrary } from './AssetLibrary';
import { EditorInspector } from './EditorInspector';
import { EditorOutliner } from './EditorOutliner';
import { snapVectorToGrid } from '../../lib/gameUtils';
import { OBJECT_TEMPLATES } from '../../data/world/templates';

export const WorldEditor = ({ socket, userEmail }: { socket: any, userEmail?: string | null }) => {
  const { 
    devMode, 
    worldObjectsCount, 
    selectedObject,
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
    worldObjectsCount: Object.keys(s.worldObjects).length,
    selectedObject: s.selectedWorldObjectId ? s.worldObjects[s.selectedWorldObjectId] : null,
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
  const lastPlaceTime = useRef<number>(0);
  
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
  
  // Robust access check: Only allow 'dev' role OR the project administrator
  const hasAccess = 
    localPlayer?.role === 'dev' || 
    (userEmail && (userEmail.toLowerCase() === "michaeljhoward94@gmail.com"));

  // Using the memoized selectedObject from the selector

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

    if (saves.length === 0 && deletes.length === 0 && terrain.length === 0) {
      setEditorOpen(false);
      return;
    }

    const onSaveStatus = (response: { success: boolean, error?: string }) => {
      if (response.success) {
        useGameStore.getState().addMessage({
          id: 'save-' + Date.now(),
          sender: 'SYSTEM',
          text: 'World saved successfully!',
          color: '#10b981',
          timestamp: Date.now()
        });
        useGameStore.getState().clearEditorBuffer();
        setEditorSelectedType(null);
        setSelectedWorldObjectId(null);
        setEditorOpen(false);
        
        if (editorStartPosition) {
          requestTeleport([...editorStartPosition]);
          setEditorStartPosition(null);
        }
      } else {
        alert("Failed to save world: " + response.error);
      }
      socket.off('world_save_status', onSaveStatus);
    };

    socket.on('world_save_status', onSaveStatus);
    socket.emit("batch_save_world_objects", { saves, deletes, terrain });
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
      // Prevent double-spawning from rapid clicks or overlapping meshes
      const now = Date.now();
      if (now - lastPlaceTime.current < 100) return;
      lastPlaceTime.current = now;

      const { point, type, modelUrl, scale } = e.detail;
      console.log("[WorldEditor] Received editor_place_object", { type, point });
      const newId = crypto.randomUUID();
      const isSpawner = type.startsWith('spawner_');
      const isNPC = type.startsWith('npc_');
      const spawnerClass = isSpawner ? type.replace('spawner_', '') : undefined;
      
      const template = OBJECT_TEMPLATES[type];
      const newObj: any = {
        id: newId,
        type: type,
        name: isNPC ? (template?.label || 'Villager') : undefined,
        role: isNPC ? (template?.role || template?.label || 'Villager') : undefined,
        pos: [point.x, point.y || 0, point.z],
        rot: [0, 0, 0],
        scale: isSpawner ? 1 : (scale || 1),
        modelUrl: modelUrl || template?.modelUrl,
        color: isNPC ? (template?.color || '#facc15') : undefined
      };

      if (isSpawner) {
        newObj.entityClass = spawnerClass;
        newObj.level = 1;
        newObj.spawnRadius = 5;
        newObj.maxEntities = 3;
        newObj.respawnTime = 10;
        newObj.pathId = '';
      }

      if (type === 'waypoint') {
        newObj.pathId = activePathId;
        newObj.waypointId = nextWaypointOrder.toString();
        newObj.nextWaypointId = (nextWaypointOrder + 1).toString();
        setNextWaypointOrder(prev => prev + 1);
      }

      console.log("[WorldEditor] Creating New Object", newObj);
      useGameStore.getState().addWorldObject(newObj);
      setSelectedWorldObjectId(newId);
    };

    window.addEventListener('editor_place_object', handlePlace);
    return () => window.removeEventListener('editor_place_object', handlePlace);
  }, [socket, activePathId, nextWaypointOrder]);

  if (!devMode || !hasAccess) return null;

  return (
    <>
      <div className="fixed bottom-24 right-8 z-50 flex flex-col items-end gap-5 pointer-events-none">
        <div className="flex items-center gap-3">
          {isEditorOpen && (
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditorShowOutliner(!editorShowOutliner)}
                className={`pointer-events-auto px-4 h-14 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-xl border-2 border-[#4a3a2a] backdrop-blur-md font-black uppercase tracking-widest text-[9px] relative overflow-hidden ${
                  editorShowOutliner
                    ? 'bg-[#c2a472] text-[#1a140f]'
                    : 'bg-[#1a140f]/90 text-[#f4e4bc] hover:bg-[#2a241f]'
                }`}
              >
                <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
                <List size={16} />
                {editorShowOutliner ? 'Hide Outliner' : 'Show Outliner'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveMenu(activeMenu === 'spawners' ? null : 'spawners')}
                className={`pointer-events-auto px-4 h-14 rounded-xl flex items-center gap-2 transition-all duration-300 shadow-xl border-2 border-[#4a3a2a] backdrop-blur-md font-black uppercase tracking-widest text-[9px] relative overflow-hidden ${
                  activeMenu === 'spawners'
                    ? 'bg-red-900/80 text-white border-red-500/50'
                    : 'bg-[#1a140f]/90 text-[#f4e4bc] hover:bg-[#2a241f]'
                }`}
              >
                <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
                <Activity size={16} />
                {activeMenu === 'spawners' ? 'Hide Spawners' : 'Manage Spawners'}
              </motion.button>
            </div>
          )}

          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(194, 164, 114, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={isEditorOpen ? handleSaveSession : () => setEditorOpen(true)}
            className={`pointer-events-auto px-10 h-16 rounded-xl flex items-center gap-4 transition-all duration-500 shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-4 border-[#4a3a2a] backdrop-blur-md font-black uppercase tracking-[0.3em] text-[11px] relative overflow-hidden ${
              isEditorOpen 
                ? 'bg-[#c2a472] text-[#1a140f]' 
                : 'bg-[#1a140f]/95 text-[#f4e4bc] hover:bg-[#2a241f]'
            }`}
          >
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
            <div className={`transition-transform duration-700 relative z-10 ${isEditorOpen ? 'rotate-180' : ''}`}>
              {isEditorOpen ? <Save size={20} strokeWidth={3} /> : <Settings2 size={20} strokeWidth={3} />}
            </div>
            <span className="relative z-10">{isEditorOpen ? 'Commit Changes' : 'Enter Aetheria Studio'}</span>
          </motion.button>

          {isEditorOpen && (
            <motion.button 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancelSession}
              className="pointer-events-auto px-6 h-14 rounded-xl flex items-center gap-4 transition-all duration-500 bg-[#1a140f]/90 text-red-400 hover:text-red-300 border-2 border-[#4a3a2a] backdrop-blur-md font-black uppercase tracking-[0.2em] text-[10px] shadow-xl relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
              <span className="relative z-10">Discard Changes</span>
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isEditorOpen && (
          <>
            <AssetLibrary />
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
    </>
  );
};
