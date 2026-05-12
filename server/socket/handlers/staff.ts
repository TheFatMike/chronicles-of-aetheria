/**
 * @file server/socket/handlers/staff.ts
 * @description Handlers for staff management and player promotions.
 */
import { Server, Socket } from "socket.io";
import { players } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";

import { getUserRole, getRoleLevel } from "../../lib/auth";

const VALID_ROLES = ["player", "mod", "admin", "dev", "owner"];

export const handlePromotePlayer = async (io: Server, socket: Socket, data: { targetId?: string, email?: string, role?: string, action?: 'promote' | 'demote' }) => {
  const sender = players.get(socket.id);
  const senderLevel = getRoleLevel(sender?.role);

  if (!sender || senderLevel < 2) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You do not have permission to promote players.", color: "#ff4444" });
    return;
  }

  const { targetId, email, action = 'promote' } = data;
  let role = data.role;
  
  try {
    let targetUserId = "";
    let targetName = email || "Unknown Player";
    let onlineSocketId: string | null = null;
    let currentRole = "player";

    // 1. Identify Target and Current Role
    if (email) {
      const userQuery = await db.collection("users").where("email", "==", email.toLowerCase()).limit(1).get();
      if (userQuery.empty) {
        socket.emit("chat_message", { sender: "SYSTEM", text: `No user found with email: ${email}`, color: "#ff4444" });
        return;
      }
      targetUserId = userQuery.docs[0].id;
      currentRole = userQuery.docs[0].data().role || "player";
      
      for (const [sid, p] of players.entries()) {
        if (p.userId === targetUserId) {
          onlineSocketId = sid;
          targetName = p.characterName;
          break;
        }
      }
    } else if (targetId) {
      const targetPlayer = players.get(targetId);
      if (!targetPlayer) {
        socket.emit("chat_message", { sender: "SYSTEM", text: "Target player not found or offline.", color: "#ff4444" });
        return;
      }
      targetUserId = targetPlayer.userId;
      targetName = targetPlayer.characterName;
      onlineSocketId = targetId;
      currentRole = targetPlayer.role || "player";
    }

    if (!targetUserId) return;

    // 2. Determine New Role if not specified
    if (!role) {
      const currentIndex = VALID_ROLES.indexOf(currentRole);
      if (action === 'promote') {
        role = VALID_ROLES[Math.min(currentIndex + 1, VALID_ROLES.length - 1)];
      } else {
        role = VALID_ROLES[Math.max(currentIndex - 1, 0)];
      }
    }

    if (role === currentRole) {
      socket.emit("chat_message", { sender: "SYSTEM", text: `${targetName} is already at the ${role.toUpperCase()} rank.`, color: "#facc15" });
      return;
    }

    const requestedLevel = getRoleLevel(role);

    // 3. Hierarchy Check
    let canPerform = false;
    if (senderLevel === 4) canPerform = true;
    else if (senderLevel === 3 && requestedLevel <= 2 && getRoleLevel(currentRole) <= 2) canPerform = true;
    else if (senderLevel === 2 && requestedLevel <= 1 && getRoleLevel(currentRole) <= 1) canPerform = true;

    if (!canPerform) {
      socket.emit("chat_message", { sender: "SYSTEM", text: "You do not have permission to modify that player's rank.", color: "#ff4444" });
      return;
    }

    if (!VALID_ROLES.includes(role)) {
      socket.emit("chat_message", { sender: "SYSTEM", text: "Invalid role specified.", color: "#ff4444" });
      return;
    }

    // Persist to DB
    await db.collection("users").doc(targetUserId).set({ role }, { merge: true });

    // Update in-memory if online
    if (onlineSocketId) {
      const p = players.get(onlineSocketId);
      if (p) {
        p.role = role;
        io.to(onlineSocketId).emit("role_update", { role });
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
