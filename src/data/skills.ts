import { Skill } from "../types";

export const ALL_SKILLS: Skill[] = [
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
  },
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
  },
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
  },
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
  },
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
  },
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
  }
];

export const getClassSkills = (className: string): Skill[] => {
  const common = [ALL_SKILLS[0]]; // Basic Attack
  switch (className.toLowerCase()) {
    case 'warrior':
      return [...common, ALL_SKILLS[3]];
    case 'mage':
      return [...common, ALL_SKILLS[1]];
    case 'ranger':
      return [...common, ALL_SKILLS[4]];
    case 'rogue':
      return [...common, ALL_SKILLS[5]];
    case 'priest':
      return [...common, ALL_SKILLS[2]];
    default:
      return common;
  }
};
