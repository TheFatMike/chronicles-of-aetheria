import { Socket, Server } from "socket.io";
import { players } from "../../state";
import { serverLogger } from "../../logger";
import { resolveWorldCollision, updateInGrid, entityGrid, getNearbyGridKeys } from "../../systems/spatial";

export const handleMove = (socket: Socket, data: any, io: Server) => {
  const player = players.get(socket.id);
  if (!player) return;

  const now = Date.now();
  const dt = (now - (player.lastMoveTime || now)) / 1000;
  
  if (player.pos && dt > 0) {
    const dx = data.pos[0] - player.pos[0];
    const dy = data.pos[1] - player.pos[1];
    const dz = data.pos[2] - player.pos[2];
    const distSq = dx*dx + dy*dy + dz*dz;
    const speedSq = distSq / (dt * dt);

    if (speedSq > 1600 && dt > 0.1) { 
      serverLogger.warn("anti-cheat", `Speed/Teleport detected for ${player.characterName}. Resetting.`);
      socket.emit("session_start", player);
      return;
    }
  }
  
  const oldPos = [...player.pos] as [number, number, number];
  let finalPos = resolveWorldCollision(oldPos, data.pos);
  
  if (finalPos[0] !== data.pos[0] || finalPos[2] !== data.pos[2]) {
    socket.emit("move_sync", { pos: finalPos, rot: data.rot });
  }

  player.pos = finalPos;
  player.rot = data.rot;
  player.isMoving = data.isMoving;
  player.isGrounded = data.isGrounded;
  player.lastMoveTime = now;

  // 1. Update Spatial Grid
  updateInGrid(entityGrid, socket.id, oldPos, finalPos);

  // 2. Targeted Broadcast (AoI)
  const nearbyKeys = getNearbyGridKeys(finalPos, 100);
  const payload = { id: socket.id, ...data, pos: finalPos };

  // Only broadcast to players in nearby grid cells
  for (const p of players.values()) {
    if (p.id === socket.id) continue;
    
    // Check if player is in one of the nearby keys
    const pKey = Math.floor(p.pos[0] / 50) + "," + Math.floor(p.pos[2] / 50); // Hardcoded GRID_SIZE for speed here or import
    if (nearbyKeys.includes(pKey)) {
      io.to(p.id).emit("player_move", payload);
    }
  }
};
