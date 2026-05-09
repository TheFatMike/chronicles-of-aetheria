export const GAME_CONFIG = {
  MOVEMENT: {
    MOVE_SPEED: 65.0,
    FRICTION: 12.0,
    GRAVITY: 30.0,
    JUMP_FORCE: 12.0,
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
