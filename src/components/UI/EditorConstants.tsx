/**
 * @file src/components/UI/EditorConstants.tsx
 * @description Centralized configuration and asset definitions for the world editor.
 * Defines object categories, icons, and template mappings used in the editor UI.
 * @importance Essential: Provides a structured data source for the world editor's interface and tools.
 */
import React from 'react';
import { TreePine, Home, MousePointer2, Droplets, Target, Mountain, Flower2, Fence as FenceIcon, Flame, Container, Briefcase, MapPin, Tent } from 'lucide-react';

export const CATEGORIES = [
  { id: 'nature', icon: <TreePine size={16} />, label: 'Nature', items: ['tree', 'rock', 'bush', 'flower'] },
  { id: 'town', icon: <Home size={16} />, label: 'Town', items: ['house', 'tent', 'tower_base', 'fence', 'signpost', 'barrel'] },
  { id: 'npcs', icon: <MousePointer2 size={16} />, label: 'NPCs', items: ['npc_instructor_kael', 'npc_guard_captain'] },
  { id: 'props', icon: <Droplets size={16} />, label: 'Props', items: ['campfire', 'chest', 'dummy', 'well'] },
  { id: 'systems', icon: <Target size={16} />, label: 'Systems', items: ['spawner_slime', 'spawner_wolf', 'spawner_guard', 'spawner_instructor_kael', 'waypoint'] },
  { id: 'terrain', icon: <Mountain size={16} />, label: 'Terrain', items: ['terrain_raise', 'terrain_lower', 'terrain_flatten', 'terrain_paint_grass', 'terrain_paint_dirt', 'terrain_paint_stone', 'terrain_paint_sand'] },
];

export const ICON_MAP: Record<string, any> = {
  'tree': <TreePine size={20} />,
  'rock': <Mountain size={20} />,
  'house': <Home size={20} />,
  'tent': <Tent size={20} />,
  'tower_base': <Mountain size={20} className="text-slate-400" />,
  'bush': <Flower2 size={20} />,
  'flower': <Flower2 size={20} className="text-pink-500" />,
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
  'terrain_raise': <div className="text-xs font-black text-emerald-500">↑</div>,
  'terrain_lower': <div className="text-xs font-black text-rose-500">↓</div>,
  'terrain_flatten': <div className="text-xs font-black text-blue-500">_</div>,
  'terrain_paint_grass': <div className="w-4 h-4 bg-green-600 rounded-sm" />,
  'terrain_paint_dirt': <div className="w-4 h-4 bg-amber-900 rounded-sm" />,
  'terrain_paint_stone': <div className="w-4 h-4 bg-gray-600 rounded-sm" />,
  'terrain_paint_sand': <div className="w-4 h-4 bg-yellow-200 rounded-sm" />,
};
