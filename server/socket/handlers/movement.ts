/**
 * @file server/socket/handlers/movement.ts
 * @description Processes and validates player movement updates.
 * Handles synchronization of player positions and ensures collision rules are respected.
 * @importance Critical: Essential for a smooth multiplayer experience and maintaining a consistent world state.
 */
import { Socket, Server } from "socket.io";
import { players, terrainData } from "../../state";
import { serverLogger } from "../../logger";
import { resolveWorldCollision, updateInGrid, entityGrid, getNearbyGridKeys } from "../../systems/spatial";
import { getInterpolatedHeight } from "../../lib/terrainUtils";
import { markPlayerDirty } from "../../lib/stateUtils";
import { loadTerrainRegion } from "../../systems/persistence";
import { updatePlayerPositionRedis } from "../../redis";

export const handleMove = async (socket: Socket, data: any, io: Server) => {
  const player = players.get(socket.id);
  if (!player) return;

  const now = Date.now();
  const lastTime = player.lastMoveTime || (now - 50);
  const dt = (now - lastTime) / 1000;
  
  if (player.pos && dt > 0) {
    const dx = data.pos[0] - player.pos[0];
    const dy = data.pos[1] - player.pos[1];
    const dz = data.pos[2] - player.pos[2];
    const distSq = dx*dx + dy*dy + dz*dz;
    
    // Robust Speed Check: Use a minimum DT to prevent jitter from triggering anti-cheat
    const speedCheckDt = Math.max(dt, 0.05); 
    const speedSq = distSq / (speedCheckDt * speedCheckDt);

    // Allow up to 180m/s (160 base + burst/lag buffer)
    // 180^2 = 32400
    if (speedSq > 32400 && dt > 0.05) { 
      serverLogger.warn("anti-cheat", `Speed/Teleport detected for ${player.characterName} (Speed: ${Math.sqrt(speedSq).toFixed(1)}m/s). Resetting.`);
      socket.emit("session_start", player);
      return;
    }
  }
  
  const oldPos = [...player.pos] as [number, number, number];
  let finalPos = resolveWorldCollision(oldPos, data.pos);
  
  // Terrain Height Enforcement: Keep players from falling THROUGH the ground
  const groundY = getInterpolatedHeight(finalPos[0], finalPos[2], terrainData, 4);
  
  const driftX = Math.abs(finalPos[0] - data.pos[0]);
  const driftZ = Math.abs(finalPos[2] - data.pos[2]);
  const driftY = Math.abs(finalPos[1] - data.pos[1]);

  // SUPER PERMISSIVE SYNC: Let the client be the leader unless they are WAY off
  // Anti-cheat still catches actual teleports (speed limit)
  if (driftX > 10.0 || driftZ > 10.0 || driftY > 15.0) {
    socket.emit("move_sync", { pos: finalPos, rot: data.rot });
  }

  player.pos = finalPos;
  player.rot = data.rot;
  player.isMoving = data.isMoving;
  player.isGrounded = data.isGrounded;
  player.lastMoveTime = now;

  // 1. Update Spatial Grid
  updateInGrid(entityGrid, socket.id, oldPos, finalPos);

  // 2. Lazy Terrain Loading: Check if we crossed into a new 100x100 region
  const oldChunkX = Math.floor(oldPos[0] / 100);
  const oldChunkZ = Math.floor(oldPos[2] / 100);
  const newChunkX = Math.floor(finalPos[0] / 100);
  const newChunkZ = Math.floor(finalPos[2] / 100);

  if (oldChunkX !== newChunkX || oldChunkZ !== newChunkZ) {
    loadTerrainRegion(finalPos[0], finalPos[2]);

    // Incremental World Object Sync (AoI)
    // Only send objects the player hasn't seen yet to save bandwidth
    const { filterNearby } = await import("../../systems/spatial");
    const { worldObjects, playerKnownObjects } = await import("../../state");
    
    const nearbyObjects = filterNearby(Array.from(worldObjects.values()), finalPos, 150, 'object');
    let known = playerKnownObjects.get(socket.id);
    if (!known) {
      known = new Set();
      playerKnownObjects.set(socket.id, known);
    }

    const newObjects = nearbyObjects.filter((obj: any) => !known!.has(obj.id));
    
    if (newObjects.length > 0) {
      newObjects.forEach((obj: any) => known!.add(obj.id));
      socket.emit("world_sync", newObjects);
    }
  }

  // 2. Mark as dirty for eventual persistence (Selective Fields)
  markPlayerDirty(socket.id, ["pos", "rot"]);

  // 3. Update Redis Cache (Asynchronous)
  updatePlayerPositionRedis(socket.id, finalPos);

  // 2. Targeted Broadcast (AoI)
  const nearbyKeys = getNearbyGridKeys(finalPos, 100);
  const payload = { id: socket.id, ...data, pos: finalPos };

  // Only broadcast to players in nearby grid cells
  for (const p of players.values()) {
    if (p.id === socket.id) continue;
    
    const px = Math.floor(p.pos[0] / 50);
    const pz = Math.floor(p.pos[2] / 50);
    const pKey = `${px},${pz}`;
    
    if (nearbyKeys.includes(pKey)) {
      io.to(p.id).emit("player_move", payload);
    }
  }
};
