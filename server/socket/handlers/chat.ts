/**
 * @file server/socket/handlers/chat.ts
 * @description Manages communication between players via socket-based chat.
 * Supports global, localized, and party-specific messaging as well as chat commands.
 * @importance Essential: The primary tool for social interaction and community building within the game.
 */
import { Socket, Server } from "socket.io";
import { players, lastChatMessage, characterNameToId } from "../../state";
import { handlePartyInvite, handlePartyLeave } from "./party";
import { handleTradeRequest } from "./trade";
import { redis } from "../../redis";

import { ChatPayloadSchema } from "../../lib/schemas";
import { validatePayload } from "../../lib/validation";

export const handleChatMessage = (io: Server, socket: Socket, text: string) => {
  const validatedText = validatePayload(socket, ChatPayloadSchema, text, "chat");
  if (!validatedText) return;

  const now = Date.now();
  const lastChat = lastChatMessage.get(socket.id) || 0;
  
  let cleanText = (validatedText || "").trim();
  if (!cleanText || cleanText.length > 256) return;

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
      const targetId = characterNameToId.get(arg.toLowerCase());
      if (targetId) {
        handlePartyInvite(io, socket, targetId);
      } else {
        socket.emit("chat_message", { sender: "SYSTEM", text: `Player '${arg}' not found.`, color: "#ff4444", timestamp: now });
      }
      return;
    }

    if (cmd === "/trade") {
      const targetId = characterNameToId.get(arg.toLowerCase());
      if (targetId) {
        handleTradeRequest(io, socket, targetId);
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

  const payload = { 
    id: Math.random().toString(36).substring(2), 
    sender: player.characterName, 
    text: cleanText, 
    timestamp: now,
    color: player.color,
    role: player.role || "player"
  };

  // Instead of broadcasting to just this server, we publish to Redis
  // Our server (and all other instances) is listening to this channel and will broadcast it to local players
  redis.publish("chat:global", JSON.stringify(payload));
};
