/**
 * @file src/data/passives.ts
 * @description Defines the passive skill tree nodes for each character class.
 * Maps tree branches (e.g., Juggernaut vs Slayer) to specific stat and combat bonuses.
 */
import { PassiveNode } from "../types";

export const PASSIVE_NODES: PassiveNode[] = [
  // --- WARRIOR: JUGGERNAUT (TANK) ---
  {
    id: "war_tank_1",
    name: "Toughened Hide",
    description: "Increases Stamina by 2 per point.",
    icon: "🛡️",
    maxPoints: 5,
    stats: { stamina: 2 },
    class: "warrior",
    branch: "Juggernaut",
    position: { x: 200, y: 100 }
  },
  {
    id: "war_tank_2",
    name: "Iron Will",
    description: "Increases maximum health by 5% per point.",
    icon: "🧱",
    maxPoints: 3,
    bonuses: { healthBonus: 0.05 },
    dependencies: ["war_tank_1"],
    class: "warrior",
    branch: "Juggernaut",
    position: { x: 200, y: 250 }
  },
  {
    id: "war_tank_3",
    name: "Indomitable",
    description: "Reduces all damage taken by 2% per point.",
    icon: "🏰",
    maxPoints: 5,
    bonuses: { damageMultiplier: -0.02 },
    dependencies: ["war_tank_2"],
    class: "warrior",
    branch: "Juggernaut",
    position: { x: 200, y: 400 }
  },

  // --- WARRIOR: SLAYER (DAMAGE) ---
  {
    id: "war_dmg_1",
    name: "Brute Force",
    description: "Increases Strength by 2 per point.",
    icon: "⚔️",
    maxPoints: 5,
    stats: { strength: 2 },
    class: "warrior",
    branch: "Slayer",
    position: { x: 400, y: 100 }
  },
  {
    id: "war_dmg_2",
    name: "Sharpened Blades",
    description: "Increases Critical Strike chance by 2% per point.",
    icon: "✨",
    maxPoints: 5,
    bonuses: { critChance: 0.02 },
    dependencies: ["war_dmg_1"],
    class: "warrior",
    branch: "Slayer",
    position: { x: 400, y: 250 }
  },
  {
    id: "war_dmg_3",
    name: "Bloodthirst",
    description: "Increases all physical damage dealt by 3% per point.",
    icon: "🩸",
    maxPoints: 5,
    bonuses: { damageMultiplier: 0.03 },
    dependencies: ["war_dmg_2"],
    class: "warrior",
    branch: "Slayer",
    position: { x: 400, y: 400 }
  },

  // --- PRIEST: HOLY (HEALING) ---
  {
    id: "pri_heal_1",
    name: "Divine Wisdom",
    description: "Increases Wisdom by 2 per point.",
    icon: "📜",
    maxPoints: 5,
    stats: { wisdom: 2 },
    class: "priest",
    branch: "Holy",
    position: { x: 200, y: 100 }
  },
  {
    id: "pri_heal_2",
    name: "Grace",
    description: "Increases healing effectiveness by 5% per point.",
    icon: "💖",
    maxPoints: 5,
    bonuses: { healingMultiplier: 0.05 },
    dependencies: ["pri_heal_1"],
    class: "priest",
    branch: "Holy",
    position: { x: 200, y: 250 }
  },
  {
    id: "pri_heal_3",
    name: "Serenity",
    description: "Reduces cooldown of healing spells by 4% per point.",
    icon: "🕊️",
    maxPoints: 5,
    bonuses: { cooldownReduction: 0.04 },
    dependencies: ["pri_heal_2"],
    class: "priest",
    branch: "Holy",
    position: { x: 200, y: 400 }
  },

  // --- PRIEST: SHADOW (DAMAGE) ---
  {
    id: "pri_dmg_1",
    name: "Dark Thoughts",
    description: "Increases Intelligence by 2 per point.",
    icon: "🧠",
    maxPoints: 5,
    stats: { intelligence: 2 },
    class: "priest",
    branch: "Shadow",
    position: { x: 400, y: 100 }
  },
  {
    id: "pri_dmg_2",
    name: "Mind Blast",
    description: "Increases spell critical strike chance by 2% per point.",
    icon: "💥",
    maxPoints: 5,
    bonuses: { critChance: 0.02 },
    dependencies: ["pri_dmg_1"],
    class: "priest",
    branch: "Shadow",
    position: { x: 400, y: 250 }
  },
  {
    id: "pri_dmg_3",
    name: "Shadowform",
    description: "Increases shadow damage dealt by 4% per point.",
    icon: "🌑",
    maxPoints: 5,
    bonuses: { damageMultiplier: 0.04 },
    dependencies: ["pri_dmg_2"],
    class: "priest",
    branch: "Shadow",
    position: { x: 400, y: 400 }
  },

  // --- MAGE: ARCANE (UTILITY) ---
  {
    id: "mag_util_1",
    name: "Arcane Flow",
    description: "Increases Intelligence by 2 per point.",
    icon: "⚛️",
    maxPoints: 5,
    stats: { intelligence: 2 },
    class: "mage",
    branch: "Arcane",
    position: { x: 200, y: 100 }
  },
  {
    id: "mag_util_2",
    name: "Mana Shield",
    description: "Increases maximum mana by 10% per point.",
    icon: "🌀",
    maxPoints: 3,
    bonuses: { manaBonus: 0.10 },
    dependencies: ["mag_util_1"],
    class: "mage",
    branch: "Arcane",
    position: { x: 200, y: 250 }
  },

  // --- MAGE: FIRE (DAMAGE) ---
  {
    id: "mag_dmg_1",
    name: "Ignite",
    description: "Increases magic damage by 3% per point.",
    icon: "🔥",
    maxPoints: 5,
    bonuses: { damageMultiplier: 0.03 },
    class: "mage",
    branch: "Fire",
    position: { x: 400, y: 100 }
  },
  {
    id: "mag_dmg_2",
    name: "Pyromaniac",
    description: "Increases Fire Critical Strike chance by 4% per point.",
    icon: "☄️",
    maxPoints: 5,
    bonuses: { critChance: 0.04 },
    dependencies: ["mag_dmg_1"],
    class: "mage",
    branch: "Fire",
    position: { x: 400, y: 250 }
  },
  // --- RANGER: MARKSMAN (DAMAGE) ---
  {
    id: "ran_dmg_1",
    name: "Eagle Eye",
    description: "Increases Dexterity by 2 per point.",
    icon: "🦅",
    maxPoints: 5,
    stats: { dexterity: 2 },
    class: "ranger",
    branch: "Marksman",
    position: { x: 200, y: 100 }
  },
  {
    id: "ran_dmg_2",
    name: "Long Range",
    description: "Increases attack range by 1 meter per point.",
    icon: "🎯",
    maxPoints: 3,
    bonuses: { critChance: 0.01 }, // Using crit as a stand-in for range bonus logic
    dependencies: ["ran_dmg_1"],
    class: "ranger",
    branch: "Marksman",
    position: { x: 200, y: 250 }
  },
  {
    id: "ran_dmg_3",
    name: "Deadly Aim",
    description: "Increases critical strike damage by 10% per point.",
    icon: "🏹",
    maxPoints: 5,
    bonuses: { damageMultiplier: 0.05 },
    dependencies: ["ran_dmg_2"],
    class: "ranger",
    branch: "Marksman",
    position: { x: 200, y: 400 }
  },

  // --- RANGER: BEASTMASTER (UTILITY) ---
  {
    id: "ran_util_1",
    name: "Wild Survival",
    description: "Increases Stamina by 2 per point.",
    icon: "🌲",
    maxPoints: 5,
    stats: { stamina: 2 },
    class: "ranger",
    branch: "Beastmaster",
    position: { x: 400, y: 100 }
  },
  {
    id: "ran_util_2",
    name: "Animal Companion",
    description: "Increases maximum health by 8% per point.",
    icon: "🐾",
    maxPoints: 3,
    bonuses: { healthBonus: 0.08 },
    dependencies: ["ran_util_1"],
    class: "ranger",
    branch: "Beastmaster",
    position: { x: 400, y: 250 }
  },

  // --- ROGUE: ASSASSINATION (DAMAGE) ---
  {
    id: "rog_dmg_1",
    name: "Lethality",
    description: "Increases Dexterity by 2 per point.",
    icon: "🗡️",
    maxPoints: 5,
    stats: { dexterity: 2 },
    class: "rogue",
    branch: "Assassination",
    position: { x: 200, y: 100 }
  },
  {
    id: "rog_dmg_2",
    name: "Poison Mastery",
    description: "Increases all damage dealt by 4% per point.",
    icon: "🧪",
    maxPoints: 5,
    bonuses: { damageMultiplier: 0.04 },
    dependencies: ["rog_dmg_1"],
    class: "rogue",
    branch: "Assassination",
    position: { x: 200, y: 250 }
  },

  // --- ROGUE: SUBTLETY (CRIT) ---
  {
    id: "rog_crit_1",
    name: "Shadowstep",
    description: "Increases Critical Strike chance by 3% per point.",
    icon: "👤",
    maxPoints: 5,
    bonuses: { critChance: 0.03 },
    class: "rogue",
    branch: "Subtlety",
    position: { x: 400, y: 100 }
  },
  {
    id: "rog_crit_2",
    name: "Eviscerate",
    description: "Increases Critical Strike damage by 15% per point.",
    icon: "🩸",
    maxPoints: 3,
    bonuses: { damageMultiplier: 0.06 },
    dependencies: ["rog_crit_1"],
    class: "rogue",
    branch: "Subtlety",
    position: { x: 400, y: 250 }
  },
  // --- PALADIN: PROTECTION (TANK) ---
  {
    id: "pal_tank_1",
    name: "Divine Bastion",
    description: "Increases Stamina by 2 per point.",
    icon: "🛡️",
    maxPoints: 5,
    stats: { stamina: 2 },
    class: "paladin",
    branch: "Protection",
    position: { x: 200, y: 100 }
  },
  {
    id: "pal_tank_2",
    name: "Sacred Duty",
    description: "Reduces damage taken by 3% per point.",
    icon: "⚖️",
    maxPoints: 5,
    bonuses: { damageMultiplier: -0.03 },
    dependencies: ["pal_tank_1"],
    class: "paladin",
    branch: "Protection",
    position: { x: 200, y: 250 }
  },

  // --- PALADIN: RETRIBUTION (DAMAGE) ---
  {
    id: "pal_dmg_1",
    name: "Crusader's Might",
    description: "Increases Strength by 2 per point.",
    icon: "⚔️",
    maxPoints: 5,
    stats: { strength: 2 },
    class: "paladin",
    branch: "Retribution",
    position: { x: 400, y: 100 }
  },
  {
    id: "pal_dmg_2",
    name: "Righteous Fury",
    description: "Increases critical strike chance by 2% per point.",
    icon: "✨",
    maxPoints: 5,
    bonuses: { critChance: 0.02 },
    dependencies: ["pal_dmg_1"],
    class: "paladin",
    branch: "Retribution",
    position: { x: 400, y: 250 }
  }
];

export const getClassPassives = (className: string): PassiveNode[] => {
  return PASSIVE_NODES.filter(n => !n.class || n.class.toLowerCase() === className.toLowerCase());
};
