import { Server } from "socket.io";
import { players, entities, dirtyEntities, playerLastGridCell, playerKnownEntities } from "../state";
import { serverLogger } from "../logger";
import { performance } from "perf_hooks";
import { calculateTotalStats, calculateHPRegen, calculateMPRegen } from "../../src/lib/gameUtils";
import { filterNearby, getGridKey } from "./spatial";
import { updateEntityAI, initAIWorker } from "./ai";
import { updateSpawners } from "./spawners";
import { autosavePlayers } from "./persistence";

export const startHeartbeat = (io: Server) => {
  const TICK_TIME = 100; // 10 ticks per second
  
  initAIWorker();

  let lastTickTime = performance.now();
  let timeSinceLastStatsRegen = 0;
  let timeSinceLastAutosave = 0;

  const tick = () => {
    const now = performance.now();
    let dt = now - lastTickTime;
    
    // Cap dt to prevent massive jumps after server lag or thread block
    if (dt > 1000) dt = 1000;
    lastTickTime = now;

    timeSinceLastStatsRegen += dt;
    timeSinceLastAutosave += dt;

    try {
      // 1. Spawner Logic
      updateSpawners(now);

      // 2. Entity AI (Asynchronous via Worker Thread)
      // We pass the actual dt so movement is smooth even if tick rate fluctuates
      updateEntityAI(dt);

      // 3. Broadcast (True Delta Syncing)
      if (players.size > 0) {
        const allEntities = Array.from(entities.values());
        const dirtyEntityList = allEntities.filter(e => dirtyEntities.has(e.id));

        for (const player of players.values()) {
          const currentCell = getGridKey(player.pos);
          const lastCell = playerLastGridCell.get(player.id);
          
          // Re-evaluate nearby entities if the player moved OR if any entity moved
          if (currentCell !== lastCell || dirtyEntityList.length > 0) {
            if (currentCell !== lastCell) {
              playerLastGridCell.set(player.id, currentCell);
            }
            
            const nearbyEntities = filterNearby(allEntities, player.pos, 80, 'entity');
            const nearbyIds = new Set(nearbyEntities.map(e => e.id));
            const known = playerKnownEntities.get(player.id) || new Set<string>();
            
            const newEntities = nearbyEntities.filter(e => !known.has(e.id));
            const leftEntities = Array.from(known).filter(id => !nearbyIds.has(id));
            
            if (newEntities.length > 0 || leftEntities.length > 0) {
              playerKnownEntities.set(player.id, nearbyIds);
            }

            if (newEntities.length > 0) {
              io.to(player.id).emit("entities_discover", newEntities);
            }
            if (leftEntities.length > 0) {
              io.to(player.id).emit("entities_remove", leftEntities);
            }

            // Send dirty updates only for entities that were ALREADY known (not just discovered)
            if (dirtyEntityList.length > 0) {
              const newlyDiscoveredIds = new Set(newEntities.map(e => e.id));
              const updatePayload = dirtyEntityList.filter(e => nearbyIds.has(e.id) && !newlyDiscoveredIds.has(e.id));
              if (updatePayload.length > 0) {
                io.to(player.id).emit("entities_update", updatePayload);
              }
            }
          }
        }
      }

      // 4. Decoupled Subsystem: Stats Regen (Every 3 seconds)
      if (timeSinceLastStatsRegen >= 3000) {
        for (const player of players.values()) {
          if (!player.stats || !player.equipment) continue;
          const stats = calculateTotalStats(player.stats, player.equipment);
          const hpRegen = calculateHPRegen(stats);
          const mpRegen = calculateMPRegen(stats);
          
          if (player.hp < player.maxHp || player.mp < player.maxMp) {
            player.hp = Math.min(player.maxHp, player.hp + hpRegen);
            player.mp = Math.min(player.maxMp, player.mp + mpRegen);
            
            // Targeted broadcast for stats
            const nearbyPlayers = filterNearby(Array.from(players.values()), player.pos, 100, 'entity');
            for (const nearby of nearbyPlayers) {
              io.to(nearby.id).emit("player_stats", { id: player.id, hp: player.hp, mp: player.mp });
            }
          }
        }
        timeSinceLastStatsRegen -= 3000;
      }

      // 5. Decoupled Subsystem: Autosave (Every 60 seconds)
      if (timeSinceLastAutosave >= 60000) {
        autosavePlayers().catch(e => serverLogger.error("game", "Autosave failed", e.message));
        timeSinceLastAutosave -= 60000;
      }

      // 6. Cleanup
      dirtyEntities.clear();

    } catch (e: any) {
      serverLogger.error("game", "Main loop error", e.message);
    } finally {
      // Calculate how long this tick actually took to schedule the next one accurately
      const tickDuration = performance.now() - now;
      const nextTickDelay = Math.max(0, TICK_TIME - tickDuration);
      setTimeout(tick, nextTickDelay);
    }
  };

  tick();
};

// Re-export initialization functions from persistence for convenience
export { initializeWorld, initializeSpawners } from "./persistence";

