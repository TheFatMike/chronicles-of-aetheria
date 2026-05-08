import React from 'react';
import { motion } from 'motion/react';
import { Save, Target, X, Copy, Trash2, MapPin } from 'lucide-react';

export const EditorInspector = ({
  selectedObject,
  setSelectedWorldObjectId,
  duplicateSelected,
  updateSelected,
  socket
}: any) => {
  return (
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
            <div className="p-4 bg-slate-900/50 rounded-full border border-slate-800/50">
              <Save size={24} className="opacity-20" />
            </div>
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
                <label className="text-[7px] text-amber-500/80 font-black uppercase px-1 flex items-center gap-1">
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
  );
};
