import { Server, Socket } from "socket.io";
import { DEBUG_CONFIG, DebugCategory } from "../../../src/debug.config";
import { serverLogger } from "../../logger";
import { players } from "../../state";

export const handleDebugToggle = (io: Server, socket: Socket, data: { category?: DebugCategory, enabled: boolean, global?: boolean }) => {
  const player = players.get(socket.id);
  
  // Only allow developers/admins to toggle debug settings
  if (!player || (player.role !== 'dev' && player.role !== 'admin' && player.characterName !== 'Michael')) {
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
