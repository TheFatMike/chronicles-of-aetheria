/**
 * @file src/data/world/templates.ts
 * @description Provides metadata and visual defaults for world object types.
 * Defines scales, icons, and categories for everything from trees to buildings.
 * @importance Essential: Acts as a central library for world object properties used by the renderer and editor.
 */
import { WorldObjectType } from "../../types";

export interface ObjectTemplate {
  type: WorldObjectType;
  scale: number;
  modelUrl?: string;
  category: 'nature' | 'buildings' | 'props' | 'spawners' | 'npcs';
  label: string;
  role?: string;
  color?: string;
  shopId?: string;
}

export const OBJECT_TEMPLATES: Record<string, ObjectTemplate> = {
  tree: {
    type: 'tree',
    scale: 1,
    category: 'nature',
    label: 'Oak Tree'
  },
  rock: {
    type: 'rock',
    scale: 1.5,
    category: 'nature',
    label: 'Gray Rock'
  },
  bush: {
    type: 'bush',
    scale: 1,
    category: 'nature',
    label: 'Shrubbery'
  },
  house: {
    type: 'house',
    scale: 1,
    category: 'buildings',
    label: 'Stone House'
  },
  tent: {
    type: 'tent',
    scale: 0.01,
    category: 'buildings',
    label: 'Nomad Tent',
    modelUrl: 'assets/models/tent.glb'
  },
  tower_base: {
    type: 'tower_base',
    scale: 1,
    category: 'buildings',
    label: 'Watchtower',
    modelUrl: 'assets/models/tower_base.glb'
  },
  fence: {
    type: 'fence',
    scale: 1,
    category: 'props',
    label: 'Wooden Fence'
  },
  campfire: {
    type: 'campfire',
    scale: 1,
    category: 'props',
    label: 'Campfire',
    modelUrl: 'assets/models/campfire.glb'
  },
  barrel: {
    type: 'barrel',
    scale: 1,
    category: 'props',
    label: 'Wooden Barrel'
  },
  well: {
    type: 'well',
    scale: 1,
    category: 'buildings',
    label: 'Village Well'
  },
  signpost: {
    type: 'signpost',
    scale: 1,
    category: 'props',
    label: 'Directional Sign'
  },
  spawner_slime: {
    type: 'spawner_slime',
    scale: 1,
    category: 'spawners',
    label: 'Slime Spawner'
  },
  spawner_wolf: {
    type: 'spawner_wolf',
    scale: 1,
    category: 'spawners',
    label: 'Wolf Spawner'
  },
  spawner_guard: {
    type: 'spawner_guard',
    scale: 1,
    category: 'spawners',
    label: 'Guard Spawner'
  },
  'npc_elder_thorne': { type: 'npc_elder_thorne', label: 'Elder Thorne', role: 'Village Elder', color: '#10b981', category: 'npcs', scale: 1 },
  'npc_merchant_silas': { type: 'npc_merchant_silas', label: 'Merchant Silas', role: 'Merchant', color: '#a855f7', category: 'npcs', scale: 1, shopId: 'general_merchant' },
  'npc_blacksmith_torin': { type: 'npc_blacksmith_torin', label: 'Blacksmith Torin', role: 'Blacksmith', color: '#ef4444', category: 'npcs', scale: 1, shopId: 'blacksmith' },
  'npc_guard_captain': { type: 'npc_guard_captain', label: 'Guard Captain', role: 'Guard Captain', color: '#3b82f6', category: 'npcs', scale: 1 },
  'npc_instructor_kael': { type: 'npc_instructor_kael', label: 'Instructor Kael', role: 'Skill Instructor', color: '#fbbf24', category: 'npcs', scale: 1 },
  'npc_banker': { type: 'npc_banker', label: 'Banker', role: 'Banker', color: '#fbbf24', category: 'npcs', scale: 1 },
};
