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

export const handleUpdateTerrain = (io: Server, socket: Socket, data: { 
  points: { x: number, z: number, y?: number, deltaY?: number, type?: string }[] 
}) => {
  const player = players.get(socket.id);
  
  if (!player) {
    serverLogger.warn("terrain", `Update rejected: Player not found for socket ${socket.id}`);
    return;
  }

  const hasPermission = player.role === 'admin' || player.role === 'dev' || player.role === 'mod';
  if (!hasPermission) {
    serverLogger.warn("terrain", `Update rejected: Player ${player.characterName} (${player.role}) lacks permissions`);
    return;
  }

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

  // Persist to Firestore with chunking
  if (updates.length > 0) {
    const CHUNK_SIZE = 400; // Firestore limit is 500
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const batch = db.batch();
      
      chunk.forEach(u => {
        const key = `${u.x}_${u.z}`;
        const docRef = db.collection("terrain").doc(key);
        const chunkX = Math.floor(u.x / 100);
        const chunkZ = Math.floor(u.z / 100);
        const chunkId = `chunk_${chunkX}_${chunkZ}`;

        batch.set(docRef, { 
          x: u.x, 
          z: u.z, 
          chunkId,
          y: u.y, 
          type: u.type 
        }, { merge: true });
      });

      batch.commit()
        .then(() => {
          serverLogger.info("firestore", `Persisted chunk of ${chunk.length} terrain points.`);
        })
        .catch((e: any) => {
          serverLogger.error("firestore", `Failed to persist terrain chunk: ${e.message}`);
        });
    }
  }

  // Broadcast updates to all players
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
