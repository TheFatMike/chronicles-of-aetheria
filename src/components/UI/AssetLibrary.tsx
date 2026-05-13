import React, { useState, useMemo } from 'react';
import { Search, Trees, Home, Box, Skull, Mountain, Trash2, MousePointer2, Grid, Settings2, Info, MapPin, Users, Package, Activity } from 'lucide-react';
import { OBJECT_TEMPLATES } from "@shared/data/world/templates";
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { id: 'tools', label: 'Basics', icon: MousePointer2 },
  { id: 'terrain', label: 'Terrain', icon: Mountain },
  { id: 'nature', label: 'Nature', icon: Trees },
  { id: 'npcs', label: 'NPCs', icon: Users },
  { id: 'buildings', label: 'Architecture', icon: Home },
  { id: 'props', label: 'Props', icon: Package },
  { id: 'spawners', label: 'Gameplay', icon: Activity },
];

const TERRAIN_TOOLS = [
  { id: 'terrain_raise', label: 'Raise Ground', category: 'terrain' },
  { id: 'terrain_lower', label: 'Lower Ground', category: 'terrain' },
  { id: 'terrain_flatten', label: 'Flatten Floor', category: 'terrain' },
  { id: 'terrain_paint_grass', label: 'Paint Grass', category: 'terrain' },
  { id: 'terrain_paint_dirt', label: 'Paint Dirt', category: 'terrain' },
  { id: 'terrain_paint_stone', label: 'Paint Stone', category: 'terrain' },
  { id: 'terrain_paint_sand', label: 'Paint Sand', category: 'terrain' },
];

