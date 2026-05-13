/**
 * @file src/components/UI/EditorInspector.tsx
 * @description The property editing pane for the world editor.
 * Allows for manual adjustment of an object's transformation, properties, and specific metadata.
 * @importance Essential: Key for fine-tuning the placement and configuration of objects in the world.
 */
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Target, X, Copy, Trash2, MapPin, Box, Layers, Settings, ChevronRight, Activity } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export const EditorInspector = ({
  selectedObject,
  setSelectedWorldObjectId,
  duplicateSelected,
  updateSelected,
  socket
}: any) => {
  const worldBufferCount = useGameStore(s => Object.keys(s.worldEditorBuffer).length);
  const terrainBufferCount = useGameStore(s => Object.keys(s.terrainEditorBuffer).length);
  const totalBuffered = worldBufferCount + terrainBufferCount;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      className="pointer-events-auto fixed right-8 top-[15vh] w-80 bg-aetheria-950/95 border-4 border-aetheria-800 rounded-xl shadow-aetheria-lg backdrop-blur-md overflow-hidden flex flex-col h-[70vh]"
    >
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
      {/* Header */}
      <div className="bg-linear-to-b from-aetheria-950/80 to-transparent p-5 border-b border-aetheria-800/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-aetheria-400/10 border border-aetheria-400/20 flex items-center justify-center">
              <Box size={16} className="text-aetheria-400" />
            </div>
            <div>
              <h3 className="text-aetheria-200 font-black text-[11px] uppercase tracking-[0.2em] relative z-10">Inspector</h3>
              <p className="text-aetheria-600 text-[9px] font-bold uppercase tracking-wider relative z-10">Properties & Logic</p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedObject && (
              <button 
                onClick={() => setSelectedWorldObjectId(null)}
                className="p-2 text-aetheria-600 hover:text-aetheria-200 bg-aetheria-950/50 rounded-xl ring-1 ring-aetheria-800/30 transition-all"
                title="Deselect"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        <AnimatePresence mode="wait">
          {!selectedObject ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-60 flex flex-col items-center justify-center text-aetheria-800 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-aetheria-950/50 rounded-3xl border border-aetheria-800/50 flex items-center justify-center shadow-inner">
                <Layers size={32} className="opacity-20" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Idle Inspector</p>
                <p className="text-[9px] text-aetheria-600/50 font-bold uppercase tracking-wider italic">Select an object to inspect</p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Type Badge */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-aetheria-800/20">
                <div className="flex flex-col">
                  <span className="text-[8px] text-aetheria-600 uppercase font-black tracking-widest">Asset ID</span>
                  <span className="text-[10px] text-aetheria-200 font-mono truncate max-w-[120px]">{selectedObject.id.slice(0, 8)}...</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] text-aetheria-600 uppercase font-black tracking-widest">Category</span>
                  <span className="text-[10px] text-aetheria-400 font-black uppercase tracking-wider">{selectedObject.type}</span>
                </div>
              </div>

              {/* Identity Section */}
              <div className="space-y-2">
                <label className="text-[7px] text-aetheria-400 font-black uppercase tracking-widest block px-1">Display Name / Label</label>
                <input 
                  type="text"
                  placeholder="e.g. Town Square Crystal"
                  value={selectedObject.name || ''}
                  onChange={(e) => updateSelected({ name: e.target.value })}
                  className="w-full bg-black/40 text-aetheria-200 text-[10px] p-2.5 rounded-lg border border-aetheria-800/30 outline-none focus:border-aetheria-400/50 transition-all relative z-10"
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={duplicateSelected} className="flex items-center justify-center gap-2 bg-aetheria-950/50 hover:bg-white/5 text-aetheria-200 py-3 rounded-xl text-[9px] font-black border border-aetheria-800/30 transition-all uppercase tracking-widest group">
                  <Copy size={12} className="group-hover:text-aetheria-400" /> Duplicate
                </button>
                <button onClick={() => {
                  useGameStore.getState().markObjectDeleted(selectedObject.id);
                  setSelectedWorldObjectId(null);
                }} className="flex items-center justify-center gap-2 bg-rose-500/5 hover:bg-rose-500/20 text-rose-500 py-3 rounded-xl text-[9px] font-black border border-rose-500/20 transition-all uppercase tracking-widest">
                  <Trash2 size={12} /> Delete
                </button>
              </div>

              {/* Transform Section */}
              <div className="space-y-5 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings size={12} className="text-aetheria-600" />
                    <h4 className="text-[9px] text-aetheria-600 font-black uppercase tracking-widest">Transform</h4>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const event = new KeyboardEvent('keydown', { code: 'KeyF' });
                        window.dispatchEvent(event);
                      }}
                      className="text-[8px] text-aetheria-400 hover:text-aetheria-200 font-black uppercase flex items-center gap-1"
                    >
                      <Target size={10} /> Focus
                    </button>
                    <button 
                      onClick={() => updateSelected({ pos: [selectedObject.pos[0], 0, selectedObject.pos[2]] })}
                      className="text-[8px] text-emerald-400 hover:text-emerald-300 font-black uppercase"
                    >
                      Ground
                    </button>
                  </div>
                </div>
                
                {/* Position Inputs */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { axis: 'X', color: 'bg-rose-500' },
                    { axis: 'Y', color: 'bg-emerald-500' },
                    { axis: 'Z', color: 'bg-blue-500' }
                  ].map((config, i) => (
                    <div key={config.axis} className="space-y-2">
                      <div className="flex items-center gap-1.5 px-1">
                        <div className={`w-1 h-1 rounded-full ${config.color}`} />
                        <label className="text-[7px] text-aetheria-600 font-black uppercase tracking-widest">Pos {config.axis}</label>
                      </div>
                      <input 
                        type="number" step="0.1"
                        value={Number((selectedObject.pos[i] ?? 0).toFixed(2))}
                        onChange={(e) => {
                          const newPos = [...selectedObject.pos];
                          newPos[i] = parseFloat(e.target.value) || 0;
                          updateSelected({ pos: newPos as [number, number, number] });
                        }}
                        className="w-full bg-black/40 text-aetheria-200 text-[10px] p-2.5 rounded-lg border border-aetheria-800/30 outline-none focus:border-aetheria-400/50 font-mono transition-all relative z-10"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[7px] text-aetheria-600 font-black uppercase tracking-widest block px-1">Rotation (Y°)</label>
                    <input 
                      type="number" step="1"
                      value={Math.round((selectedObject.rot[1] ?? 0) * (180 / Math.PI))}
                      onChange={(e) => {
                        const deg = parseFloat(e.target.value) || 0;
                        const rad = deg * (Math.PI / 180);
                        const newRot = [...selectedObject.rot];
                        newRot[1] = rad;
                        updateSelected({ rot: newRot as [number, number, number] });
                      }}
                      className="w-full bg-black/40 text-aetheria-200 text-[10px] p-2.5 rounded-lg border border-aetheria-800/30 outline-none focus:border-aetheria-400/50 font-mono transition-all relative z-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[7px] text-aetheria-600 font-black uppercase tracking-widest block px-1">Global Scale</label>
                    <input 
                      type="number" step="0.1"
                      value={Number((selectedObject.scale ?? 1).toFixed(2))}
                      onChange={(e) => updateSelected({ scale: parseFloat(e.target.value) || 1 })}
                      className="w-full bg-aetheria-950/50 text-aetheria-200 text-[10px] p-2.5 rounded-xl border border-aetheria-800/30 outline-none focus:border-aetheria-400/50 font-mono"
                    />
                  </div>
                </div>

                {/* Model Configuration */}
                <div className="space-y-2 pt-2">
                  <label className="text-[7px] text-aetheria-400/80 font-black uppercase px-1 flex items-center gap-2">
                    <Layers size={10} /> External GLB URL
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="/assets/models/..."
                      value={selectedObject.modelUrl || ''}
                      onChange={(e) => updateSelected({ modelUrl: e.target.value })}
                      className="w-full bg-aetheria-950/50 text-aetheria-200 text-[9px] p-2.5 rounded-xl border border-aetheria-800/30 outline-none focus:border-aetheria-400/50 pr-8"
                    />
                    <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-aetheria-800" />
                  </div>
                </div>
              </div>

              {/* Logic Section (Waypoints/Spawners) */}
              {(selectedObject.type === 'waypoint' || selectedObject.type.startsWith('spawner_')) && (
                <div className="space-y-4 pt-5 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-emerald-500" />
                    <h4 className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Logic & Pathing</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-[7px] text-aetheria-600 uppercase font-black tracking-widest px-1">Network Path ID</label>
                      <input 
                        type="text"
                        placeholder="e.g. city_patrol"
                        value={selectedObject.pathId || ''}
                        onChange={(e) => updateSelected({ pathId: e.target.value })}
                        className="w-full bg-aetheria-950/50 text-aetheria-200 text-[10px] p-2.5 rounded-xl border border-aetheria-800/30 outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    {selectedObject.type === 'waypoint' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-[7px] text-aetheria-600 uppercase font-black tracking-widest px-1">Order #</label>
                          <input 
                            type="number"
                            value={selectedObject.waypointId || ''}
                            onChange={(e) => updateSelected({ waypointId: e.target.value })}
                            className="w-full bg-aetheria-950/50 text-aetheria-200 text-[10px] p-2.5 rounded-xl border border-aetheria-800/30 outline-none focus:border-emerald-500/50 font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[7px] text-aetheria-600 uppercase font-black tracking-widest px-1">Next #</label>
                          <input 
                            type="number"
                            value={selectedObject.nextWaypointId || ''}
                            onChange={(e) => updateSelected({ nextWaypointId: e.target.value })}
                            className="w-full bg-aetheria-950/50 text-aetheria-200 text-[10px] p-2.5 rounded-xl border border-aetheria-800/30 outline-none focus:border-emerald-500/50 font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {selectedObject.type.startsWith('spawner_') && (
                      <div className="space-y-3 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity size={10} className="text-red-400" />
                          <span className="text-[7px] text-red-400 uppercase font-black tracking-widest">Spawner Configuration</span>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[7px] text-aetheria-600 uppercase font-black tracking-widest px-1">Entity Class</label>
                          <input 
                            type="text"
                            placeholder="e.g. slime, wolf, guard"
                            value={selectedObject.entityClass || ''}
                            onChange={(e) => updateSelected({ entityClass: e.target.value })}
                            className="w-full bg-aetheria-950/50 text-aetheria-200 text-[10px] p-2.5 rounded-xl border border-aetheria-800/30 outline-none focus:border-red-500/50"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-[7px] text-aetheria-600 uppercase font-black tracking-widest px-1">Level</label>
                            <input 
                              type="number"
                              value={selectedObject.level || 1}
                              onChange={(e) => updateSelected({ level: parseInt(e.target.value) || 1 })}
                              className="w-full bg-aetheria-950/50 text-aetheria-200 text-[10px] p-2.5 rounded-xl border border-aetheria-800/30 outline-none focus:border-red-500/50 font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[7px] text-aetheria-600 uppercase font-black tracking-widest px-1">Max Entities</label>
                            <input 
                              type="number"
                              value={selectedObject.maxEntities || 3}
                              onChange={(e) => updateSelected({ maxEntities: parseInt(e.target.value) || 1 })}
                              className="w-full bg-aetheria-950/50 text-aetheria-200 text-[10px] p-2.5 rounded-xl border border-aetheria-800/30 outline-none focus:border-red-500/50 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-[7px] text-aetheria-600 uppercase font-black tracking-widest px-1">Radius (u)</label>
                            <input 
                              type="number"
                              value={selectedObject.spawnRadius || 5}
                              onChange={(e) => updateSelected({ spawnRadius: parseInt(e.target.value) || 1 })}
                              className="w-full bg-aetheria-950/50 text-aetheria-200 text-[10px] p-2.5 rounded-xl border border-aetheria-800/30 outline-none focus:border-red-500/50 font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[7px] text-aetheria-600 uppercase font-black tracking-widest px-1">Respawn (s)</label>
                            <input 
                              type="number"
                              value={selectedObject.respawnTime || 10}
                              onChange={(e) => updateSelected({ respawnTime: parseInt(e.target.value) || 5 })}
                              className="w-full bg-aetheria-950/50 text-aetheria-200 text-[10px] p-2.5 rounded-xl border border-aetheria-800/30 outline-none focus:border-red-500/50 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="bg-black/40 p-5 border-t border-aetheria-800/20 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${totalBuffered > 0 ? 'bg-aetheria-400' : 'bg-aetheria-800'}`} />
            {totalBuffered > 0 && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-aetheria-400 animate-ping opacity-50" />
            )}
          </div>
          <span className="text-[9px] text-aetheria-600 font-black uppercase tracking-[0.15em]">
            {totalBuffered} Buffered Changes
          </span>
        </div>
        <div className="text-[7px] text-aetheria-800 font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">v1.2.0-STABLE</div>
      </div>
    </motion.div>
  );
};
