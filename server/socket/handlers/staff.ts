/**
 * @file server/socket/handlers/staff.ts
 * @description Handlers for staff management and player promotions.
 */
import { Server, Socket } from "socket.io";
import { players } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";

const VALID_ROLES = ["player", "mod", "admin", "dev", "owner"];

export const handlePromotePlayer = async (io: Server, socket: Socket, data: { targetId?: string, email?: string, role: string }) => {
  const sender = players.get(socket.id);
  if (!sender || sender.role !== 'owner') {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You do not have permission to promote players.", color: "#ff4444" });
    return;
  }

  const { targetId, email, role } = data;
  if (!VALID_ROLES.includes(role)) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "Invalid role specified.", color: "#ff4444" });
    return;
  }

  try {
    let targetUserId = "";
    let targetName = email || "Unknown Player";
    let onlineSocketId: string | null = null;

    if (email) {
      // Find by Email (Works for offline players)
      const userQuery = await db.collection("users").where("email", "==", email.toLowerCase()).limit(1).get();
      if (userQuery.empty) {
        socket.emit("chat_message", { sender: "SYSTEM", text: `No user found with email: ${email}`, color: "#ff4444" });
        return;
      }
      targetUserId = userQuery.docs[0].id;
      
      // Check if they are currently online to sync live
      for (const [sid, p] of players.entries()) {
        if (p.userId === targetUserId) {
          onlineSocketId = sid;
          targetName = p.characterName;
          break;
        }
      }
    } else if (targetId) {
      // Find by Socket ID
      const targetPlayer = players.get(targetId);
      if (!targetPlayer) {
        socket.emit("chat_message", { sender: "SYSTEM", text: "Target player not found or offline.", color: "#ff4444" });
        return;
      }
      targetUserId = targetPlayer.userId;
      targetName = targetPlayer.characterName;
      onlineSocketId = targetId;
    }

    if (!targetUserId) return;

    // Persist to DB
    await db.collection("users").doc(targetUserId).set({ role }, { merge: true });

    // Update in-memory if online
    if (onlineSocketId) {
      const p = players.get(onlineSocketId);
      if (p) {
        p.role = role;
        io.to(onlineSocketId).emit("chat_message", { 
          sender: "SYSTEM", 
          text: `You have been promoted to ${role.toUpperCase()} by ${sender.characterName}!`, 
          color: "#facc15" 
        });
        // Broadcast to all to update nameplates/chat tags
        io.emit("player_move", { id: onlineSocketId, role: role });
      }
    }

    // Notify sender
    socket.emit("chat_message", { 
      sender: "SYSTEM", 
      text: `Successfully promoted ${targetName} to ${role.toUpperCase()}.`, 
      color: "#22c55e" 
    });

    serverLogger.info("staff", `${sender.characterName} promoted ${targetName} (${targetUserId}) to ${role}`);
  } catch (e: any) {
    serverLogger.error("staff", "Promotion failed", e.message);
    socket.emit("chat_message", { sender: "SYSTEM", text: "Failed to update player role in database.", color: "#ff4444" });
  }
};
