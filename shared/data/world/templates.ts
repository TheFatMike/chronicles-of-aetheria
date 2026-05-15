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
  behaviorType?: 'aggressive' | 'neutral' | 'passive';
}

// Helper for quick GLB registration
const glb = (id: string, label: string, category: ObjectTemplate['category'], scale = 1, modelName?: string): ObjectTemplate => ({
  type: id as WorldObjectType,
  label,
  category,
  scale,
  modelUrl: `/assets/models/${modelName || id}.glb`
});

/**
 * CUSTOM GLB MODELS
 * Add new .glb files here! Just drop the file in public/assets/models/
 * and add a line using the glb() helper below.
 */
const CUSTOM_GLB_MODELS: Record<string, ObjectTemplate> = {
  tent: glb('tent', 'Nomad Tent', 'buildings', 0.01),
  tower_base: glb('tower_base', 'Watchtower', 'buildings', 1),
  campfire: glb('campfire', 'Campfire', 'props', 1),
};

export const OBJECT_TEMPLATES: Record<string, ObjectTemplate> = {
  // Procedural / Custom Components
  tree: { type: 'tree', scale: 1, category: 'nature', label: 'Oak Tree' },
  rock: { type: 'rock', scale: 1.5, category: 'nature', label: 'Gray Rock' },
  bush: { type: 'bush', scale: 1, category: 'nature', label: 'Shrubbery' },
  house: { type: 'house', scale: 1, category: 'buildings', label: 'Stone House' },
  fence: { type: 'fence', scale: 1, category: 'props', label: 'Wooden Fence' },
  barrel: { type: 'barrel', scale: 1, category: 'props', label: 'Wooden Barrel' },
  well: { type: 'well', scale: 1, category: 'buildings', label: 'Village Well' },
  signpost: { type: 'signpost', scale: 1, category: 'props', label: 'Directional Sign' },
  teleport_crystal: { type: 'teleport_crystal', scale: 1, category: 'props', label: 'Teleport Crystal' },
  water_plane: { type: 'water_plane', scale: 20, category: 'nature', label: 'Water Plane' },
  waterfall: { type: 'waterfall', scale: 10, category: 'nature', label: 'Waterfall' },
  water_source: { type: 'water_source', scale: 1, category: 'nature', label: 'Water Source (Fill Basin)' },
  
  // Spread in the custom GLB models
  ...CUSTOM_GLB_MODELS,
  
  // Spawners
  spawner_slime: { type: 'spawner_slime', scale: 1, category: 'spawners', label: 'Slime Spawner' },
  spawner_wolf: { type: 'spawner_wolf', scale: 1, category: 'spawners', label: 'Wolf Spawner' },

  // NPCs
  'npc_elder_thorne': { type: 'npc_elder_thorne', label: 'Elder Thorne', role: 'Village Elder', color: '#10b981', category: 'npcs', scale: 1, behaviorType: 'passive' },
  'npc_merchant_silas': { type: 'npc_merchant_silas', label: 'Merchant Silas', role: 'Merchant', color: '#a855f7', category: 'npcs', scale: 1, shopId: 'general_merchant', behaviorType: 'passive' },
  'npc_blacksmith_torin': { type: 'npc_blacksmith_torin', label: 'Blacksmith Torin', role: 'Blacksmith', color: '#ef4444', category: 'npcs', scale: 1, shopId: 'blacksmith', behaviorType: 'passive' },
  'npc_guard_captain': { type: 'npc_guard_captain', label: 'Guard Captain', role: 'Guard Captain', color: '#3b82f6', category: 'npcs', scale: 1, behaviorType: 'neutral' },
  'npc_instructor_kael': { type: 'npc_instructor_kael', label: 'Instructor Kael', role: 'Skill Instructor', color: '#fbbf24', category: 'npcs', scale: 1, behaviorType: 'passive' },
  'npc_banker': { type: 'npc_banker', label: 'Banker', role: 'Banker', color: '#fbbf24', category: 'npcs', scale: 1, behaviorType: 'passive' },
  'npc_farmer_bob': { type: 'npc_farmer_bob', label: 'Farmer Bob', role: 'Farmer', color: '#f97316', category: 'npcs', scale: 1, behaviorType: 'passive' },
};
