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
      className="pointer-events-auto fixed right-8 top-[15vh] w-80 bg-[#1a140f]/95 border-4 border-[#4a3a2a] rounded-xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden flex flex-col h-[70vh]"
    >
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
      {/* Header */}
      <div className="bg-linear-to-b from-slate-900/80 to-transparent p-5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#c2a472]/10 border border-[#c2a472]/20 flex items-center justify-center">
              <Box size={16} className="text-[#c2a472]" />
            </div>
            <div>
              <h3 className="text-[#f4e4bc] font-black text-[11px] uppercase tracking-[0.2em] relative z-10">Inspector</h3>
              <p className="text-[#8b6b4d] text-[9px] font-bold uppercase tracking-wider relative z-10">Properties & Logic</p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedObject && (
              <button 
                onClick={() => setSelectedWorldObjectId(null)}
                className="p-2 text-slate-500 hover:text-white bg-slate-900/50 rounded-xl ring-1 ring-white/5 transition-all"
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
              className="h-60 flex flex-col items-center justify-center text-slate-600 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-slate-900/50 rounded-3xl border border-slate-800/50 flex items-center justify-center shadow-inner">
                <Layers size={32} className="opacity-20" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Idle Inspector</p>
                <p className="text-[9px] text-slate-700 font-bold uppercase tracking-wider italic">Select an object to inspect</p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Type Badge */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Asset ID</span>
                  <span className="text-[10px] text-white font-mono truncate max-w-[120px]">{selectedObject.id.slice(0, 8)}...</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest">Category</span>
                  <span className="text-[10px] text-amber-500 font-black uppercase tracking-wider">{selectedObject.type}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={duplicateSelected} className="flex items-center justify-center gap-2 bg-slate-900/50 hover:bg-white/5 text-white py-3 rounded-xl text-[9px] font-black border border-white/5 transition-all uppercase tracking-widest group">
                  <Copy size={12} className="group-hover:text-blue-400" /> Duplicate
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
                    <Settings size={12} className="text-slate-500" />
                    <h4 className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Transform</h4>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const event = new KeyboardEvent('keydown', { code: 'KeyF' });
                        window.dispatchEvent(event);
                      }}
                      className="text-[8px] text-blue-400 hover:text-blue-300 font-black uppercase flex items-center gap-1"
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
                        <label className="text-[7px] text-[#8b6b4d] font-black uppercase tracking-widest">Pos {config.axis}</label>
                      </div>
                      <input 
                        type="number" step="0.1"
                        value={Number(selectedObject.pos[i].toFixed(2))}
                        onChange={(e) => {
                          const newPos = [...selectedObject.pos];
                          newPos[i] = parseFloat(e.target.value) || 0;
                          updateSelected({ pos: newPos as [number, number, number] });
                        }}
                        className="w-full bg-black/40 text-[#f4e4bc] text-[10px] p-2.5 rounded-lg border border-[#4a3a2a]/30 outline-none focus:border-[#c2a472]/50 font-mono transition-all relative z-10"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[7px] text-slate-500 font-black uppercase tracking-widest block px-1">Rotation (Y)</label>
                    <input 
                      type="number" step="0.1"
                      value={Number(selectedObject.rot[1].toFixed(2))}
                      onChange={(e) => updateSelected({ rot: [0, parseFloat(e.target.value) || 0, 0] })}
                      className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-blue-500/50 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[7px] text-slate-500 font-black uppercase tracking-widest block px-1">Global Scale</label>
                    <input 
                      type="number" step="0.1"
                      value={Number(selectedObject.scale.toFixed(2))}
                      onChange={(e) => updateSelected({ scale: parseFloat(e.target.value) || 1 })}
                      className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-blue-500/50 font-mono"
                    />
                  </div>
                </div>

                {/* Model Configuration */}
                <div className="space-y-2 pt-2">
                  <label className="text-[7px] text-amber-500/80 font-black uppercase px-1 flex items-center gap-2">
                    <Layers size={10} /> External GLB URL
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="/assets/models/..."
                      value={selectedObject.modelUrl || ''}
                      onChange={(e) => updateSelected({ modelUrl: e.target.value })}
                      className="w-full bg-slate-900/50 text-white text-[9px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-amber-500/50 pr-8"
                    />
                    <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700" />
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
                      <label className="text-[7px] text-slate-500 uppercase font-black tracking-widest px-1">Network Path ID</label>
                      <input 
                        type="text"
                        placeholder="e.g. city_patrol"
                        value={selectedObject.pathId || ''}
                        onChange={(e) => updateSelected({ pathId: e.target.value })}
                        className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    {selectedObject.type === 'waypoint' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-[7px] text-slate-500 uppercase font-black tracking-widest px-1">Order #</label>
                          <input 
                            type="number"
                            value={selectedObject.waypointId || ''}
                            onChange={(e) => updateSelected({ waypointId: e.target.value })}
                            className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-emerald-500/50 font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[7px] text-slate-500 uppercase font-black tracking-widest px-1">Next #</label>
                          <input 
                            type="number"
                            value={selectedObject.nextWaypointId || ''}
                            onChange={(e) => updateSelected({ nextWaypointId: e.target.value })}
                            className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-emerald-500/50 font-mono"
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
                          <label className="text-[7px] text-slate-500 uppercase font-black tracking-widest px-1">Entity Class</label>
                          <input 
                            type="text"
                            placeholder="e.g. slime, wolf, guard"
                            value={selectedObject.entityClass || ''}
                            onChange={(e) => updateSelected({ entityClass: e.target.value })}
                            className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-red-500/50"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-[7px] text-slate-500 uppercase font-black tracking-widest px-1">Level</label>
                            <input 
                              type="number"
                              value={selectedObject.level || 1}
                              onChange={(e) => updateSelected({ level: parseInt(e.target.value) || 1 })}
                              className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-red-500/50 font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[7px] text-slate-500 uppercase font-black tracking-widest px-1">Max Entities</label>
                            <input 
                              type="number"
                              value={selectedObject.maxEntities || 3}
                              onChange={(e) => updateSelected({ maxEntities: parseInt(e.target.value) || 1 })}
                              className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-red-500/50 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-[7px] text-slate-500 uppercase font-black tracking-widest px-1">Radius (u)</label>
                            <input 
                              type="number"
                              value={selectedObject.spawnRadius || 5}
                              onChange={(e) => updateSelected({ spawnRadius: parseInt(e.target.value) || 1 })}
                              className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-red-500/50 font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[7px] text-slate-500 uppercase font-black tracking-widest px-1">Respawn (s)</label>
                            <input 
                              type="number"
                              value={selectedObject.respawnTime || 10}
                              onChange={(e) => updateSelected({ respawnTime: parseInt(e.target.value) || 5 })}
                              className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-red-500/50 font-mono"
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
      <div className="bg-black/40 p-5 border-t border-white/5 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${totalBuffered > 0 ? 'bg-amber-500' : 'bg-slate-700'}`} />
            {totalBuffered > 0 && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-amber-500 animate-ping opacity-50" />
            )}
          </div>
          <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em]">
            {totalBuffered} Buffered Changes
          </span>
        </div>
        <div className="text-[7px] text-slate-600 font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">v1.2.0-STABLE</div>
      </div>
    </motion.div>
  );
};
