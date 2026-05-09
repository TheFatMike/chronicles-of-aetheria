import { Server, Socket } from "socket.io";
import { terrainData, players } from "../../state";
import { db } from "../../db";

export const handleUpdateTerrain = (io: Server, socket: Socket, data: { 
  points: { x: number, z: number, y?: number, deltaY?: number, type?: string }[] 
}) => {
  const player = players.get(socket.id);
  if (!player || (player.role !== 'admin' && player.role !== 'dev' && player.role !== 'mod')) return;

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

  // Persist to Firestore
  if (updates.length > 0) {
    const batch = db.batch();
    updates.forEach(u => {
      const key = `${u.x}_${u.z}`;
      const docRef = db.collection("terrain").doc(key);
      batch.set(docRef, { y: u.y, type: u.type });
    });
    
    batch.commit().catch((e: any) => {
      console.error("Failed to persist terrain updates:", e);
    });
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
