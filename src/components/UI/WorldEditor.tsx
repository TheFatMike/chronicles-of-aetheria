import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { WorldObject } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { TreePine, Mountain, Home, Tent as TentIcon, Save, Trash2, X, MousePointer2, Flame, Flower2, Container, Square as FenceIcon, Target, Briefcase, Droplets, MapPin, Copy, Grid } from 'lucide-react';

const CATEGORIES = [
  { id: 'nature', icon: <TreePine size={16} />, label: 'Nature', items: ['tree', 'rock', 'bush', 'flower'] },
  { id: 'town', icon: <Home size={16} />, label: 'Town', items: ['house', 'tent', 'tower_base', 'fence', 'signpost', 'barrel'] },
  { id: 'npcs', icon: <MousePointer2 size={16} />, label: 'NPCs', items: ['npc_instructor_kael', 'npc_guard_captain'] },
  { id: 'props', icon: <Droplets size={16} />, label: 'Props', items: ['campfire', 'chest', 'dummy', 'well'] },
  { id: 'systems', icon: <Target size={16} />, label: 'Systems', items: ['spawner_slime', 'spawner_wolf', 'spawner_guard', 'spawner_instructor_kael', 'waypoint'] },
];

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
        finalData.pos = [
          Math.round(data.pos[0] * 2) / 2,
          data.pos[1],
          Math.round(data.pos[2] * 2) / 2
        ];
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

  // Handle placement with defaults (called from World.tsx via a shared event or prop)
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

  const iconMap: Record<string, any> = {
    'tree': <TreePine size={20} />,
    'rock': <Mountain size={20} />,
    'house': <Home size={20} />,
    'tent': <TentIcon size={20} />,
    'tower_base': <Mountain size={20} className="text-slate-400" />,
    'bush': <Flower2 size={20} />,
    'fence': <FenceIcon size={20} />,
    'campfire': <Flame size={20} />,
    'barrel': <Container size={20} />,
    'dummy': <Target size={20} />,
    'chest': <Briefcase size={20} />,
    'well': <Droplets size={20} />,
    'signpost': <MapPin size={20} />,
    'waypoint': <MapPin size={20} className="text-amber-500" />,
    'spawner_slime': <div className="w-5 h-5 bg-green-500 rounded-full" />,
    'spawner_wolf': <div className="w-5 h-5 bg-gray-500 rounded-full" />,
    'spawner_guard': <div className="w-5 h-5 bg-blue-500 rounded-full" />,
    'spawner_instructor_kael': <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-[10px] text-black font-black">!</div>,
    'npc_instructor_kael': <div className="flex flex-col items-center"><div className="w-4 h-4 bg-amber-400 rounded-full" /><div className="w-5 h-2 bg-amber-600 rounded-sm -mt-0.5" /></div>,
    'npc_guard_captain': <div className="flex flex-col items-center"><div className="w-4 h-4 bg-blue-400 rounded-full" /><div className="w-5 h-2 bg-blue-600 rounded-sm -mt-0.5" /></div>,
  };

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
            {/* LEFT WINDOW: PALETTE & TOOLS */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="pointer-events-auto fixed left-6 top-1/2 -translate-y-1/2 w-72 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="bg-slate-900/50 p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid size={18} className="text-amber-500" />
                  <h3 className="text-white font-bold text-xs uppercase tracking-widest">Palette</h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setGridSnap(!gridSnap)}
                    className={`p-1.5 rounded-lg transition-all ${gridSnap ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-white'}`}
                    title="Grid Snap"
                  >
                    <Grid size={14} />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-900/30 flex gap-1 border-b border-slate-800">
                <button 
                  onClick={() => setEditorSelectedType('edit')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    editorSelectedType === 'edit' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <MousePointer2 size={12} /> SELECT
                </button>
                <button 
                  onClick={() => setEditorSelectedType('delete')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    editorSelectedType === 'delete' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Trash2 size={12} /> DELETE
                </button>
              </div>

              {/* Transform Modes */}
              <div className="p-3 bg-slate-900/10 flex gap-1 border-b border-slate-800">
                <button 
                  onClick={() => setEditorTransformMode('translate')}
                  className={`flex-1 py-1.5 rounded-md text-[9px] font-black transition-all border ${
                    editorTransformMode === 'translate' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  MOVE (G)
                </button>
                <button 
                  onClick={() => setEditorTransformMode('rotate')}
                  className={`flex-1 py-1.5 rounded-md text-[9px] font-black transition-all border ${
                    editorTransformMode === 'rotate' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  ROT (R)
                </button>
                <button 
                  onClick={() => setEditorTransformMode('scale')}
                  className={`flex-1 py-1.5 rounded-md text-[9px] font-black transition-all border ${
                    editorTransformMode === 'scale' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  SCALE (K)
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="flex gap-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                        activeCategory === cat.id 
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' 
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {cat.icon}
                      <span className="text-[8px] uppercase font-black">{cat.id}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.find(c => c.id === activeCategory)?.items.map((type) => (
                    <button
                      key={type}
                      onClick={() => setEditorSelectedType(type as any)}
                      title={type.replace(/_/g, ' ').toUpperCase()}
                      className={`aspect-square flex items-center justify-center rounded-xl border-2 transition-all ${
                        editorSelectedType === type 
                          ? 'bg-amber-500 border-amber-300 text-white shadow-lg shadow-amber-500/20 scale-95' 
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      {iconMap[type]}
                    </button>
                  ))}
                </div>

                {/* Pathing Workspace */}
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-emerald-500 uppercase font-black tracking-widest flex items-center gap-1">
                      <MapPin size={10} /> Pathing Workspace
                    </span>
                    <button 
                      onClick={() => setNextWaypointOrder(1)}
                      className="text-[8px] text-slate-500 hover:text-white uppercase font-bold"
                    >
                      Reset Order
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[7px] text-slate-500 uppercase font-bold px-1">Active Path ID</label>
                    <input 
                      type="text"
                      value={activePathId}
                      onChange={(e) => setActivePathId(e.target.value)}
                      className="w-full bg-slate-900 text-white text-[10px] p-2 rounded border border-slate-800 outline-none focus:border-emerald-500/50"
                      placeholder="e.g. guard_1"
                    />
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <span className="text-[8px] text-slate-400 uppercase font-bold">Next WP Order</span>
                    <span className="text-emerald-500 font-mono font-bold text-xs">{nextWaypointOrder}</span>
                  </div>
                </div>

                {/* Shortcuts Help */}
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Controls</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex justify-between text-[8px]"><span className="text-slate-400 font-bold uppercase">Fly</span> <span className="text-amber-500 font-bold">WASD</span></div>
                    <div className="flex justify-between text-[8px]"><span className="text-slate-400 font-bold uppercase">Up/Dn</span> <span className="text-amber-500 font-bold">E / Q</span></div>
                    <div className="flex justify-between text-[8px]"><span className="text-slate-400 font-bold uppercase">Focus</span> <span className="text-blue-500 font-bold">F</span></div>
                    <div className="flex justify-between text-[8px]"><span className="text-slate-400 font-bold uppercase">Move</span> <span className="text-emerald-500 font-bold">G</span></div>
                    <div className="flex justify-between text-[8px]"><span className="text-slate-400 font-bold uppercase">Scale</span> <span className="text-emerald-500 font-bold">K</span></div>
                    <div className="flex justify-between text-[8px]"><span className="text-slate-400 font-bold uppercase">Rot</span> <span className="text-emerald-500 font-bold">R</span></div>
                    <div className="flex justify-between text-[8px]"><span className="text-slate-400 font-bold uppercase">Look</span> <span className="text-blue-500 font-bold">R-CLICK</span></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* RIGHT WINDOW: INSPECTOR */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="pointer-events-auto fixed right-6 top-1/2 -translate-y-1/2 w-80 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="bg-slate-900/50 p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/20 rounded-lg">
                    <Save size={18} className="text-amber-500" />
                  </div>
                  <h3 className="text-white font-bold text-xs uppercase tracking-widest">Inspector</h3>
                </div>
                <div className="flex gap-2">
                  {selectedObject && (
                    <button 
                      onClick={() => {
                        const event = new KeyboardEvent('keydown', { code: 'KeyF' });
                        window.dispatchEvent(event);
                      }}
                      className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                      title="Focus Camera (F)"
                    >
                      <Target size={14} />
                    </button>
                  )}
                  {selectedObject && (
                    <button 
                      onClick={() => setSelectedWorldObjectId(null)}
                      className="p-1.5 text-slate-500 hover:text-white transition-colors"
                      title="Deselect"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {!selectedObject ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-600 text-center space-y-2">
                    <MousePointer2 size={24} className="opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-tighter">No Object Selected</p>
                    <p className="text-[9px] lowercase italic">Select an object in the world to edit its properties.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 uppercase font-black">Entity Type</span>
                      <span className="text-[10px] text-amber-500 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{selectedObject.type}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={duplicateSelected} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-[9px] font-black border border-slate-700 transition-all uppercase"><Copy size={12} /> Duplicate</button>
                      <button onClick={() => socket?.emit("remove_world_object", { id: selectedObject.id })} className="flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 py-2 rounded-lg text-[9px] font-black border border-red-900/20 transition-all uppercase"><Trash2 size={12} /> Remove</button>
                    </div>

                    {/* Transform */}
                    <div className="space-y-4 pt-3 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Transform</h4>
                        <button 
                          onClick={() => updateSelected({ pos: [selectedObject.pos[0], 0, selectedObject.pos[2]] })}
                          className="text-[8px] text-amber-500 hover:text-amber-400 font-black uppercase transition-colors"
                        >
                          Snap to Ground
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {['X', 'Y', 'Z'].map((axis, i) => (
                          <div key={axis} className="space-y-1">
                            <label className="text-[7px] text-slate-500 font-bold uppercase block px-1">Pos {axis}</label>
                            <input 
                              type="number" step="0.1"
                              value={Number(selectedObject.pos[i].toFixed(2))}
                              onChange={(e) => {
                                const newPos = [...selectedObject.pos];
                                newPos[i] = parseFloat(e.target.value) || 0;
                                updateSelected({ pos: newPos as [number, number, number] });
                              }}
                              className="w-full bg-slate-900 text-white text-[10px] p-2 rounded border border-slate-800 outline-none focus:border-amber-500/50 font-mono"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[7px] text-slate-500 font-bold uppercase block px-1">Rotation (Y)</label>
                          <input 
                            type="number" step="0.1"
                            value={Number(selectedObject.rot[1].toFixed(2))}
                            onChange={(e) => updateSelected({ rot: [0, parseFloat(e.target.value) || 0, 0] })}
                            className="w-full bg-slate-900 text-white text-[10px] p-2 rounded border border-slate-800 outline-none focus:border-amber-500/50 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[7px] text-slate-500 font-bold uppercase block px-1">Scale</label>
                          <input 
                            type="number" step="0.1"
                            value={Number(selectedObject.scale.toFixed(2))}
                            onChange={(e) => updateSelected({ scale: parseFloat(e.target.value) || 1 })}
                            className="w-full bg-slate-900 text-white text-[10px] p-2 rounded border border-slate-800 outline-none focus:border-amber-500/50 font-mono"
                          />
                        </div>
                      </div>

                      {/* GLB Model Support */}
                      <div className="space-y-1 pt-2">
                        <label className="text-[7px] text-amber-500/80 font-black uppercase block px-1 flex items-center gap-1">
                          <Save size={8} /> Custom GLB Model (Optional)
                        </label>
                        <input 
                          type="text"
                          placeholder="/assets/models/tent.glb"
                          value={selectedObject.modelUrl || ''}
                          onChange={(e) => updateSelected({ modelUrl: e.target.value })}
                          className="w-full bg-slate-900 text-white text-[9px] p-2 rounded border border-slate-800 outline-none focus:border-amber-500/50"
                        />
                        <p className="text-[7px] text-slate-600 italic px-1 leading-tight">
                          Leave empty for default procedural model. Place GLB files in /public/assets/models/
                        </p>
                      </div>
                    </div>

                    {/* PATHING SYSTEM */}
                    {(selectedObject.type === 'waypoint' || selectedObject.type.startsWith('spawner_')) && (
                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        <h4 className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                          <MapPin size={10} /> Pathing & Waypoints
                        </h4>
                        
                        <div className="space-y-1">
                          <label className="text-[8px] text-slate-500 uppercase font-black px-1">Path ID (Category)</label>
                          <input 
                            type="text"
                            placeholder="e.g. guard_patrol_1"
                            value={selectedObject.pathId || ''}
                            onChange={(e) => updateSelected({ pathId: e.target.value })}
                            className="w-full bg-slate-900 text-white text-[10px] p-2 rounded border border-slate-800 outline-none focus:border-emerald-500/50"
                          />
                        </div>

                        {selectedObject.type === 'waypoint' && (
                          <>
                            <div className="space-y-1">
                              <label className="text-[8px] text-slate-500 uppercase font-black px-1">Waypoint ID (Order)</label>
                              <input 
                                type="number"
                                value={selectedObject.waypointId || ''}
                                onChange={(e) => updateSelected({ waypointId: e.target.value })}
                                className="w-full bg-slate-900 text-white text-[10px] p-2 rounded border border-slate-800 outline-none focus:border-emerald-500/50"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] text-slate-500 uppercase font-black px-1">Next Waypoint (Order)</label>
                              <input 
                                type="number"
                                value={selectedObject.nextWaypointId || ''}
                                onChange={(e) => updateSelected({ nextWaypointId: e.target.value })}
                                className="w-full bg-slate-900 text-white text-[10px] p-2 rounded border border-slate-800 outline-none focus:border-emerald-500/50"
                              />
                            </div>
                          </>
                        )}

                        <p className="text-[8px] text-slate-600 italic leading-tight px-1">
                          {selectedObject.type === 'waypoint' 
                            ? "Waypoints with the same Path ID will be followed in order of their Waypoint ID."
                            : "This spawner will assign its entities to follow the specified Path ID."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${socket?.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{socket?.connected ? 'Live Sync' : 'Offline'}</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
