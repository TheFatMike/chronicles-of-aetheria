/**
 * @file src/components/UI/EditorOutliner.tsx
 * @description Provides a hierarchical view of all objects in the current scene.
 * Facilitates searching, selecting, and organizing world entities from a list.
 * @importance Essential: Vital for managing complex scenes with many overlapping or distant objects.
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { List, Search, Target, Trash2, MapPin, TreePine, Home, MousePointer2, Ghost } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';

const TYPE_ICONS: Record<string, any> = {
  tree: <TreePine size={12} />,
  rock: <Ghost size={12} />,
  house: <Home size={12} />,
  tent: <Home size={12} />,
  npc: <MousePointer2 size={12} />,
  waypoint: <MapPin size={12} />,
  spawner: <Target size={12} />,
};

export const EditorOutliner = ({ socket }: { socket: any }) => {
  const worldObjects = useGameStore(state => state.worldObjects);
  const objectList = useMemo(() => Object.values(worldObjects), [worldObjects]);
  const selectedId = useGameStore(state => state.selectedWorldObjectId);
  const setSelectedId = useGameStore(state => state.setSelectedWorldObjectId);
  const [search, setSearch] = useState('');

  const filteredObjects = useMemo(() => {
    return objectList.filter(obj => 
      obj.type.toLowerCase().includes(search.toLowerCase()) || 
      obj.id.toLowerCase().includes(search.toLowerCase()) ||
      obj.pathId?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.type.localeCompare(b.type));
  }, [objectList, search]);

  const handleFocus = (obj: any) => {
    setSelectedId(obj.id);
    // Dispatch focus event
    const event = new KeyboardEvent('keydown', { code: 'KeyF' });
    window.dispatchEvent(event);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="pointer-events-auto fixed left-80 ml-4 top-[15vh] w-64 bg-[#1a140f]/95 border-4 border-[#4a3a2a] rounded-xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md overflow-hidden flex flex-col h-[70vh]"
    >
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] pointer-events-none" />
      <div className="bg-slate-900/50 p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <List size={18} className="text-blue-500" />
          <h3 className="text-white font-bold text-xs uppercase tracking-widest">Outliner</h3>
          <span className="ml-auto text-[9px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            {objectList.length}
          </span>
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Search scene..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 text-white text-[10px] pl-8 pr-3 py-2 rounded-lg border border-slate-800 outline-none focus:border-blue-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filteredObjects.length === 0 ? (
          <div className="py-10 text-center space-y-2 opacity-30">
            <Ghost size={24} className="mx-auto" />
            <span className="text-[9px] uppercase font-bold">No Objects Found</span>
          </div>
        ) : (
          filteredObjects.map((obj: any) => (
            <div 
              key={obj.id}
              onClick={() => setSelectedId(obj.id)}
              className={`group flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer border relative z-10 ${
                selectedId === obj.id 
                  ? 'bg-[#c2a472]/20 border-[#c2a472]/50' 
                  : 'border-transparent hover:bg-black/30'
              }`}
            >
              <div className={`p-1.5 rounded-md ${selectedId === obj.id ? 'bg-[#c2a472] text-[#1a140f]' : 'bg-black/40 text-[#8b6b4d] group-hover:text-[#c2a472]'}`}>
                {TYPE_ICONS[obj.type] || <Ghost size={12} />}
              </div>
              
              <div className="flex flex-col min-w-0">
                <span className={`text-[9px] font-black uppercase truncate ${selectedId === obj.id ? 'text-[#f4e4bc]' : 'text-[#8b6b4d]'}`}>
                  {obj.type.replace(/_/g, ' ')}
                </span>
                <span className="text-[7px] text-[#8b6b4d]/60 font-mono truncate">{obj.id.slice(0, 8)}...</span>
              </div>

              <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleFocus(obj); }}
                  className="p-1 hover:text-blue-400 text-slate-500"
                >
                  <Target size={12} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); useGameStore.getState().markObjectDeleted(obj.id); }}
                  className="p-1 hover:text-red-400 text-slate-500"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};
