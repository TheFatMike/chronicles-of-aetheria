import { Server } from "socket.io";
import { players, entities } from "../state";
import { serverLogger } from "../logger";
import { performance } from "perf_hooks";
import { calculateTotalStats, calculateHPRegen, calculateMPRegen } from "../../src/lib/gameUtils";
import { filterNearby } from "./spatial";
import { updateEntityAI } from "./ai";
import { updateSpawners } from "./spawners";
import { autosavePlayers } from "./persistence";

export const startHeartbeat = (io: Server) => {
  const TICK_TIME = 100; // 10 ticks per second

  const tick = () => {
    try {
      const now = performance.now();

      // 1. Spawner Logic
      updateSpawners(now);

      // 2. Entity AI
      updateEntityAI(TICK_TIME);

      // 3. Broadcast
      if (entities.size > 0 && players.size > 0) {
        const allEntities = Array.from(entities.values());
        for (const player of players.values()) {
          const nearbyEntities = filterNearby(allEntities, player.pos, 80);
          io.to(player.id).emit("entities", nearbyEntities);
        }
      }

      setTimeout(tick, TICK_TIME);
    } catch (e: any) {
      serverLogger.error("game", "Main loop error", e.message);
      setTimeout(tick, TICK_TIME);
    }
  };

  tick();

  // 4. Stats Regen Loop (Every 3 seconds)
  setInterval(() => {
    for (const player of players.values()) {
      if (!player.stats || !player.equipment) continue;
      const stats = calculateTotalStats(player.stats, player.equipment);
      const hpRegen = calculateHPRegen(stats);
      const mpRegen = calculateMPRegen(stats);
      if (player.hp < player.maxHp || player.mp < player.maxMp) {
        player.hp = Math.min(player.maxHp, player.hp + hpRegen);
        player.mp = Math.min(player.maxMp, player.mp + mpRegen);
        io.emit("player_stats", { id: player.id, hp: player.hp, mp: player.mp });
      }
    }
  }, 3000);

  // 5. Autosave Loop (Every minute)
  setInterval(async () => {
    await autosavePlayers();
  }, 60000);
};

// Re-export initialization functions from persistence for convenience
export { initializeWorld, initializeSpawners } from "./persistence";

