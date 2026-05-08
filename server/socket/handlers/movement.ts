import { Socket } from "socket.io";
import { players } from "../../state";
import { serverLogger } from "../../logger";
import { resolveWorldCollision } from "../../systems/spatial";

export const handleMove = (socket: Socket, data: any) => {
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

    // Max speed check (allowing more buffer for lag/jumps)
    if (speedSq > 1600 && dt > 0.1) { 
      serverLogger.warn("anti-cheat", `Speed/Teleport detected for ${player.characterName}. Resetting.`);
      socket.emit("session_start", player); // Snap them back
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
  socket.broadcast.emit("player_move", { id: socket.id, ...data });
};
