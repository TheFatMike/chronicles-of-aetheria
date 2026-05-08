import { Socket, Server } from "socket.io";
import { players, lastChatMessage } from "../../state";

export const handleChatMessage = (io: Server, socket: Socket, text: string) => {
  const now = Date.now();
  const lastChat = lastChatMessage.get(socket.id) || 0;
  
  if (now - lastChat < 1500) {
    socket.emit("chat_message", {
      id: "sys-spam",
      sender: "SYSTEM",
      text: "Please wait a moment before sending another message.",
      timestamp: now,
      color: "#ff4444",
      role: "player"
    });
    return;
  }

  lastChatMessage.set(socket.id, now);
  const player = players.get(socket.id);
  io.emit("chat_message", { 
    id: Math.random().toString(), 
    sender: player?.characterName || "Unknown", 
    text, 
    timestamp: now,
    color: player?.color || "#ffffff",
    role: player?.role || "player"
  });
};
