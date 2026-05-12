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


  // Broadast to other players but do NOT save to database here.
  // Database saving is handled by the 'Batch Save' system to optimize performance and costs.
  if (updates.length > 0) {
    saveTerrainRedis(updates);
    import("../../redis").then(m => m.redis.publish("terrain:sync", JSON.stringify(updates)));
    io.emit("terrain_sync", updates);
  }

  // Sync to Redis for cross-instance consistency
  saveTerrainRedis(updates);
  import("../../redis").then(m => m.redis.publish("terrain:sync", JSON.stringify(updates)));

  // Broadcast updates to all players connected to THIS instance
  io.emit("terrain_sync", updates);
};

export const handleRequestTerrainSync = (socket: Socket) => {
  // For now, send the entire terrain data. 
  // Future: filter by distance
  const allTerrain = [...terrainData.entries()]
    .filter(([_, val]) => !isNaN(val.y))
    .map(([key, val]) => {
      const [x, z] = key.split('_').map(Number);
      return { x, z, ...val };
    });
  
  socket.emit("terrain_sync", allTerrain);
};
