import React from 'react';
import { TreePine, Home, MousePointer2, Droplets, Target, Mountain, Flower2, Fence as FenceIcon, Flame, Container, Briefcase, MapPin } from 'lucide-react';

export const CATEGORIES = [
  { id: 'nature', icon: <TreePine size={16} />, label: 'Nature', items: ['tree', 'rock', 'bush', 'flower'] },
  { id: 'town', icon: <Home size={16} />, label: 'Town', items: ['house', 'tent', 'tower_base', 'fence', 'signpost', 'barrel'] },
  { id: 'npcs', icon: <MousePointer2 size={16} />, label: 'NPCs', items: ['npc_instructor_kael', 'npc_guard_captain'] },
  { id: 'props', icon: <Droplets size={16} />, label: 'Props', items: ['campfire', 'chest', 'dummy', 'well'] },
  { id: 'systems', icon: <Target size={16} />, label: 'Systems', items: ['spawner_slime', 'spawner_wolf', 'spawner_guard', 'spawner_instructor_kael', 'waypoint'] },
];

export const ICON_MAP: Record<string, any> = {
  'tree': <TreePine size={20} />,
  'rock': <Mountain size={20} />,
  'house': <Home size={20} />,
  'tent': <TentIcon size={20} />,
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
};

function TentIcon({ size, className }: { size: number, className?: string }) {
  return <Home size={size} className={className} />; // Fallback since Tent might be missing in some lucide versions
}
