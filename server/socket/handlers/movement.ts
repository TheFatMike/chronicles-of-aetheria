/**
 * @file server/socket/handlers/movement.ts
 * @description Processes and validates player movement updates.
 * Handles synchronization of player positions and ensures collision rules are respected.
 * @importance Critical: Essential for a smooth multiplayer experience and maintaining a consistent world state.
 */
import { Socket, Server } from "socket.io";
import { players, terrainData } from "../../state";
import { serverLogger } from "../../logger";
import { getGroundHeight, resolveWorldCollision, updateInGrid, entityGrid, getNearbyGridKeys, filterNearby } from "../../systems/spatial";
import { chunkLastAccess, worldObjects, playerKnownObjects } from "../../state";
import { markPlayerDirty } from "../../lib/stateUtils";
import { loadTerrainRegion } from "../../systems/persistence";
import { updatePlayerPositionRedis } from "../../redis";
import { takeGold } from "../../lib/playerUtils";

import { MovePayloadSchema, TeleportPayloadSchema } from "../../lib/schemas";
import { validatePayload } from "../../lib/validation";

export const handleMove = async (socket: Socket, data: any, io: Server) => {
  const validated = validatePayload(socket, MovePayloadSchema, data, "move");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const now = Date.now();
  
  // 0. Packet Rate Limiting: 20 packets per second max (50ms interval)
  const lastPacketTime = player.lastMovePacketTime || 0;
  if (now - lastPacketTime < 30) { // 30ms floor to account for some jitter, but 20fps is normal
    return; 
  }
  player.lastMovePacketTime = now;

  const lastTime = player.lastMoveTime || (now - 50);
  const dt = (now - lastTime) / 1000;
  
  if (player.pos && dt > 0) {
    const dx = validated.pos[0] - player.pos[0];
    const dy = validated.pos[1] - player.pos[1];
    const dz = validated.pos[2] - player.pos[2];
    const distSq = dx*dx + dy*dy + dz*dz;
    
    // Robust Speed Check: Use a minimum DT to prevent jitter from triggering anti-cheat
    const speedCheckDt = Math.max(dt, 0.05); 
    const speedSq = distSq / (speedCheckDt * speedCheckDt);

    // Hardened Speed Check: 25m/s is a fast run/mount speed. 
    // 25^2 = 625
    if (speedSq > 625 && dt > 0.05) { 
      serverLogger.warn("anti-cheat", `Speed/Teleport detected for ${player.name} (Speed: ${Math.sqrt(speedSq).toFixed(1)}m/s). Resetting.`);
      socket.emit("session_start", player);
      return;
    }

    // 1. Fly Detection: Check if player is suspended in air for too long
    // Get authoritative ground height (terrain + objects)
    const groundY = await getGroundHeight(validated.pos, terrainData);
    const heightAboveGround = validated.pos[1] - groundY;

    if (heightAboveGround > 5.0 && !validated.isGrounded) {
      player.airTime = (player.airTime || 0) + dt;
      if (player.airTime > 3.0) { // Suspended for more than 3 seconds
        serverLogger.warn("anti-cheat", `Fly/Hover detected for ${player.name} (Height: ${heightAboveGround.toFixed(1)}m). Resetting.`);
        socket.emit("move_sync", { pos: [validated.pos[0], groundY, validated.pos[2]], rot: validated.rot });
        player.airTime = 0;
        return;
      }
    } else {
      player.airTime = 0;
    }
  }
  
  const oldPos = [...(player.pos || [0, 0, 0])] as [number, number, number];
  let finalPos = await resolveWorldCollision(oldPos, validated.pos);
  
  // Ground Enforcement: Keep players from falling THROUGH the ground or objects
  const currentGroundY = await getGroundHeight(finalPos, terrainData);
  if (finalPos[1] < currentGroundY - 0.5) {
    finalPos[1] = currentGroundY;
  }
  
  const driftX = Math.abs(finalPos[0] - validated.pos[0]);
  const driftZ = Math.abs(finalPos[2] - validated.pos[2]);
  const driftY = Math.abs(finalPos[1] - validated.pos[1]);

  // Synchronize client if drift exceeds 1.0m (X/Z) or 2.0m (Y)
  // This prevents the server and client from getting too far out of sync,
  // which is the primary cause of rubber-banding.
  if (driftX > 1.0 || driftZ > 1.0 || driftY > 2.0) {
    socket.emit("move_sync", { pos: finalPos, rot: validated.rot });
  }

  player.pos = finalPos;
  player.rot = validated.rot;
  player.isMoving = validated.isMoving;
  player.isGrounded = validated.isGrounded;
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
    chunkLastAccess.set(`${newChunkX},${newChunkZ}`, Date.now());

    // Incremental World Object Sync (AoI)
    // Only send objects the player hasn't seen yet to save bandwidth
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

  // 3. Targeted Broadcast (AoI)
  const nearbyKeys = getNearbyGridKeys(finalPos, 100);
  const payload = { id: socket.id, ...validated, pos: finalPos };

  // Optimized Broadcast: Only iterate over players in nearby grid cells
  const processed = new Set<string>();
  for (const key of nearbyKeys) {
    const occupantIds = entityGrid.get(key);
    if (!occupantIds) continue;

    for (const otherId of occupantIds) {
      if (otherId === socket.id || processed.has(otherId)) continue;
      
      // Verification: Ensure the other ID is actually a player (not an NPC)
      // and they are within the sync radius
      const otherPlayer = players.get(otherId);
      if (otherPlayer) {
        io.to(otherId).emit("player_move", payload);
        processed.add(otherId);
      }
    }
  }
};

export const handleTeleport = async (socket: Socket, data: any, io: Server) => {
  const validated = validatePayload(socket, TeleportPayloadSchema, data, "teleport");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  // 1. Deduct Gold (Authoritative)
  const TELEPORT_COST = 50;
  if (!takeGold(socket, player, TELEPORT_COST)) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You don't have enough gold to teleport!", color: "#ff4444" });
    return;
  }

  const oldPos = [...(player.pos || [0, 0, 0])] as [number, number, number];
  player.pos = validated.pos;
  player.lastMoveTime = Date.now(); // Reset to avoid speed check delta issues
  player.airTime = 0; // Reset air time for fly detection

  // 1. Update Spatial Grid
  updateInGrid(entityGrid, socket.id, oldPos, validated.pos);

  // 2. Broadcast Teleport Effects
  io.emit("teleport_effect", { pos: oldPos, type: "departure", playerId: socket.id });
  io.emit("teleport_effect", { pos: validated.pos, type: "arrival", playerId: socket.id });

  // 3. Broadcast to others in the destination area
  const nearbyKeys = getNearbyGridKeys(validated.pos, 100);
  const payload = { id: socket.id, pos: validated.pos, rot: player.rot, isMoving: false, isTeleport: true };

  const processed = new Set<string>();
  for (const key of nearbyKeys) {
    const occupantIds = entityGrid.get(key);
    if (!occupantIds) continue;

    for (const otherId of occupantIds) {
      if (otherId === socket.id || processed.has(otherId)) continue;
      const otherPlayer = players.get(otherId);
      if (otherPlayer) {
        io.to(otherId).emit("player_move", payload);
        processed.add(otherId);
      }
    }
  }

  serverLogger.info("net", `Player ${player.name} teleported to ${validated.pos}`);
};
