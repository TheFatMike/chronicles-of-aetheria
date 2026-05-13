/**
 * @file server/socket/handlers/session.ts
 * @description Manages player connection lifecycles and authentication sessions.
 * Handles login, logout, and ensuring the server state is cleaned up when players leave.
 * @importance Critical: The gateway for players to access the game and the primary safeguard for state consistency.
 */
import { Server, Socket } from "socket.io";
import admin from "firebase-admin";
import { players, entities, worldObjects, spawners, logoutTimers, playerKnownEntities, playerKnownObjects, playerLastGridCell, lastSkillUse, lastChatMessage, dirtyPlayers, activeTrades, characterNameToId } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { CharacterModel } from "../../../src/models/CharacterModel";
import { filterNearby, updateInGrid, entityGrid, getGridKey } from "../../systems/spatial";
import { getUserRole } from "../../lib/auth";
import { handleRequestTerrainSync } from "./terrain";
import { removePlayerRedis, getCharacterPositionRedis } from "../../redis";
import { handlePartyLeave } from "./party";
import { handleTradeCancel } from "./trade";
import { loadTerrainRegion } from "../../systems/persistence";

import { JoinPayloadSchema } from "../../lib/schemas";
import { validatePayload } from "../../lib/validation";

export const handleJoin = async (io: Server, socket: Socket, playerData: any, userId: string, email: string) => {
  const validated = validatePayload(socket, JoinPayloadSchema, playerData, "join");
  if (!validated) return;

  try {
    // 1. Get Account Role
    const userRole = await getUserRole(userId, email);

    // 2. Check for existing "Blipped" session to take over
    let existingPlayer = null;
    for (const p of players.values()) {
      if (p.userId === userId && p.characterId === validated.characterId) {
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
      const charDoc = await db.collection("users").doc(userId).collection("characters").doc(validated.characterId).get();
      if (!charDoc.exists) {
        serverLogger.warn("net", `Join rejected: Character not found for ${userId}`);
        return;
      }
      const charData = CharacterModel.fromFirestore(charDoc.id, charDoc.data(), userRole);

      // Check Redis for a "hot" position first (survives refreshes better than Firestore)
      const redisPos = await getCharacterPositionRedis(validated.characterId);
      if (redisPos) {
        serverLogger.info("net", `Restored position from Redis for ${charData.name}: ${redisPos}`);
      }

      players.set(socket.id, {
        id: socket.id,
        userId: userId,
        characterId: validated.characterId,
        characterName: charData.name,
        class: charData.class,
        color: charData.color,
        role: userRole,
        pos: redisPos || charData.pos || validated.pos || [0, 1, 0],
        rot: charData.rot || validated.rot || [0, 0, 0],
        hp: charData.hp,
        maxHp: charData.maxHp,
        mp: charData.mp,
        maxMp: charData.maxMp,
        stats: charData.stats,
        equipment: charData.equipment,
        inventory: charData.inventory || Array(30).fill(null),
        bank: charData.bank || [],
        hotbar: charData.hotbar || Array(10).fill(null),
        quests: charData.quests || {},
        gold: charData.gold || 0,
        level: charData.level || 1,
        exp: charData.exp || 0,
        maxExp: charData.maxExp || 100,
        passivePoints: charData.passivePoints || 0,
        passives: charData.passives || {}
      });

      // BACKFILL: Ensure existing players get points for their level (1 per level past 1)
      const p = players.get(socket.id);
      const expectedTotal = (p.level || 1) - 1;
      const spent = Object.values(p.passives || {}).reduce((sum: number, val: any) => sum + val, 0);
      const currentAvailable = p.passivePoints || 0;
      
      if (spent + currentAvailable < expectedTotal) {
        const missing = expectedTotal - (spent + currentAvailable);
        p.passivePoints = (p.passivePoints || 0) + missing;
        serverLogger.info("net", `Backfilled ${missing} passive points for ${p.characterName} (Level ${p.level})`);
      }

      characterNameToId.set(charData.name.toLowerCase(), socket.id);
      updateInGrid(entityGrid, socket.id, null, players.get(socket.id).pos);
    }

    const currentPlayer = players.get(socket.id);
    serverLogger.info("net", `Player joined: ${currentPlayer.characterName} (${currentPlayer.role})`);

    // --- CONSISTENT SYNC SEQUENCE (For New & Takeover Sessions) ---
    
    // 1. Send Character State
    socket.emit("session_start", currentPlayer);
    
    // 2. Load & Sync World Context (Terrain & Static Objects)
    await loadTerrainRegion(currentPlayer.pos[0], currentPlayer.pos[2]);
    
    const nearbyWorldObjects = filterNearby(worldObjects, currentPlayer.pos, 150, 'object');
    socket.emit("world_sync", nearbyWorldObjects);
    socket.emit("world_objects_sync", Array.from(worldObjects.values()));
    
    handleRequestTerrainSync(socket);
    
    // 3. Signal Ready to Client
    socket.emit("world_ready");

    // 4. Broadcast & Sync Active Entities (Players & NPCs)
    const nearbyToNew = filterNearby(players, currentPlayer.pos, 150, 'entity');
    for (const p of nearbyToNew) {
      if (p.id !== socket.id) io.to(p.id).emit("player_join", currentPlayer);
    }
    
    socket.emit("players", nearbyToNew);
    
    const nearbyEntities = filterNearby(entities, currentPlayer.pos, 100, 'entity');
    socket.emit("entities", nearbyEntities);
    
    socket.emit("spawners_sync", Array.from(spawners.values()));
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
          inventory: p.inventory || [],
          bank: p.bank || [],
          hotbar: p.hotbar || [],
          quests: p.quests || {},
          class: p.class,
          color: p.color,
          gold: p.gold || 0,
          level: p.level || 1,
          exp: p.exp || 0,
          maxExp: p.maxExp || 100,
          passivePoints: p.passivePoints || 0,
          passives: p.passives || {},
          lastActive: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        serverLogger.info("net", `Saved & Logged out: ${p.characterName}`);
      } catch (e: any) {
        serverLogger.error("firestore", `Save failed for session ${socket.id}`, e.message);
      }
      
      cleanupSession(io, socket.id, p.characterName);
    }, 10000);

    logoutTimers.set(socket.id, timer);
  } else {
    cleanupSession(io, socket.id, player?.characterName);
  }
};

/**
 * Centralized cleanup for player sessions to prevent memory leaks.
 */
function cleanupSession(io: Server, socketId: string, characterName?: string) {
  // 1. Grid Cleanup
  const p = players.get(socketId);
  if (p?.pos) {
    const key = getGridKey(p.pos);
    entityGrid.get(key)?.delete(socketId);
  }

  // 2. Map Cleanup
  players.delete(socketId);
  playerKnownEntities.delete(socketId);
  playerKnownObjects.delete(socketId);
  playerLastGridCell.delete(socketId);
  lastSkillUse.delete(socketId);
  lastChatMessage.delete(socketId);
  dirtyPlayers.delete(socketId);
  
  if (characterName) {
    characterNameToId.delete(characterName.toLowerCase());
  }

  // 3. Redis Cleanup
  removePlayerRedis(socketId);

  // 4. Notify Others
  io.emit("player_leave", socketId);
}

