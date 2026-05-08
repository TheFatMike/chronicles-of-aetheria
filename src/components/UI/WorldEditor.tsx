import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { WorldObject } from '../../types';
import { AnimatePresence } from 'motion/react';
import { Save } from 'lucide-react';
import { EditorPalette } from './EditorPalette';
import { EditorInspector } from './EditorInspector';
import { EditorOutliner } from './EditorOutliner';
import { snapVectorToGrid } from '../../lib/gameUtils';

export const WorldEditor = ({ socket }: { socket: any }) => {
  const { 
    devMode, 
    worldObjects, 
    editorSelectedType, 
    setEditorSelectedType,
    selectedWorldObjectId,
    setSelectedWorldObjectId,
    players,
    id: currentPlayerId,
    isEditorOpen,
    setEditorOpen,
    gridSnap,
    setGridSnap,
    editorTransformMode,
    setEditorTransformMode
  } = useGameStore();

  const [activeCategory, setActiveCategory] = useState('nature');
  
  // Pathing Defaults
  const [activePathId, setActivePathId] = useState('new_path');
  const [nextWaypointOrder, setNextWaypointOrder] = useState(1);

  const localPlayer = currentPlayerId ? players[currentPlayerId] : null;
  const hasAccess = localPlayer?.role === 'dev' || localPlayer?.role === 'admin' || localPlayer?.role === 'mod';

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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      <button 
        onClick={() => setEditorOpen(!isEditorOpen)}
        className={`pointer-events-auto px-6 h-12 rounded-xl flex items-center gap-3 transition-all shadow-2xl border-2 font-black uppercase tracking-widest text-xs ${
          isEditorOpen 
            ? 'bg-amber-500 border-amber-400 text-white' 
            : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
        }`}
      >
        <Save size={18} />
        {isEditorOpen ? 'CLOSE SCULPTOR' : 'WORLD SCULPTOR'}
      </button>

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
