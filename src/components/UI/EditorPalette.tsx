import React from 'react';
import { motion } from 'motion/react';
import { Grid, MousePointer2, Trash2, MapPin } from 'lucide-react';
import { CATEGORIES, ICON_MAP } from './EditorConstants';

export const EditorPalette = ({ 
  gridSnap, 
  setGridSnap, 
  editorSelectedType, 
  setEditorSelectedType,
  editorTransformMode,
  setEditorTransformMode,
  activeCategory,
  setActiveCategory,
  activePathId,
  setActivePathId,
  nextWaypointOrder,
  setNextWaypointOrder
}: any) => {
  return (
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
              {ICON_MAP[type]}
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
  );
};
