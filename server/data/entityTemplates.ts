/**
 * @file server/data/entityTemplates.ts
 * @description Authoritative templates for all non-player entities.
 * Defines base stats, behaviors, and loot table associations for NPCs and enemies.
 * @importance Essential: The definitive source of truth for entity properties on the server.
 */
import { LOOT_TABLES, LootTable } from "./lootTables";

export interface EntityTemplate {
  id: string;
  name: string;
  class: string;
  type: 'enemy' | 'npc' | 'neutral';
  baseStats?: {
    strength: number;
    dexterity: number;
    wisdom: number;
    intelligence: number;
    stamina: number;
  };
  aggroRadius?: number;
  attackRadius?: number;
  leashRadius?: number;
  moveSpeed?: number;
  respawnTime?: number;
  level?: number;
  expReward?: number;
  lootTable?: LootTable;
  modelUrl?: string;
  color?: string;
  behaviorType?: 'aggressive' | 'neutral' | 'passive';
  minDamage?: number;
  maxDamage?: number;
  attackSpeed?: number; // in seconds
}

export const ENTITY_TEMPLATES: Record<string, EntityTemplate> = {
  slime: {
    id: 'slime',
    name: 'Marsh Slime',
    class: 'Slime',
    type: 'enemy',
    baseStats: { strength: 4, dexterity: 3, wisdom: 1, intelligence: 1, stamina: 8 },
    aggroRadius: 6,
    attackRadius: 1.5,
    leashRadius: 30,
    moveSpeed: 2.5,
    respawnTime: 15,
    expReward: 15,
    lootTable: LOOT_TABLES.slime,
    behaviorType: 'neutral',
    minDamage: 2,
    maxDamage: 5,
    attackSpeed: 2.0
  },
  wolf: {
    id: 'wolf',
    name: 'Forest Wolf',
    class: 'Wolf',
    type: 'enemy',
    baseStats: { strength: 10, dexterity: 12, wisdom: 5, intelligence: 5, stamina: 15 },
    aggroRadius: 10,
    attackRadius: 2.0,
    leashRadius: 40,
    moveSpeed: 4.8,
    respawnTime: 20,
    expReward: 45,
    lootTable: LOOT_TABLES.wolf,
    behaviorType: 'aggressive',
    minDamage: 8,
    maxDamage: 14,
    attackSpeed: 1.5
  },
  guard: {
    id: 'guard',
    name: 'Guard Captain',
    class: 'Guard',
    type: 'npc',
    moveSpeed: 0.05,
    respawnTime: 60,
  },
  instructor_kael: {
    id: 'instructor_kael',
    name: 'Instructor Kael',
    class: 'Instructor',
    type: 'npc',
    moveSpeed: 0,
    respawnTime: 10,
  },
  elder_thorne: {
    id: 'elder_thorne',
    name: 'Elder Thorne',
    class: 'Elder',
    type: 'npc',
    moveSpeed: 0,
    respawnTime: 10,
  },
  merchant_silas: {
    id: 'merchant_silas',
    name: 'Merchant Silas',
    class: 'Merchant',
    type: 'npc',
    moveSpeed: 0,
    respawnTime: 10,
  },
  blacksmith_torin: {
    id: 'blacksmith_torin',
    name: 'Blacksmith Torin',
    class: 'Blacksmith',
    type: 'npc',
    moveSpeed: 0,
    respawnTime: 10,
  },
  banker: {
    id: 'banker',
    name: 'Banker',
    class: 'Banker',
    type: 'npc',
    moveSpeed: 0,
    respawnTime: 10,
  },
  farmer_bob: {
    id: 'farmer_bob',
    name: 'Farmer Bob',
    class: 'Farmer',
    type: 'npc',
    moveSpeed: 0,
    respawnTime: 10,
  }
};
