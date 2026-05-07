import { InventoryItem } from "./types";

export const CHARACTER_CLASSES = [
  { 
    id: "warrior", 
    name: "Warrior", 
    description: "Masters of close combat with iron skin and unmatched strength.",
    color: "#b91c1c", 
    stats: { strength: 15, dexterity: 8, wisdom: 6, intelligence: 5, stamina: 14 }
  },
  { 
    id: "mage", 
    name: "Mage", 
    description: "Wielders of arcane energy, capable of bending reality to their will.",
    color: "#2563eb", 
    stats: { strength: 4, dexterity: 10, wisdom: 12, intelligence: 18, stamina: 8 }
  },
  { 
    id: "ranger", 
    name: "Ranger", 
    description: "Swift trackers who strike from the shadows with deadly precision.",
    color: "#15803d", 
    stats: { strength: 9, dexterity: 16, wisdom: 8, intelligence: 10, stamina: 10 }
  },
  {
    id: "priest",
    name: "Priest",
    description: "Divinely inspired healers who draw strength from faith and wisdom.",
    color: "#eab308",
    stats: { strength: 6, dexterity: 7, wisdom: 18, intelligence: 12, stamina: 10 }
  },
  {
    id: "rogue",
    name: "Rogue",
    description: "Cunning infiltrators who strike with lethal speed and unmatched agility.",
    color: "#6b21a8",
    stats: { strength: 8, dexterity: 18, wisdom: 7, intelligence: 11, stamina: 9 }
  },
  {
    id: "paladin",
    name: "Paladin",
    description: "Holy warriors who protect the weak and smite evil with divine power.",
    color: "#fde047",
    stats: { strength: 12, dexterity: 6, wisdom: 14, intelligence: 8, stamina: 16 }
  }
];

export const SAMPLE_ITEMS: InventoryItem[] = [
  {
    id: "1",
    itemId: "iron-sword",
    name: "Iron Sword",
    type: "weapon",
    rarity: "common",
    description: "A standard-issue iron sword. Heavy but reliable.",
    icon: "Sword",
    stats: { strength: 2 }
  },
  {
    id: "2",
    itemId: "greatsword",
    name: "Greatsword",
    type: "weapon",
    rarity: "uncommon",
    description: "A massive blade that requires both hands to wield.",
    icon: "Sword",
    twoHanded: true,
    stats: { strength: 12 }
  },
  {
    id: "3",
    itemId: "wooden-shield",
    name: "Wooden Shield",
    type: "offhand",
    rarity: "common",
    description: "A solid wooden shield. Blocks incoming damage.",
    icon: "Shield",
    stats: { stamina: 3 }
  },
  {
    id: "4",
    itemId: "leather-cap",
    name: "Leather Cap",
    type: "head",
    rarity: "common",
    description: "A basic cap made of cured leather.",
    icon: "Shield",
    stats: { stamina: 1 }
  },
  {
    id: "5",
    itemId: "cloth-tunic",
    name: "Cloth Tunic",
    type: "chest",
    rarity: "common",
    description: "Simple clothing that offers minimal protection.",
    icon: "Shirt",
    stats: { stamina: 2 }
  },
  {
    id: "6",
    itemId: "rugged-boots",
    name: "Rugged Boots",
    type: "boots",
    rarity: "common",
    description: "Sturdy boots for a long journey.",
    icon: "Footprints",
    stats: { dexterity: 1 }
  },
  {
    id: "7",
    itemId: "star-pendant",
    name: "Star Pendant",
    type: "accessory",
    rarity: "rare",
    description: "A glowing pendant that resonates with magic.",
    icon: "Gem",
    stats: { wisdom: 4, intelligence: 4 }
  },
  {
    id: "8",
    itemId: "health-potion",
    name: "Health Potion",
    type: "consumable",
    rarity: "uncommon",
    description: "Restores a portion of your vitality.",
    icon: "FlaskConical",
    quantity: 5,
    stackable: true,
    maxStack: 20
  }
];
