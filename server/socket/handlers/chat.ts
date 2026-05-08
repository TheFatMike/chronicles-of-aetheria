import { Socket, Server } from "socket.io";
import { players, lastChatMessage } from "../../state";
import { handlePartyInvite, handlePartyLeave } from "./party";
import { handleTradeRequest } from "./trade";

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
  if (!player) return;

  // Handle Slash Commands
  if (text.startsWith("/")) {
    const parts = text.split(" ");
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ");

    if (cmd === "/invite" || cmd === "/party") {
      const target = Array.from(players.values()).find(p => p.characterName.toLowerCase() === arg.toLowerCase());
      if (target) {
        handlePartyInvite(io, socket, target.id);
      } else {
        socket.emit("chat_message", { sender: "SYSTEM", text: `Player '${arg}' not found.`, color: "#ff4444", timestamp: now });
      }
      return;
    }

    if (cmd === "/trade") {
      const target = Array.from(players.values()).find(p => p.characterName.toLowerCase() === arg.toLowerCase());
      if (target) {
        handleTradeRequest(io, socket, target.id);
      } else {
        socket.emit("chat_message", { sender: "SYSTEM", text: `Player '${arg}' not found.`, color: "#ff4444", timestamp: now });
      }
      return;
    }

    if (cmd === "/leave") {
      handlePartyLeave(io, socket);
      return;
    }
  }

  io.emit("chat_message", { 
    id: Math.random().toString(), 
    sender: player.characterName, 
    text, 
    timestamp: now,
    color: player.color,
    role: player.role || "player"
  });
};
