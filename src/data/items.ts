/**
 * @file src/data/items.ts
 * @description Centralized database for all game items including weapons, armor, and consumables.
 */
import { InventoryItem } from "../types";

export const ITEMS: Record<string, InventoryItem> = {
  "iron-sword": {
    id: "iron-sword",
    itemId: "iron-sword",
    name: "Iron Sword",
    type: "weapon",
    rarity: "common",
    description: "A simple sword forged from iron. It's better than nothing.",
    icon: "Sword",
    stats: { strength: 2 },
    stackable: false
  },
  "wooden-staff": {
    id: "wooden-staff",
    itemId: "wooden-staff",
    name: "Wooden Staff",
    type: "weapon",
    rarity: "common",
    description: "A sturdy wooden staff, favored by novice mages.",
    icon: "Wand",
    stats: { intelligence: 2 },
    stackable: false
  },
  "health-potion": {
    id: "health-potion",
    itemId: "health-potion",
    name: "Health Potion",
    type: "consumable",
    rarity: "common",
    description: "Restores 50 Health.",
    icon: "FlaskConical",
    stackable: true,
    maxStack: 20
  },
  "mana-potion": {
    id: "mana-potion",
    itemId: "mana-potion",
    name: "Mana Potion",
    type: "consumable",
    rarity: "common",
    description: "Restores 30 Mana.",
    icon: "FlaskConical",
    stackable: true,
    maxStack: 20
  },
  "slime_goo": {
    id: "slime_goo",
    itemId: "slime_goo",
    name: "Slime Goo",
    type: "material",
    rarity: "common",
    description: "A sticky substance left behind by slimes. Smells funny.",
    icon: "Droplets",
    stackable: true,
    maxStack: 100
  },
  "leather-tunic": {
    id: "leather-tunic",
    itemId: "leather-tunic",
    name: "Leather Tunic",
    type: "chest",
    rarity: "common",
    description: "Basic protection made from cured leather.",
    icon: "Shirt",
    stats: { stamina: 1 },
    stackable: false
  },
  "old-ring": {
    id: "old-ring",
    itemId: "old-ring",
    name: "Old Ring",
    type: "accessory",
    rarity: "uncommon",
    description: "A tarnished ring with a faint magical hum.",
    icon: "Circle",
    stats: { wisdom: 1 },
    stackable: false
  }
};
