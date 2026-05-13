/**
 * @file server/socket/handlers/terrain.ts
 * @description Handlers for real-time terrain modification and synchronization.
 * Facilitates sculpting and painting actions, ensuring all players see the updated world.
 * @importance Essential: Key for the sandbox and world-building elements of the game.
 */
import { Server, Socket } from "socket.io";
import { terrainData, players } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { saveTerrainRedis } from "../../redis";
import { dirtyTerrainChunks, chunkToTerrain } from "../../state";

export const handleUpdateTerrain = (io: Server, socket: Socket, data: { 
  points: { x: number, z: number, y?: number, deltaY?: number, type?: string }[] 
}) => {
  const player = players.get(socket.id);
  
  if (!player) {
    serverLogger.warn("terrain", `Update rejected: Player not found for socket ${socket.id}`);
  }
  const email = (socket as any).email;
  const isAdminEmail = email?.toLowerCase() === "michaeljhoward94@gmail.com";
  if (!player || (player.role !== 'dev' && !isAdminEmail)) return;

  serverLogger.info("terrain", `Processing ${data.points.length} points from ${player.name}`);

  const updates: any[] = [];

  for (const p of data.points) {
    const key = `${p.x}_${p.z}`;
    const current = terrainData.get(key) || { y: 0, type: 'grass' };
    
    if (p.y !== undefined && !isNaN(p.y)) current.y = p.y;
    if (p.deltaY !== undefined && !isNaN(p.deltaY)) current.y += p.deltaY;
    if (p.type !== undefined) current.type = p.type;
    
    terrainData.set(key, current);
    updates.push({ x: p.x, z: p.z, ...current });
  }

  // 4. Save to Redis and broadcast
  if (updates.length > 0) {
    saveTerrainRedis(updates);
    
    // Mark chunks as dirty for eventual Firestore persistence
    for (const p of updates) {
      const tx = Math.floor(p.x / 100);
      const tz = Math.floor(p.z / 100);
      const chunkKey = `${tx},${tz}`;
      dirtyTerrainChunks.add(chunkKey);
      
      if (!chunkToTerrain.has(chunkKey)) chunkToTerrain.set(chunkKey, new Set());
      chunkToTerrain.get(chunkKey)!.add(`${p.x}_${p.z}`);
    }

    import("../../redis").then(m => m.redis.publish("terrain:sync", JSON.stringify(updates)));
    
    // Broadcast to players near the center of the updates
    const avgX = updates.reduce((sum, p) => sum + p.x, 0) / updates.length;
    const avgZ = updates.reduce((sum, p) => sum + p.z, 0) / updates.length;
    
    import("../../systems/spatial").then(spatial => {
      spatial.broadcastToNearbyPlayers(io, [avgX, 0, avgZ], 150, "terrain_sync", updates);
    });
  }
};

export const handleRequestTerrainSync = (socket: Socket) => {
  const player = players.get(socket.id);
  if (!player || !player.pos) return;

  const SYNC_RADIUS = 150;
  const SYNC_RADIUS_SQ = SYNC_RADIUS * SYNC_RADIUS;

  const nearbyTerrain: any[] = [];
  
  // Use chunk-based lookup for much better performance than iterating everything
  const currentChunkX = Math.floor(player.pos[0] / 100);
  const currentChunkZ = Math.floor(player.pos[2] / 100);

  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const tx = currentChunkX + dx;
      const tz = currentChunkZ + dz;
      const chunkKey = `${tx},${tz}`;
      const terrainKeys = chunkToTerrain.get(chunkKey);
      
      if (terrainKeys) {
        for (const tKey of terrainKeys) {
          const val = terrainData.get(tKey);
          if (val && !isNaN(val.y)) {
            const [x, z] = tKey.split('_').map(Number);
            const dx_dist = x - player.pos[0];
            const dz_dist = z - player.pos[2];
            
            if ((dx_dist * dx_dist + dz_dist * dz_dist) < SYNC_RADIUS_SQ) {
              nearbyTerrain.push({ x, z, ...val });
            }
          }
        }
      }
    }
  }
  
  if (nearbyTerrain.length > 0) {
    serverLogger.debug("terrain", `Full Sync: Sending ${nearbyTerrain.length} points to ${player.name}`);
    socket.emit("terrain_sync", nearbyTerrain);
  }
};
