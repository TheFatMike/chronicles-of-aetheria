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
  // Future: add physics, sound, interactions here
}

export const OBJECT_TEMPLATES: Record<string, ObjectTemplate> = {
  tree: {
    type: 'tree',
    scale: 1,
  },
  rock: {
    type: 'rock',
    scale: 1.5,
  },
  bush: {
    type: 'bush',
    scale: 1,
  },
  house: {
    type: 'house',
    scale: 1,
  },
  tent: {
    type: 'tent',
    scale: 1.2,
  },
  tower_base: {
    type: 'tower_base',
    scale: 1,
    modelUrl: '/assets/models/tower_base.glb'
  },
  fence: {
    type: 'fence',
    scale: 1,
  },
  campfire: {
    type: 'campfire',
    scale: 1,
  },
  barrel: {
    type: 'barrel',
    scale: 1,
  },
  well: {
    type: 'well',
    scale: 1,
  },
  signpost: {
    type: 'signpost',
    scale: 1,
  },
  spawner_slime: {
    type: 'spawner_slime',
    scale: 1,
  },
  spawner_wolf: {
    type: 'spawner_wolf',
    scale: 1,
  },
  spawner_guard: {
    type: 'spawner_guard',
    scale: 1,
  },
};
