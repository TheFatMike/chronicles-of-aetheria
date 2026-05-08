
export interface LootEntry {
  itemId: string;
  chance: number; // 0.0 to 1.0
  minQuantity?: number;
  maxQuantity?: number;
}

export interface LootTable {
  items: LootEntry[];
  minGold: number;
  maxGold: number;
  goldChance: number; // 0.0 to 1.0
}

export const LOOT_TABLES: Record<string, LootTable> = {
  slime: {
    items: [
      { itemId: 'slime_goo', chance: 0.8 },
      { itemId: 'health-potion', chance: 0.05 }
    ],
    minGold: 5,
    maxGold: 12,
    goldChance: 1.0
  },
  wolf: {
    items: [
      { itemId: 'wolf_pelt', chance: 0.5 },
      { itemId: 'iron-sword', chance: 0.01 }
    ],
    minGold: 15,
    maxGold: 35,
    goldChance: 1.0
  },
  guard: { items: [], minGold: 0, maxGold: 0, goldChance: 0 },
  instructor_kael: { items: [], minGold: 0, maxGold: 0, goldChance: 0 },
  goblin: {
    items: [
      { itemId: 'rusty-dagger', chance: 0.1 },
      { itemId: 'iron-sword', chance: 0.05 }
    ],
    minGold: 10,
    maxGold: 25,
    goldChance: 0.7
  },
  skeleton: {
    items: [
      { itemId: 'iron-helm', chance: 0.05 },
      { itemId: 'iron-greaves', chance: 0.05 }
    ],
    minGold: 12,
    maxGold: 30,
    goldChance: 0.5
  }
};
