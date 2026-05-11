/**
 * @file server/socket/handlers/session.ts
 * @description Manages player connection lifecycles and authentication sessions.
 * Handles login, logout, and ensuring the server state is cleaned up when players leave.
 * @importance Critical: The gateway for players to access the game and the primary safeguard for state consistency.
 */
import { Server, Socket } from "socket.io";
import admin from "firebase-admin";
import { players, entities, worldObjects, spawners, logoutTimers, playerKnownEntities, playerLastGridCell, lastSkillUse, lastChatMessage, dirtyPlayers, activeTrades } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { CharacterModel } from "../../../src/models/CharacterModel";
import { filterNearby, updateInGrid, entityGrid, getGridKey } from "../../systems/spatial";
import { getUserRole } from "../../lib/auth";
import { handleRequestTerrainSync } from "./terrain";
import { removePlayerRedis } from "../../redis";
import { handlePartyLeave } from "./party";
import { handleTradeCancel } from "./trade";
import { loadTerrainRegion } from "../../systems/persistence";

export const handleJoin = async (io: Server, socket: Socket, playerData: any, userId: string, email: string) => {
  try {
    // 1. Get Account Role
    const userRole = await getUserRole(userId, email);

    // 2. Check for existing "Blipped" session to take over
    let existingPlayer = null;
    for (const p of players.values()) {
      if (p.userId === userId && p.characterId === playerData.characterId) {
        existingPlayer = p;
        break;
      }
    }

    if (existingPlayer) {
      serverLogger.info("net", `Session Takeover for ${existingPlayer.characterName}`);
      const timer = logoutTimers.get(existingPlayer.id);
      if (timer) {
        clearTimeout(timer);
        logoutTimers.delete(existingPlayer.id);
      }
      players.set(socket.id, { ...existingPlayer, id: socket.id });
      players.delete(existingPlayer.id);
    } else {
      // 3. New Session: Get Character Data from DB
      const charDoc = await db.collection("users").doc(userId).collection("characters").doc(playerData.characterId).get();
      if (!charDoc.exists) {
        serverLogger.warn("net", `Join rejected: Character not found for ${userId}`);
        return;
      }
      const charData = CharacterModel.fromFirestore(charDoc.id, charDoc.data(), userRole);

      players.set(socket.id, {
        id: socket.id,
        userId: userId,
        characterId: playerData.characterId,
        characterName: charData.name,
        class: charData.class,
        color: charData.color,
        role: userRole,
        pos: charData.pos || playerData.pos || [0, 1, 0],
        rot: charData.rot || playerData.rot || [0, 0, 0],
        hp: charData.hp,
        maxHp: charData.maxHp,
        mp: charData.mp,
        maxMp: charData.maxMp,
        stats: charData.stats,
        equipment: charData.equipment,
        inventory: charData.inventory || Array(30).fill(null),
        hotbar: charData.hotbar || Array(10).fill(null),
        quests: charData.quests || {},
        gold: charData.gold || 0,
        level: charData.level || 1,
        exp: charData.exp || 0,
        maxExp: charData.maxExp || 100
      });
      updateInGrid(entityGrid, socket.id, null, players.get(socket.id).pos);
    }

    const currentPlayer = players.get(socket.id);
    serverLogger.info("net", `Player joined: ${currentPlayer.characterName} (${currentPlayer.role})`);

    // 4. Sync State
    socket.emit("session_start", currentPlayer);
    
    // Broadcast join to nearby players instead of everyone
    const nearbyToNew = filterNearby(Array.from(players.values()), currentPlayer.pos, 150, 'entity');
    for (const p of nearbyToNew) {
      if (p.id !== socket.id) io.to(p.id).emit("player_join", currentPlayer);
    }
    
    // Send all nearby players to the new player
    socket.emit("players", nearbyToNew);
    
    const nearbyEntities = filterNearby(Array.from(entities.values()), currentPlayer.pos, 100, 'entity');
    socket.emit("entities", nearbyEntities);
    
    const nearbyWorldObjects = filterNearby(Array.from(worldObjects.values()), currentPlayer.pos, 150, 'object');
    socket.emit("world_sync", nearbyWorldObjects);
    
    socket.emit("spawners_sync", Array.from(spawners.values()));
    
    // 5. Regional Terrain & Sync
    await loadTerrainRegion(currentPlayer.pos[0], currentPlayer.pos[2]);
    handleRequestTerrainSync(socket);
  } catch (e: any) {
    serverLogger.error("net", "Join error", e.message);
  }
};

export const handleDisconnect = (io: Server, socket: Socket) => {
  const player = players.get(socket.id);
  if (player && player.userId && player.characterId) {
    serverLogger.info("net", `Player blipped: ${player.characterName}. 10s logout timer started.`);
    
    const timer = setTimeout(async () => {
      logoutTimers.delete(socket.id);
      if (!players.has(socket.id)) return;

      const p = players.get(socket.id);

      // Handle Party Leave
      if (p.partyId) {
        handlePartyLeave(io, socket);
      }

      // Handle Trade Cancellation
      for (const [tradeId, trade] of activeTrades.entries()) {
        if (trade.p1 === socket.id || trade.p2 === socket.id) {
          handleTradeCancel(io, socket, tradeId);
        }
      }

      try {
        const charRef = db.collection("users").doc(p.userId).collection("characters").doc(p.characterId);
        await charRef.set({ 
          pos: p.pos, 
          rot: p.rot,
          hp: p.hp,
          mp: p.mp,
          stats: p.stats,
          equipment: p.equipment,
          class: p.class,
          color: p.color,
          gold: p.gold || 0,
          level: p.level || 1,
          exp: p.exp || 0,
          maxExp: p.maxExp || 100,
          lastActive: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        serverLogger.info("net", `Saved & Logged out: ${p.characterName}`);
      } catch (e: any) {
        serverLogger.error("firestore", `Save failed for session ${socket.id}`, e.message);
      }
      
      // Remove from Grid
      if (player.pos) {
        const key = getGridKey(player.pos);
        entityGrid.get(key)?.delete(socket.id);
      }

      // Final Cleanup of all session-related maps
      players.delete(socket.id);
      playerKnownEntities.delete(socket.id);
      playerLastGridCell.delete(socket.id);
      lastSkillUse.delete(socket.id);
      lastChatMessage.delete(socket.id);
      dirtyPlayers.delete(socket.id);
      
      // Redis Cleanup: Remove from spatial index and clear hash
      removePlayerRedis(socket.id);

      io.emit("player_leave", socket.id); 
    }, 10000);

    logoutTimers.set(socket.id, timer);
  } else {
    // Cleanup even for unauthenticated sockets
    players.delete(socket.id);
    playerKnownEntities.delete(socket.id);
    playerLastGridCell.delete(socket.id);
    lastSkillUse.delete(socket.id);
    lastChatMessage.delete(socket.id);
    dirtyPlayers.delete(socket.id);
    io.emit("player_leave", socket.id);
  }
};
