/**
 * @file server/data/items.ts
 * @description Authoritative definitions for all game items.
 * Includes stats, requirements, and metadata for weapons, armor, and consumables.
 * @importance Essential: The primary source of truth for item data used by the server's inventory and combat systems.
 */
import { InventoryItem, ItemType, ItemRarity } from "../../shared/types";

export interface ItemTemplate {
  itemId: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  icon: string;
  stats?: any;
  twoHanded?: boolean;
  stackable?: boolean;
  maxStack?: number;
}

export const ITEM_REGISTRY: Record<string, ItemTemplate> = {
  // WEAPONS - SWORDS
  "iron-sword": {
    itemId: "iron-sword",
    name: "Iron Sword",
    type: "weapon",
    rarity: "common",
    description: "A standard-issue iron sword. Heavy but reliable.",
    icon: "Sword",
    stats: { strength: 2 }
  },
  "greatsword": {
    itemId: "greatsword",
    name: "Greatsword",
    type: "weapon",
    rarity: "uncommon",
    description: "A massive blade that requires both hands to wield.",
    icon: "Sword",
    twoHanded: true,
    stats: { strength: 12 }
  },
  "training-sword": {
    itemId: "training-sword",
    name: "Training Sword",
    type: "weapon",
    rarity: "common",
    description: "A blunt iron sword used by recruits.",
    icon: "Sword",
    stats: { strength: 1 }
  },

  // WEAPONS - STAFFS
  "apprentice-staff": {
    itemId: "apprentice-staff",
    name: "Apprentice Staff",
    type: "weapon",
    rarity: "common",
    description: "A simple wooden staff etched with minor runes.",
    icon: "Wand",
    twoHanded: true,
    stats: { intelligence: 3, wisdom: 1 }
  },

  // WEAPONS - BOWS
  "short-bow": {
    itemId: "short-bow",
    name: "Short Bow",
    type: "weapon",
    rarity: "common",
    description: "A flexible wooden bow. Light and easy to use.",
    icon: "Target",
    twoHanded: true,
    stats: { dexterity: 2 }
  },

  // WEAPONS - DAGGERS
  "rusty-dagger": {
    itemId: "rusty-dagger",
    name: "Rusty Dagger",
    type: "weapon",
    rarity: "common",
    description: "A small, chipped blade. Still sharp enough.",
    icon: "Sword",
    stats: { dexterity: 1 }
  },

  // OFFHAND
  "wooden-shield": {
    itemId: "wooden-shield",
    name: "Wooden Shield",
    type: "offhand",
    rarity: "common",
    description: "A solid wooden shield. Blocks incoming damage.",
    icon: "Shield",
    stats: { stamina: 3 }
  },
  "crude-buckler": {
    itemId: "crude-buckler",
    name: "Crude Buckler",
    type: "offhand",
    rarity: "common",
    description: "A small metal shield for parrying.",
    icon: "Shield",
    stats: { stamina: 1, dexterity: 1 }
  },

  // ARMOR - CLOTH (Mage/Priest)
  "cloth-cap": {
    itemId: "cloth-cap",
    name: "Cloth Cap",
    type: "head",
    rarity: "common",
    description: "A soft cap made of linen.",
    icon: "Shield",
    stats: { intelligence: 1 }
  },
  "cloth-tunic": {
    itemId: "cloth-tunic",
    name: "Cloth Tunic",
    type: "chest",
    rarity: "common",
    description: "Simple clothing that offers minimal protection.",
    icon: "Shirt",
    stats: { stamina: 2 }
  },
  "cloth-pants": {
    itemId: "cloth-pants",
    name: "Cloth Pants",
    type: "legs",
    rarity: "common",
    description: "Comfortable linen trousers.",
    icon: "Shield",
    stats: { intelligence: 1 }
  },
  "cloth-shoes": {
    itemId: "cloth-shoes",
    name: "Cloth Shoes",
    type: "boots",
    rarity: "common",
    description: "Lightweight shoes for quiet movement.",
    icon: "Footprints",
    stats: { dexterity: 1 }
  },

  // ARMOR - LEATHER (Ranger/Rogue)
  "leather-cap": {
    itemId: "leather-cap",
    name: "Leather Cap",
    type: "head",
    rarity: "common",
    description: "A basic cap made of cured leather.",
    icon: "Shield",
    stats: { stamina: 1 }
  },
  "leather-vest": {
    itemId: "leather-vest",
    name: "Leather Vest",
    type: "chest",
    rarity: "common",
    description: "Reinforced leather to protect the vitals.",
    icon: "Shirt",
    stats: { stamina: 4 }
  },
  "leather-leggings": {
    itemId: "leather-leggings",
    name: "Leather Leggings",
    type: "legs",
    rarity: "common",
    description: "Flexible leather protection for the legs.",
    icon: "Shield",
    stats: { stamina: 2, dexterity: 1 }
  },
  "leather-boots": {
    itemId: "leather-boots",
    name: "Leather Boots",
    type: "boots",
    rarity: "common",
    description: "Sturdy boots for a long journey.",
    icon: "Footprints",
    stats: { dexterity: 1 }
  },

  // ARMOR - PLATE (Warrior/Paladin)
  "iron-helm": {
    itemId: "iron-helm",
    name: "Iron Helm",
    type: "head",
    rarity: "common",
    description: "A heavy iron helmet.",
    icon: "Shield",
    stats: { stamina: 3 }
  },
  "iron-breastplate": {
    itemId: "iron-breastplate",
    name: "Iron Breastplate",
    type: "chest",
    rarity: "common",
    description: "A solid plate of iron.",
    icon: "Shirt",
    stats: { stamina: 8 }
  },
  "iron-greaves": {
    itemId: "iron-greaves",
    name: "Iron Greaves",
    type: "legs",
    rarity: "common",
    description: "Iron protection for the legs.",
    icon: "Shield",
    stats: { stamina: 4 }
  },
  "iron-boots": {
    itemId: "iron-boots",
    name: "Iron Boots",
    type: "boots",
    rarity: "common",
    description: "Heavy iron-toed boots.",
    icon: "Footprints",
    stats: { stamina: 2 }
  },

  // CONSUMABLES
  "health-potion": {
    itemId: "health-potion",
    name: "Health Potion",
    type: "consumable",
    rarity: "uncommon",
    description: "Restores a portion of your vitality.",
    icon: "FlaskConical",
    stackable: true,
    maxStack: 20
  },
  "mana-potion": {
    itemId: "mana-potion",
    name: "Mana Potion",
    type: "consumable",
    rarity: "uncommon",
    description: "Restores a portion of your arcane energy.",
    icon: "FlaskConical",
    stackable: true,
    maxStack: 20
  },
  
  // MATERIALS / LOOT
  "slime_goo": {
    itemId: "slime_goo",
    name: "Slime Goo",
    type: "material",
    rarity: "common",
    description: "A sticky, translucent substance. Smells like damp moss.",
    icon: "FlaskConical",
    stackable: true,
    maxStack: 99
  },
  "wolf_pelt": {
    itemId: "wolf_pelt",
    name: "Wolf Pelt",
    type: "material",
    rarity: "common",
    description: "A thick, coarse pelt from a forest wolf.",
    icon: "Shield",
    stackable: true,
    maxStack: 20
  },
  "gold-coin": {
    itemId: "gold-coin",
    name: "Gold Coin",
    type: "misc",
    rarity: "legendary",
    description: "The primary currency of Aetheria. Shining and valuable.",
    icon: "Coins",
    stackable: true,
    maxStack: 999999
  }
};

/**
 * Starting items for each class.
 * Maps class ID to a list of Item IDs.
 */
export const CLASS_STARTING_GEAR: Record<string, string[]> = {
  warrior: ["training-sword", "wooden-shield", "iron-breastplate", "iron-boots", "health-potion"],
  mage: ["apprentice-staff", "cloth-tunic", "cloth-shoes", "mana-potion", "mana-potion"],
  ranger: ["short-bow", "leather-vest", "leather-boots", "health-potion"],
  priest: ["apprentice-staff", "cloth-tunic", "cloth-shoes", "mana-potion"],
  rogue: ["rusty-dagger", "rusty-dagger", "leather-vest", "leather-boots", "health-potion"],
  paladin: ["greatsword", "iron-breastplate", "iron-boots", "health-potion"]
};

/**
 * Generate a unique instance of an item from the registry.
 */
export function generateItemInstance(itemId: string, quantity: number = 1): InventoryItem | null {
  const template = ITEM_REGISTRY[itemId];
  if (!template) return null;

  return {
    id: Math.random().toString(36).substring(2, 11), // Unique instance ID
    ...template,
    quantity: template.stackable ? quantity : undefined
  };
}
