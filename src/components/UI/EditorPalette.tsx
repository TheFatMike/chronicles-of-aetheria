/**
 * @file src/components/UI/EditorPalette.tsx
 * @description The object selection menu for the world editor.
 * Organizes available templates into categories for quick access and placement.
 * @importance Essential: The primary tool for choosing and instantiating new objects in the world.
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Grid, MousePointer2, Trash2, MapPin, Search, ChevronRight, Settings2, Info } from 'lucide-react';
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
  setNextWaypointOrder,
  editorBrushSize,
  setEditorBrushSize,
  editorBrushStrength,
  setEditorBrushStrength
}: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isTerrainTool = editorSelectedType?.startsWith('terrain_');

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const currentCat = CATEGORIES.find(c => c.id === activeCategory);
    if (!currentCat) return [];
    
    return currentCat.items.filter(item => 
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeCategory, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -50, scale: 0.95 }}
      className="pointer-events-auto fixed left-8 top-1/2 -translate-y-1/2 w-80 bg-slate-950/98 border border-slate-800/60 rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-white/5"
    >
      {/* Header */}
      <div className="bg-linear-to-b from-slate-900/80 to-transparent p-5 border-b border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Settings2 size={16} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-white font-black text-[11px] uppercase tracking-[0.2em]">World Studio</h3>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Level Editor v1.2</p>
            </div>
          </div>
          
          <button 
            onClick={() => setGridSnap(!gridSnap)}
            className={`group relative p-2 rounded-xl transition-all duration-300 ${
              gridSnap 
                ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                : 'bg-slate-900/50 text-slate-500 hover:text-white ring-1 ring-white/5'
            }`}
            title="Toggle Grid Snapping"
          >
            <Grid size={16} />
            {gridSnap && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* Global Tools */}
        <div className="flex gap-2">
          <button 
            onClick={() => setEditorSelectedType('edit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all duration-300 ring-1 ${
              editorSelectedType === 'edit' 
                ? 'bg-amber-500 text-white ring-amber-400 shadow-lg shadow-amber-500/20' 
                : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 ring-white/5'
            }`}
          >
            <MousePointer2 size={14} strokeWidth={3} /> SELECT
          </button>
          <button 
            onClick={() => setEditorSelectedType('delete')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all duration-300 ring-1 ${
              editorSelectedType === 'delete' 
                ? 'bg-rose-500 text-white ring-rose-400 shadow-lg shadow-rose-500/20' 
                : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800 ring-white/5'
            }`}
          >
            <Trash2 size={14} strokeWidth={3} /> DELETE
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Category Tabs */}
        <div className="px-4 py-3 bg-slate-900/20 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 ring-1 ${
                activeCategory === cat.id 
                  ? 'bg-white/10 text-white ring-white/20 shadow-xl' 
                  : 'bg-transparent text-slate-500 hover:text-slate-300 ring-transparent'
              }`}
            >
              <span className={activeCategory === cat.id ? 'text-amber-500' : ''}>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Stats */}
        <div className="p-4 space-y-4">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-blue-400" />
            <input 
              type="text"
              placeholder="SEARCH ASSETS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:bg-slate-900 transition-all"
            />
          </div>

          {/* Transform Modes (Contextual) */}
          {editorSelectedType === 'edit' && (
            <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-900/50 rounded-xl border border-white/5">
              <button 
                onClick={() => setEditorTransformMode('translate')}
                className={`py-2 rounded-lg text-[9px] font-black transition-all ${
                  editorTransformMode === 'translate' ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                MOVE
              </button>
              <button 
                onClick={() => setEditorTransformMode('rotate')}
                className={`py-2 rounded-lg text-[9px] font-black transition-all ${
                  editorTransformMode === 'rotate' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                ROT
              </button>
              <button 
                onClick={() => setEditorTransformMode('scale')}
                className={`py-2 rounded-lg text-[9px] font-black transition-all ${
                  editorTransformMode === 'scale' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                SCALE
              </button>
            </div>
          )}
        </div>

        {/* Items Grid */}
        <div className="px-4 pb-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((type) => (
                <motion.button
                  key={type}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setEditorSelectedType(type as any)}
                  className={`group relative aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-300 ${
                    editorSelectedType === type 
                      ? 'bg-amber-500 border-amber-300 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-95' 
                      : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  <div className={`transition-transform duration-300 ${editorSelectedType === type ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {ICON_MAP[type]}
                  </div>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[8px] font-black rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {type.replace(/_/g, ' ').toUpperCase()}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            
            {filteredItems.length === 0 && (
              <div className="col-span-4 py-8 flex flex-col items-center justify-center text-slate-600 gap-2">
                <Info size={24} strokeWidth={1.5} />
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">No Assets Found</p>
              </div>
            )}
          </div>

          {/* Terrain Settings */}
          <AnimatePresence>
            {isTerrainTool && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl space-y-5 overflow-hidden shadow-inner"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[9px] text-blue-400 uppercase font-black tracking-widest">Brush Configuration</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Size</span>
                    <span className="text-[10px] text-blue-400 font-mono font-bold">{editorBrushSize}m</span>
                  </div>
                  <input 
                    type="range" min="4" max="40" step="4" 
                    value={editorBrushSize} 
                    onChange={(e) => setEditorBrushSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Strength</span>
                    <span className="text-[10px] text-blue-400 font-mono font-bold">{(editorBrushStrength * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="2" step="0.1" 
                    value={editorBrushStrength} 
                    onChange={(e) => setEditorBrushStrength(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pathing Workspace */}
          <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-emerald-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                <MapPin size={12} /> Pathing Workspace
              </span>
              <button 
                onClick={() => setNextWaypointOrder(1)}
                className="text-[8px] text-slate-500 hover:text-white uppercase font-black tracking-widest transition-colors"
              >
                Reset Order
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-[7px] text-slate-500 uppercase font-black tracking-widest px-1">Active Path ID</label>
              <input 
                type="text"
                value={activePathId}
                onChange={(e) => setActivePathId(e.target.value)}
                className="w-full bg-slate-900/50 text-white text-[10px] p-2.5 rounded-xl border border-white/5 outline-none focus:border-emerald-500/50 transition-all"
                placeholder="e.g. guard_1"
              />
            </div>

            <div className="flex items-center justify-between px-1 py-1">
              <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Next WP Order</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-mono font-black text-[10px] ring-1 ring-emerald-500/20">{nextWaypointOrder}</span>
            </div>
          </div>

          {/* Shortcuts Help */}
          <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em]">Studio Shortcuts</span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-1">
              {[
                { label: 'Fly', key: 'WASD', color: 'text-amber-500' },
                { label: 'Up/Dn', key: 'E / Q', color: 'text-amber-500' },
                { label: 'Focus', key: 'F', color: 'text-blue-500' },
                { label: 'Move', key: 'G', color: 'text-emerald-500' },
                { label: 'Scale', key: 'K', color: 'text-emerald-500' },
                { label: 'Rot', key: 'R', color: 'text-emerald-500' },
                { label: 'Look', key: 'R-CLICK', color: 'text-blue-500' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center text-[8px]">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">{item.label}</span>
                  <span className={`${item.color} font-black tracking-widest`}>{item.key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-900/50 p-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${editorSelectedType ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
          <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">
            {editorSelectedType ? `ACTIVE: ${editorSelectedType.replace(/_/g, ' ')}` : 'READY'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-600">
          <Info size={10} />
          <span className="text-[7px] font-bold uppercase tracking-widest italic">Dev Alpha</span>
        </div>
      </div>
    </motion.div>
  );
};
