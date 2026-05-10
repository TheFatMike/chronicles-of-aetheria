/**
 * @file src/config.ts
 * @description Stores environment-specific settings and game balance constants.
 * Manages movement speeds, physics properties, and network synchronization intervals.
 * @importance Essential: Allows for easy tuning of game mechanics and adaptation to different hosting environments.
 */
export const GAME_CONFIG = {
  MOVEMENT: {
    MOVE_SPEED: 8,
    FRICTION: 10,
    GRAVITY: 30,
    JUMP_FORCE: 12,
    SENSITIVITY: 0.005,
    MIN_RADIUS: 2,
    MAX_RADIUS: 20,
  },
  NETWORK: {
    SYNC_RATE_MS: 50,
    INTERPOLATION_SPEED: 15,
  },
  WORLD: {
    SIZE: 1000,
    STARTING_PLAZA_SIZE: 40,
  },
  TARGETING: {
    COLORS: {
      player: "#3b82f6",
      npc: "#facc15",
      enemy: "#ef4444",
    }
  }
};
