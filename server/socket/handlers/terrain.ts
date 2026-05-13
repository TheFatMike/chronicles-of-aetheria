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

  serverLogger.info("terrain", `Processing ${data.points.length} points from ${player.characterName}`);

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
    io.emit("terrain_sync", updates);
  }
};

export const handleRequestTerrainSync = (socket: Socket) => {
  const player = players.get(socket.id);
  if (!player) return;

  // OPTIMIZATION: Only send terrain edits within 150 units of the player
  const SYNC_RADIUS = 150;
  const SYNC_RADIUS_SQ = SYNC_RADIUS * SYNC_RADIUS;

  const nearbyTerrain = [...terrainData.entries()]
    .filter(([key, val]) => {
      if (isNaN(val.y)) return false;
      const [x, z] = key.split('_').map(Number);
      const dx = x - player.pos[0];
      const dz = z - player.pos[2];
      return (dx * dx + dz * dz) < SYNC_RADIUS_SQ;
    })
    .map(([key, val]) => {
      const [x, z] = key.split('_').map(Number);
      return { x, z, ...val };
    });
  
  if (nearbyTerrain.length > 0) {
    socket.emit("terrain_sync", nearbyTerrain);
  }
};
