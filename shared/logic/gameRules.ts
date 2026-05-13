/**
 * @file shared/logic/gameRules.ts
 * @description Centralized game logic and formulas shared between client and server.
 */
import { Stats, EquipmentSlots } from '../types';

/**
 * Calculates the total stats for a character combining base stats and equipment bonuses.
 */
export function calculateTotalStats(baseStats: Stats, equipment?: EquipmentSlots): Stats {
  const total = { ...baseStats };
  if (!equipment) return total;

  Object.values(equipment).forEach(item => {
    if (item && item.stats) {
      Object.entries(item.stats).forEach(([stat, value]) => {
        const s = stat as keyof Stats;
        if (typeof total[s] === 'number') {
           total[s] += (value || 0);
        }
      });
    }
  });

  return total;
}

/**
 * Calculates Max HP based on character stats.
 * Formula: Stamina * 20 + Strength * 5
 */
export function calculateMaxHP(stats: Stats): number {
  return (stats.stamina * 20) + (stats.strength * 5);
}

/**
 * Calculates Max MP based on character stats.
 * Formula: Intelligence * 15 + Wisdom * 10
 */
export function calculateMaxMP(stats: Stats): number {
  return (stats.intelligence * 15) + (stats.wisdom * 10);
}

/**
 * Calculates HP regen per tick (every 3 seconds).
 * Formula: Stamina * 0.5
 */
export function calculateHPRegen(stats: Stats): number {
  return Math.max(1, Math.floor(stats.stamina * 0.5));
}

/**
 * Calculates MP regen per tick (every 3 seconds).
 * Formula: (Wisdom * 0.6) + (Intelligence * 0.2)
 */
export function calculateMPRegen(stats: Stats): number {
  return Math.max(1, Math.floor((stats.wisdom * 0.6) + (stats.intelligence * 0.2)));
}

/**
 * Calculates base physical damage.
 */
export function calculatePhysicalDamage(stats: Stats): number {
  return (stats.strength * 2) + (stats.dexterity * 0.5);
}

/**
 * Calculates base magic damage.
 */
export function calculateMagicDamage(stats: Stats): number {
  return (stats.intelligence * 2.5) + (stats.wisdom * 0.5);
}

/**
 * Snaps a coordinate or vector to the grid (0.5 units).
 */
export function snapToGrid(value: number): number {
  return Math.round(value * 2) / 2;
}

export function snapVectorToGrid(vec: [number, number, number]): [number, number, number] {
  return [snapToGrid(vec[0]), vec[1], snapToGrid(vec[2])];
}
