/**
 * @file server/socket/handlers/passive.ts
 * @description Handlers for passive skill tree interactions.
 * Processes talent point allocations and validates requirements server-side.
 */
import { Socket } from "socket.io";
import { players } from "../../state";
import { PASSIVE_NODES } from "../../../src/data/passives";
import { serverLogger } from "../../logger";

export const handleAllocatePassive = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const { nodeId } = data;
  const node = PASSIVE_NODES.find(n => n.id === nodeId);

  if (!node) {
    return socket.emit("error", { message: "Invalid passive node." });
  }

  // 1. Check class
  if (node.class && node.class.toLowerCase() !== player.class.toLowerCase()) {
    return socket.emit("error", { message: "Class mismatch for this talent." });
  }

  // 2. Check points
  if ((player.passivePoints || 0) <= 0) {
    return socket.emit("error", { message: "No passive points available." });
  }

  const currentPoints = (player.passives || {})[nodeId] || 0;

  // 3. Check max points
  if (currentPoints >= node.maxPoints) {
    return socket.emit("error", { message: "This talent is already at maximum level." });
  }

  // 4. Check dependencies
  if (node.dependencies && node.dependencies.length > 0) {
    const unmet = node.dependencies.find(depId => {
      const depNode = PASSIVE_NODES.find(n => n.id === depId);
      const depPoints = (player.passives || {})[depId] || 0;
      return depPoints < (depNode?.maxPoints || 1);
    });

    if (unmet) {
      return socket.emit("error", { message: "Prerequisites not met." });
    }
  }

  // SUCCESS - Allocate
  if (!player.passives) player.passives = {};
  player.passives[nodeId] = currentPoints + 1;
  player.passivePoints -= 1;

  // Apply Stat Updates (Immediate In-Memory)
  if (node.stats) {
    Object.entries(node.stats).forEach(([stat, value]) => {
      if (player.stats && player.stats[stat] !== undefined) {
        player.stats[stat] += value;
      }
    });
  }

  // Notify Client
  socket.emit("player_stats", player); // Send updated stats/points
  socket.emit("session_start", player); // Full update for the talent UI
  
  serverLogger.info("net", `${player.characterName} allocated point to ${node.name} (${player.passivePoints} remaining)`);
};
