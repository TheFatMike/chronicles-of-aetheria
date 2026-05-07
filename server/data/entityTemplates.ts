
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
  lootTable: { itemId: string; chance: number }[];
}

export const ENTITY_TEMPLATES: Record<string, EntityTemplate> = {
  slime: {
    id: 'slime',
    name: 'Marsh Slime',
    class: 'Slime',
    type: 'enemy',
    baseStats: { strength: 5, dexterity: 5, wisdom: 1, intelligence: 1, stamina: 10 },
    aggroRadius: 8,
    attackRadius: 1.5,
    leashRadius: 15,
    moveSpeed: 0.03,
    respawnTime: 15,
    lootTable: [
      { itemId: 'gold_coin', chance: 1.0 },
      { itemId: 'slime_goo', chance: 0.8 }
    ]
  },
  wolf: {
    id: 'wolf',
    name: 'Forest Wolf',
    class: 'Wolf',
    type: 'enemy',
    baseStats: { strength: 12, dexterity: 15, wisdom: 5, intelligence: 5, stamina: 12 },
    aggroRadius: 12,
    attackRadius: 2.0,
    leashRadius: 20,
    moveSpeed: 0.07,
    respawnTime: 20,
    lootTable: [
      { itemId: 'gold_coin', chance: 1.0 },
      { itemId: 'wolf_pelt', chance: 0.5 }
    ]
  },
  guard: {
    id: 'guard',
    name: 'Guard Captain',
    class: 'Guard',
    type: 'npc',
    baseStats: { strength: 50, dexterity: 30, wisdom: 20, intelligence: 20, stamina: 100 },
    aggroRadius: 0, // Friendly
    attackRadius: 2.0,
    leashRadius: 5,
    moveSpeed: 0.05,
    respawnTime: 60,
    lootTable: []
  }
};
