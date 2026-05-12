/**
 * @file server/socket/handlers/debug.ts
 * @description Provides administrative socket handlers for debugging and testing.
 * Allows for real-time monitoring and manipulation of server state by authorized clients.
 * @importance Essential: Crucial for development and troubleshooting in a live or testing environment.
 */
import { Server, Socket } from "socket.io";
import { DEBUG_CONFIG, DebugCategory } from "../../../src/debug.config";
import { serverLogger } from "../../logger";
import { players } from "../../state";

import { isEditorAuthorized } from "./editor";

export const handleDebugToggle = (io: Server, socket: Socket, data: { category?: DebugCategory, enabled: boolean, global?: boolean }) => {
  const player = players.get(socket.id);
  
  // Only allow authorized staff (Owner/Dev/Admin) to toggle debug settings
  if (!isEditorAuthorized(socket, player)) {
    return;
  }

  if (data.global) {
    DEBUG_CONFIG.ENABLED = data.enabled;
    serverLogger.info("system", `Global Debug ${data.enabled ? 'ENABLED' : 'DISABLED'} by ${player.characterName}`);
  } else if (data.category) {
    DEBUG_CONFIG.SERVER[data.category] = data.enabled;
    serverLogger.info("system", `Debug Category ${data.category} ${data.enabled ? 'ENABLED' : 'DISABLED'} by ${player.characterName}`);
  }

  // Broadcast the updated config to all other developers if needed, 
  // but for now, just updating the server-side state is enough.
  // Actually, let's emit back to the caller to confirm.
  socket.emit("debug_config_updated", DEBUG_CONFIG);
};
