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
    levelRequired: 1,
    scalingType: "physical"
  },

  // --- WARRIOR ---
  {
    id: "aegis_bash",
    name: "Aegis Bash",
    description: "Slam your target with your shield, dealing damage based on strength.",
    icon: "🛡️",
    type: "active",
    cooldown: 6,
    manaCost: 10,
    damageMultiplier: 1.5,
    range: 3,
    targetType: "target",
    levelRequired: 1,
    class: "warrior",
    scalingType: "physical"
  },
  {
    id: "steel_tempest",
    name: "Steel Tempest",
    description: "Spin rapidly, dealing massive damage to your target.",
    icon: "🌪️",
    type: "active",
    cooldown: 12,
    manaCost: 30,
    damageMultiplier: 4.0,
    range: 4,
    targetType: "target",
    levelRequired: 5,
    class: "warrior",
    scalingType: "physical"
  },

  // --- MAGE ---
  {
    id: "ember_bolt",
    name: "Ember Bolt",
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
    class: "mage",
    scalingType: "magic"
  },
  {
    id: "glacial_spike",
    name: "Glacial Spike",
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
    class: "mage",
    scalingType: "magic"
  },

  // --- RANGER ---
  {
    id: "trueflight_shot",
    name: "Trueflight Shot",
    description: "A focused shot that deals increased damage.",
    icon: "🏹",
    type: "active",
    cooldown: 2,
    manaCost: 5,
    damageMultiplier: 1.8,
    range: 20,
    targetType: "target",
    levelRequired: 1,
    class: "ranger",
    scalingType: "physical"
  },
  {
    id: "arrow_volley",
    name: "Arrow Volley",
    description: "Fire a volley of arrows at your target.",
    icon: "🎯",
    type: "active",
    cooldown: 8,
    manaCost: 25,
    damageMultiplier: 3.5,
    range: 20,
    targetType: "target",
    levelRequired: 4,
    class: "ranger",
    scalingType: "physical"
  },

  // --- ROGUE ---
  {
    id: "vitals_strike",
    name: "Vitals Strike",
    description: "A swift strike from the shadows, dealing high burst damage.",
    icon: "🔪",
    type: "active",
    cooldown: 8,
    manaCost: 15,
    damageMultiplier: 3.0,
    range: 2,
    targetType: "target",
    levelRequired: 1,
    class: "rogue",
    scalingType: "physical"
  },
  {
    id: "quick_blade",
    name: "Quick Blade",
    description: "A quick, dirty blow that deals moderate damage.",
    icon: "🗡️",
    type: "active",
    cooldown: 2,
    manaCost: 10,
    damageMultiplier: 1.6,
    range: 3,
    targetType: "target",
    levelRequired: 3,
    class: "rogue",
    scalingType: "physical"
  },
  {
    id: "final_incision",
    name: "Final Incision",
    description: "A lethal finishing move that deals massive damage.",
    icon: "🩸",
    type: "active",
    cooldown: 15,
    manaCost: 40,
    damageMultiplier: 5.5,
    range: 2,
    targetType: "target",
    levelRequired: 6,
    class: "rogue",
    scalingType: "physical"
  },

  // --- PALADIN ---
  {
    id: "sunfury_strike",
    name: "Sunfury Strike",
    description: "Infuse your weapon with holy light to strike the target.",
    icon: "⚔️",
    type: "active",
    cooldown: 5,
    manaCost: 10,
    damageMultiplier: 1.8,
    range: 3,
    targetType: "target",
    levelRequired: 1,
    class: "paladin",
    scalingType: "physical"
  },
  {
    id: "celestial_decree",
    name: "Celestial Decree",
    description: "Unleash divine judgment upon a distant target.",
    icon: "⚖️",
    type: "active",
    cooldown: 8,
    manaCost: 20,
    damageMultiplier: 2.2,
    range: 12,
    targetType: "target",
    levelRequired: 3,
    class: "paladin",
    scalingType: "magic"
  },
  {
    id: "ancestral_breath",
    name: "Ancestral Breath",
    description: "Heal yourself or an ally for a massive amount.",
    icon: "🖐️",
    type: "active",
    cooldown: 60,
    manaCost: 50,
    healingMultiplier: 8.0,
    range: 5,
    targetType: "target",
    levelRequired: 5,
    class: "paladin",
    scalingType: "magic",
    isHealing: true
  },

  // --- PRIEST ---
  {
    id: "essence_mend",
    name: "Essence Mend",
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
    class: "priest",
    scalingType: "magic",
    isHealing: true
  },
  {
    id: "radiant_burst",
    name: "Radiant Burst",
    description: "Strike down the target with divine energy.",
    icon: "☀️",
    type: "active",
    cooldown: 4,
    manaCost: 15,
    damageMultiplier: 1.8,
    range: 12,
    targetType: "target",
    levelRequired: 3,
    class: "priest",
    scalingType: "magic",
    isHealing: false
  }
];

export const getClassSkills = (className: string): Skill[] => {
  return ALL_SKILLS.filter(s => !s.class || s.class.toLowerCase() === className.toLowerCase());
};
