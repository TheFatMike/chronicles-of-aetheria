/**
 * @file server/systems/gameEngine.ts
 * @description The core heartbeat of the Chronicles of Aetheria backend.
 * Orchestrates all game systems including AI, spawners, stats regeneration, and state synchronization.
 * @importance Critical: The central loop that ensures the game world progresses and stays in sync across all players.
 */
import { Server } from "socket.io";
import { players, entities, spawners, dirtyEntities, playerLastGridCell, playerKnownEntities } from "../state";
import { serverLogger } from "../logger";
import { performance } from "perf_hooks";
import { calculateTotalStats, calculateHPRegen, calculateMPRegen } from "../../src/lib/gameUtils";
import { filterNearby, getGridKey } from "./spatial";
import { updateEntityAI, initAIWorker } from "./ai";
import { updateSpawners } from "./spawners";
import { autosavePlayers } from "./persistence";
import { markPlayerDirty } from "../lib/stateUtils";

export const startHeartbeat = (io: Server) => {
  const TICK_TIME = 100; // 10 ticks per second
  
  initAIWorker();

  let lastTickTime = performance.now();
  let timeSinceLastStatsRegen = 0;
  let timeSinceLastAutosave = 0;

  const tick = async () => {
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
      await updateEntityAI(dt);

      // 3. Broadcast (True Delta Syncing)
      if (players.size > 0) {
        // OPTIMIZATION: Only iterate over dirty entity IDs
        const dirtyEntityList: any[] = [];
        for (const id of dirtyEntities) {
          const entity = entities.get(id);
          if (entity) dirtyEntityList.push(entity);
        }

        for (const player of players.values()) {
          const currentCell = getGridKey(player.pos);
          const lastCell = playerLastGridCell.get(player.id);
          
          if (currentCell !== lastCell || dirtyEntityList.length > 0) {
            if (currentCell !== lastCell) {
              playerLastGridCell.set(player.id, currentCell);
            }
            
            const nearbyEntities = filterNearby(entities, player.pos, 150, 'entity');
            const known = playerKnownEntities.get(player.id) || new Set<string>();
            
            // OPTIMIZATION: Efficiently identify new and left entities without expensive array conversions
            const nearbyIds = new Set<string>();
            const newEntities = [];
            for (const e of nearbyEntities) {
              nearbyIds.add(e.id);
              if (!known.has(e.id)) {
                newEntities.push(e);
              }
            }

            const leftEntities = [];
            for (const id of known) {
              if (!nearbyIds.has(id)) {
                leftEntities.push(id);
              }
            }
            
            if (newEntities.length > 0 || leftEntities.length > 0) {
              // Create a new Set only if changes occurred
              const updatedKnown = new Set(known);
              for (const e of newEntities) updatedKnown.add(e.id);
              for (const id of leftEntities) updatedKnown.delete(id);
              playerKnownEntities.set(player.id, updatedKnown);
            }

            if (newEntities.length > 0) {
              io.to(player.id).emit("entities_discover", newEntities);
            }
            if (leftEntities.length > 0) {
              io.to(player.id).emit("entities_remove", leftEntities);
            }

            if (dirtyEntityList.length > 0) {
              const newlyDiscoveredIds = new Set(newEntities.map(e => e.id));
              const updatePayload = [];
              for (const e of dirtyEntityList) {
                if (known.has(e.id) && !newlyDiscoveredIds.has(e.id)) {
                  updatePayload.push(e);
                }
              }
              
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
            
            const nearbyPlayers = filterNearby(players, player.pos, 100, 'entity');
            for (const nearby of nearbyPlayers) {
              io.to(nearby.id).emit("player_stats", { id: player.id, hp: player.hp, mp: player.mp });
            }
            
            // Mark as dirty so regen is persisted to Redis/Firestore
            markPlayerDirty(player.id, ["hp", "mp"]);
          }
        }
        timeSinceLastStatsRegen -= 3000;
      }

      // 5. Decoupled Subsystem: Autosave (Every 60 seconds)
      if (timeSinceLastAutosave >= 60000) {
        autosavePlayers().catch(e => serverLogger.error("game", "Autosave failed", e.message));
        
        // Also perform Redis Ghost Cleanup to keep free-tier small
        import("../redis").then(m => m.cleanupGhostPlayers());
        
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
export { initializeWorld } from "./persistence";

