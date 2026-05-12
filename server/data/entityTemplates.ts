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
  baseStats: {
    strength: number;
    dexterity: number;
    wisdom: number;
    intelligence: number;
    stamina: number;
  };
  aggroRadius: number;
  attackRadius: number;
  leashRadius: number;
  moveSpeed: number;
  respawnTime: number;
  level?: number;
  expReward: number;
  lootTable: LootTable; 
  modelUrl?: string;
  color?: string;
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
    leashRadius: 12,
    moveSpeed: 0.03,
    respawnTime: 15,
    expReward: 15,
    lootTable: LOOT_TABLES.slime
  },
  wolf: {
    id: 'wolf',
    name: 'Forest Wolf',
    class: 'Wolf',
    type: 'enemy',
    baseStats: { strength: 10, dexterity: 12, wisdom: 5, intelligence: 5, stamina: 15 },
    aggroRadius: 10,
    attackRadius: 2.0,
    leashRadius: 18,
    moveSpeed: 0.06,
    respawnTime: 20,
    expReward: 45,
    lootTable: LOOT_TABLES.wolf
  },
  guard: {
    id: 'guard',
    name: 'Guard Captain',
    class: 'Guard',
    type: 'npc',
    baseStats: { strength: 50, dexterity: 30, wisdom: 20, intelligence: 20, stamina: 100 },
    aggroRadius: 0,
    attackRadius: 2.0,
    leashRadius: 5,
    moveSpeed: 0.05,
    respawnTime: 60,
    expReward: 0,
    lootTable: LOOT_TABLES.guard
  },
  instructor_kael: {
    id: 'instructor_kael',
    name: 'Instructor Kael',
    class: 'Instructor',
    type: 'npc',
    baseStats: { strength: 100, dexterity: 100, wisdom: 100, intelligence: 100, stamina: 500 },
    aggroRadius: 0,
    attackRadius: 2.0,
    leashRadius: 5,
    moveSpeed: 0,
    respawnTime: 10,
    expReward: 0,
    lootTable: LOOT_TABLES.instructor_kael
  },
  elder_thorne: {
    id: 'elder_thorne',
    name: 'Elder Thorne',
    class: 'Elder',
    type: 'npc',
    baseStats: { strength: 10, dexterity: 10, wisdom: 80, intelligence: 70, stamina: 50 },
    aggroRadius: 0,
    attackRadius: 2.0,
    leashRadius: 5,
    moveSpeed: 0,
    respawnTime: 10,
    expReward: 0,
    lootTable: LOOT_TABLES.guard
  },
  merchant_silas: {
    id: 'merchant_silas',
    name: 'Merchant Silas',
    class: 'Merchant',
    type: 'npc',
    baseStats: { strength: 15, dexterity: 20, wisdom: 40, intelligence: 50, stamina: 60 },
    aggroRadius: 0,
    attackRadius: 2.0,
    leashRadius: 5,
    moveSpeed: 0,
    respawnTime: 10,
    expReward: 0,
    lootTable: LOOT_TABLES.guard
  },
  blacksmith_torin: {
    id: 'blacksmith_torin',
    name: 'Blacksmith Torin',
    class: 'Blacksmith',
    type: 'npc',
    baseStats: { strength: 60, dexterity: 30, wisdom: 20, intelligence: 20, stamina: 90 },
    aggroRadius: 0,
    attackRadius: 2.0,
    leashRadius: 5,
    moveSpeed: 0,
    respawnTime: 10,
    expReward: 0,
    lootTable: LOOT_TABLES.guard
  },
  banker: {
    id: 'banker',
    name: 'Banker',
    class: 'Banker',
    type: 'npc',
    baseStats: { strength: 10, dexterity: 10, wisdom: 50, intelligence: 80, stamina: 40 },
    aggroRadius: 0,
    attackRadius: 2.0,
    leashRadius: 5,
    moveSpeed: 0,
    respawnTime: 10,
    expReward: 0,
    lootTable: LOOT_TABLES.guard
  }
};