export const AssetLibrary = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('tools');
  
  const {
    selectedType,
    setSelectedType,
    gridSnap,
    setGridSnap,
    brushSize,
    setBrushSize,
    brushStrength,
    setBrushStrength,
  } = useGameStore(useShallow(s => ({
    selectedType: s.editorSelectedType,
    setSelectedType: s.setEditorSelectedType,
    gridSnap: s.gridSnap,
    setGridSnap: s.setGridSnap,
    brushSize: s.editorBrushSize,
    setBrushSize: s.setEditorBrushSize,
    brushStrength: s.editorBrushStrength,
    setBrushStrength: s.setEditorBrushStrength,
  })));

  const items = useMemo(() => {
    const allItems = [
      ...TERRAIN_TOOLS,
      ...Object.entries(OBJECT_TEMPLATES).map(([id, t]) => ({
        id,
        label: t.label,
        category: t.category,
      }))
    ];

    return allItems.filter(item => {
      const matchesSearch = item.label.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  const isTerrainTool = selectedType?.startsWith('terrain_');

  return (
    <motion.div 
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="fixed left-8 top-[15vh] flex flex-col h-[70vh] bg-[#1a140f]/95 border-4 border-[#4a3a2a] text-[#f4e4bc] w-80 rounded-xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto"
    >
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
      {/* Header & Global Tools */}
      <div className="p-6 border-b border-white/5 bg-linear-to-b from-slate-900/50 to-transparent space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c2a472]/10 border border-[#c2a472]/20 flex items-center justify-center">
              <Settings2 size={18} className="text-[#c2a472]" />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#c2a472] relative z-10">
                World Studio
              </h2>
              <p className="text-[9px] text-[#8b6b4d] font-bold uppercase tracking-wider relative z-10">Asset Palette</p>
            </div>
          </div>
          
          <button 
            onClick={() => setGridSnap(!gridSnap)}
            className={`p-2.5 rounded-xl transition-all duration-300 ${
              gridSnap 
                ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                : 'bg-slate-900/50 text-slate-500 hover:text-white ring-1 ring-white/5'
            }`}
            title="Toggle Grid Snap"
          >
            <Grid size={18} />
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setSelectedType(null)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black transition-all duration-300 border-2 relative z-10 ${
              selectedType === null 
                ? 'bg-[#c2a472] text-[#1a140f] border-[#f4e4bc]/30 shadow-lg' 
                : 'bg-black/40 text-[#8b6b4d] hover:bg-black/60 border-[#4a3a2a]'
            }`}
          >
            <MousePointer2 size={14} strokeWidth={3} /> SELECT
          </button>
          <button 
            onClick={() => setSelectedType('delete')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black transition-all duration-300 border-2 relative z-10 ${
              selectedType === 'delete' 
                ? 'bg-rose-900/80 text-white border-rose-500/50 shadow-lg' 
                : 'bg-black/40 text-[#8b6b4d] hover:bg-black/60 border-[#4a3a2a]'
            }`}
          >
            <Trash2 size={14} strokeWidth={3} /> DELETE
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            placeholder="SEARCH ASSETS..."
            className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-bold tracking-wider placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 p-3 bg-white/2 border-b border-white/5 overflow-x-auto no-scrollbar">
        {CATEGORIES.filter(c => c.id !== 'tools').map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap text-[9px] font-black uppercase tracking-widest border-2 relative z-10 ${
              activeCategory === cat.id 
                ? 'bg-[#c2a472] text-[#1a140f] border-[#f4e4bc]/30 shadow-md' 
                : 'bg-black/40 text-[#8b6b4d] hover:text-[#f4e4bc] border-[#4a3a2a]'
            }`}
          >
            <cat.icon size={14} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-linear-to-b from-transparent to-black/20">
        <div className="grid grid-cols-1 gap-2">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedType(item.id as any)}
              className={`flex items-center gap-4 p-3.5 rounded-xl transition-all duration-300 border-2 group relative z-10 ${
                selectedType === item.id
                  ? 'bg-[#c2a472]/20 border-[#c2a472]/50 text-[#f4e4bc] shadow-[0_0_20px_rgba(194,164,114,0.15)]'
                  : 'bg-black/20 border-[#4a3a2a]/30 text-[#8b6b4d] hover:bg-black/40 hover:border-[#4a3a2a] hover:text-[#f4e4bc]'
              }`}
            >
              <div className={`p-2.5 rounded-lg transition-colors ${selectedType === item.id ? 'bg-[#c2a472] text-[#1a140f]' : 'bg-black/40 text-[#8b6b4d] group-hover:bg-black/60 group-hover:text-[#c2a472]'}`}>
                {item.category === 'terrain' ? <Mountain size={16} /> : 
                 item.category === 'nature' ? <Trees size={16} /> :
                 item.category === 'npcs' ? <Users size={16} /> :
                 item.category === 'buildings' ? <Home size={16} /> :
                 item.category === 'props' ? <Package size={16} /> :
                 item.category === 'spawners' ? <Activity size={16} /> :
                 <Box size={16} />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
          {items.length === 0 && (
            <div className="text-center py-12 flex flex-col items-center gap-3 opacity-30">
              <Info size={32} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Empty Library</p>
            </div>
          )}
        </div>

        {/* Dynamic Settings */}
        <AnimatePresence>
          {isTerrainTool && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-black/40 border-2 border-[#4a3a2a] rounded-xl space-y-5 overflow-hidden relative z-10"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#c2a472] animate-pulse" />
                <span className="text-[9px] text-[#c2a472] uppercase font-black tracking-widest">Brush Configuration</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-[8px] uppercase font-black tracking-widest text-[#8b6b4d]">
                  <span>Size</span>
                  <span className="text-[#c2a472]">{brushSize}m</span>
                </div>
                <input 
                  type="range" min="2" max="40" step="1"
                  value={brushSize} 
                  onChange={(e) => setBrushSize(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-[#c2a472] border border-[#4a3a2a]"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-[8px] uppercase font-black tracking-widest text-[#8b6b4d]">
                  <span>Strength</span>
                  <span className="text-[#c2a472]">{(brushStrength * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0.1" max="2" step="0.1"
                  value={brushStrength} 
                  onChange={(e) => setBrushStrength(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-[#c2a472] border border-[#4a3a2a]"
                />
              </div>
            </motion.div>
          )}

          {selectedType === 'waypoint' && (
             <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-4 overflow-hidden"
             >
               <div className="flex items-center gap-2 mb-2">
                <MapPin size={14} className="text-emerald-500" />
                <span className="text-[9px] text-emerald-400 uppercase font-black tracking-widest">Pathing Workspace</span>
              </div>
              <p className="text-[8px] text-slate-500 italic">Waypoints will be linked to the path defined in your inspector.</p>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="p-5 bg-black/40 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${selectedType ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            {selectedType ? `Active: ${selectedType.replace(/_/g, ' ')}` : 'Ready'}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <Info size={12} />
          <span className="text-[8px] font-black uppercase tracking-widest">Alpha v1.3</span>
        </div>
      </div>
    </motion.div>
  );
};
