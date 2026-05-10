/**
 * @file src/data/skills.ts
 * @description Static data for all character skills and abilities.
 * Includes damage formulas, mana costs, cooldowns, and visual effect references.
 * @importance Essential: Acts as the definitive source for all active and passive player abilities.
 */
import { Skill } from "../types";

export const ALL_SKILLS: Skill[] = [
  // --- COMMON ---
  {
    id: "basic_attack",
    name: "Basic Attack",
    description: "A standard physical attack using your equipped weapon.",
    icon: "⚔️",
    type: "active",
    cooldown: 0.8,
    manaCost: 0,
    damageMultiplier: 1.0,
    range: 3,
    targetType: "target",
    levelRequired: 1
  },

  // --- WARRIOR ---
  {
    id: "shield_slam",
    name: "Shield Slam",
    description: "Slam your target with your shield, dealing damage based on strength.",
    icon: "🛡️",
    type: "active",
    cooldown: 6,
    manaCost: 10,
    damageMultiplier: 1.5,
    range: 3,
    targetType: "target",
    levelRequired: 1,
    class: "warrior"
  },
  {
    id: "whirlwind",
    name: "Whirlwind",
    description: "Spin rapidly, dealing massive damage to your target.",
    icon: "🌪️",
    type: "active",
    cooldown: 12,
    manaCost: 30,
    damageMultiplier: 4.0,
    range: 4,
    targetType: "target",
    levelRequired: 5,
    class: "warrior"
  },

  // --- MAGE ---
  {
    id: "fireball",
    name: "Fireball",
    description: "Launch a ball of fire that deals high magic damage.",
    icon: "🔥",
    type: "active",
    cooldown: 3,
    manaCost: 15,
    damageMultiplier: 2.5,
    range: 15,
    castTime: 1500,
    targetType: "target",
    animation: "cast_fire",
    levelRequired: 1,
    class: "mage"
  },
  {
    id: "frostbolt",
    name: "Frostbolt",
    description: "Shoot a bolt of ice that freezes the air around your target.",
    icon: "❄️",
    type: "active",
    cooldown: 4,
    manaCost: 20,
    damageMultiplier: 2.2,
    range: 18,
    castTime: 1200,
    targetType: "target",
    levelRequired: 3,
    class: "mage"
  },

  // --- RANGER ---
  {
    id: "arrow_shot",
    name: "Steady Shot",
    description: "A focused shot that deals increased damage.",
    icon: "🏹",
    type: "active",
    cooldown: 2,
    manaCost: 5,
    damageMultiplier: 1.8,
    range: 20,
    targetType: "target",
    levelRequired: 1,
    class: "ranger"
  },
  {
    id: "multishot",
    name: "Multi-Shot",
    description: "Fire a volley of arrows at your target.",
    icon: "🎯",
    type: "active",
    cooldown: 8,
    manaCost: 25,
    damageMultiplier: 3.5,
    range: 20,
    targetType: "target",
    levelRequired: 4,
    class: "ranger"
  },

  // --- ROGUE ---
  {
    id: "backstab",
    name: "Backstab",
    description: "A swift strike from the shadows.",
    icon: "🔪",
    type: "active",
    cooldown: 8,
    manaCost: 15,
    damageMultiplier: 3.0,
    range: 2,
    targetType: "target",
    levelRequired: 1,
    class: "rogue"
  },

  // --- PRIEST ---
  {
    id: "heal",
    name: "Lesser Heal",
    description: "Heal yourself or an ally for a moderate amount.",
    icon: "✨",
    type: "active",
    cooldown: 5,
    manaCost: 20,
    healingMultiplier: 2.0,
    range: 10,
    castTime: 2000,
    targetType: "target",
    levelRequired: 1,
    class: "priest"
  },
  {
    id: "smite",
    name: "Holy Smite",
    description: "Strike down the target with divine energy.",
    icon: "☀️",
    type: "active",
    cooldown: 4,
    manaCost: 15,
    damageMultiplier: 1.8,
    range: 12,
    targetType: "target",
    levelRequired: 3,
    class: "priest"
  }
];

export const getClassSkills = (className: string): Skill[] => {
  return ALL_SKILLS.filter(s => !s.class || s.class.toLowerCase() === className.toLowerCase());
};
