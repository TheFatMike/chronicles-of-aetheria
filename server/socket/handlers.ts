import admin from "firebase-admin";
import { Server, Socket } from "socket.io";
import { players, entities, spawners, worldObjects, logoutTimers, lastSkillUse, lastChatMessage } from "../state";
import { serverLogger } from "../logger";
import { db } from "../db";
import { CharacterModel } from "../../src/models/CharacterModel";
import { CHARACTER_CLASSES } from "../../src/constants";
import { SAMPLE_QUESTS } from "../../src/data/quests";
import { handleCastSkill } from "../logic/combat";
import { initializeSpawners, GET_HITBOXES } from "../systems/gameEngine";
import { filterNearby, checkWorldCollision } from "../systems/spatial";


export const registerHandlers = (io: Server, socket: Socket) => {
  const email = (socket as any).email;
  const userId = (socket as any).userId;

  socket.on("join", async (playerData) => {
    try {
      // 1. Get Account Role
      let userRole = "player";
      const isOwner = email && email.toLowerCase() === "michaeljhoward94@gmail.com";
      if (isOwner) userRole = "dev";

      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) userRole = userDoc.data()?.role || userRole;

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
        // Cancel the pending logout
        const timer = logoutTimers.get(existingPlayer.id);
        if (timer) {
          clearTimeout(timer);
          logoutTimers.delete(existingPlayer.id);
        }
        // Inherit state
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
          quests: charData.quests || {}
        });
      }

      const currentPlayer = players.get(socket.id);
      serverLogger.info("net", `Player joined: ${currentPlayer.characterName} (${currentPlayer.role})`);

      // 4. Sync State
      socket.emit("session_start", currentPlayer); // Tell the client their confirmed state
      
      const allPlayers = Array.from(players.values());
      io.emit("players", allPlayers);
      
      const nearbyEntities = filterNearby(Array.from(entities.values()), currentPlayer.pos, 100);
      socket.emit("entities", nearbyEntities);
      
      const nearbyWorldObjects = filterNearby(Array.from(worldObjects.values()), currentPlayer.pos, 150);
      socket.emit("world_sync", nearbyWorldObjects);
      
      socket.emit("spawners_sync", Array.from(spawners.values()));
    } catch (e: any) {
      serverLogger.error("net", "Join error", e.message);
    }
  });

  socket.on("move", (data) => {
    const player = players.get(socket.id);
    if (player) {
      const now = Date.now();
      const dt = (now - (player.lastMoveTime || now)) / 1000;
      
      if (player.pos && dt > 0) {
        const dx = data.pos[0] - player.pos[0];
        const dy = data.pos[1] - player.pos[1];
        const dz = data.pos[2] - player.pos[2];
        const distSq = dx*dx + dy*dy + dz*dz;
        const speedSq = distSq / (dt * dt);

        // Max speed check (allowing more buffer for lag/jumps)
        // Move speed is 10, let's cap at 40m/s (high buffer for lag spikes)
        if (speedSq > 1600 && dt > 0.1) { 
          serverLogger.warn("anti-cheat", `Speed/Teleport detected for ${player.characterName}. Resetting.`);
          socket.emit("session_start", player); // Snap them back
          return;
        }
      }
      
      const oldPos = [...player.pos] as [number, number, number];

      // 2. Anti-Cheat & Smoothing: World Collision Check (with Sliding)
      let finalPos = [...data.pos] as [number, number, number];
      const requestedPos = data.pos;
      
      if (checkWorldCollision(requestedPos)) {
        // Try X only
        const tryX: [number, number, number] = [requestedPos[0], oldPos[1], oldPos[2]];
        const tryZ: [number, number, number] = [oldPos[0], oldPos[1], requestedPos[2]];
        
        if (!checkWorldCollision(tryX)) {
          finalPos = tryX;
        } else if (!checkWorldCollision(tryZ)) {
          finalPos = tryZ;
        } else {
          // Both blocked or corner - snap back quietly
          // socket.emit("session_start", player); 
          return;
        }
        
        // If we slid, sync the new "slid" position back to the client
        socket.emit("move_sync", { pos: finalPos, rot: data.rot });
      }

      player.pos = finalPos;
      player.rot = data.rot;
      player.isMoving = data.isMoving;
      player.isGrounded = data.isGrounded;
      player.lastMoveTime = now;
      socket.broadcast.emit("player_move", { id: socket.id, ...data });
    }
  });

  socket.on("cast_skill", (data) => handleCastSkill(socket, io, data));

  socket.on("create_character", async (data) => {
    try {
      // 0. Get Account Role
      let userRole = "player";
      const isOwner = email && email.toLowerCase() === "michaeljhoward94@gmail.com";
      if (isOwner) userRole = "dev";
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) userRole = userDoc.data()?.role || userRole;

      const { characterName, class: classId, color } = data;
      const lowerName = characterName.toLowerCase().trim();
      const nameRef = db.collection("characterNames").doc(lowerName);

      // 1. Basic Validation
      if (characterName.length < 3 || characterName.length > 16) {
        return socket.emit("error", { message: "Invalid name length" });
      }

      const selectedClassData = CHARACTER_CLASSES.find(c => c.id === classId);
      if (!selectedClassData) {
        return socket.emit("error", { message: "Invalid class selection" });
      }

      // 2. Transaction for Name Claim and Creation
      const result = await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
        const nameDoc = (await transaction.get(nameRef)) as any as admin.firestore.DocumentSnapshot;
        if (nameDoc.exists) {
          throw new Error("This name has already been claimed.");
        }

        const charCol = db.collection("users").doc(userId).collection("characters");
        const charDocRef = charCol.doc();
        
        // HARDCODED SERVER-SIDE STATS (CANNOT BE HACKED)
        const baseStats = selectedClassData.stats;
        const defaultEquipment = { head: null, chest: null, legs: null, boots: null, weapon: null, offhand: null, accessory: null };
        const { maxHp, maxMp } = CharacterModel.calculateDerivedStats(baseStats, defaultEquipment);

        const charData = {
          name: characterName.trim(),
          class: classId,
          color: color,
          level: 1,
          stats: baseStats,
          hp: maxHp,
          mp: maxMp,
          inventory: Array(30).fill(null), // Empty starter inventory
          hotbar: Array(10).fill(null),
          equipment: defaultEquipment,
          role: userRole,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        transaction.set(nameRef, { 
          ownerId: userId,
          id: lowerName,
          characterId: charDocRef.id,
          claimedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.set(charDocRef, charData);

        return { id: charDocRef.id, ...charData };
      });

      socket.emit("character_created", result);
      serverLogger.info("net", `Created character ${characterName} for ${userId}`);
    } catch (e: any) {
      serverLogger.error("net", "Character creation failed", e.message);
      socket.emit("error", { message: e.message });
    }
  });

  socket.on("loot_entity", (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    
    const target = entities.get(data.targetId);
    if (target && target.isDead) {
      const dx = player.pos[0] - target.pos[0];
      const dz = player.pos[2] - target.pos[2];
      const distSq = dx*dx + dz*dz;
      if (distSq < 25) { 
        if (target.loot && target.loot.length > 0) {
          socket.emit("chat_message", {
            id: "sys-" + Date.now(),
            sender: "SYSTEM",
            text: `You looted: ${target.loot.join(", ")}`,
            timestamp: Date.now(),
            color: "#ffd700",
            role: "player"
          });
        }
        entities.delete(target.id);
        io.emit("entity_despawn", target.id);
      }
    }
  });

  socket.on("save_world_object", async (data) => {
    const player = players.get(socket.id);
    if (!player || !["dev", "admin"].includes(player.role)) return;

    const { id, type, pos, rot, scale } = data;
    const worldObj = { id, type, pos, rot, scale };

    try {
      // 1. Update Database
      await db.collection("world").doc(id).set(worldObj, { merge: true });

      // 2. Update Server Memory (Hitboxes)
      const hitboxes = GET_HITBOXES(type, scale);
      worldObjects.set(id, { ...worldObj, hitboxes });

      // 3. Special case: Spawners
      if (type.startsWith("spawner_")) {
        await initializeSpawners(); // Re-initialize all spawners from DB
        io.emit("spawners_sync", Array.from(spawners.values()));
      }

      // 4. Broadcast to everyone
      io.emit("world_object_updated", worldObj);
      serverLogger.info("world", `${player.characterName} updated ${type} (${id})`);
    } catch (e: any) {
      serverLogger.error("world", "Failed to save world object", e.message);
    }
  });

  socket.on("remove_world_object", async (data) => {
    const player = players.get(socket.id);
    if (!player || !["dev", "admin"].includes(player.role)) return;

    const { id } = data;
    const existing = worldObjects.get(id);

    try {
      // 1. Update Database
      await db.collection("world").doc(id).delete();

      // 2. Update Server Memory
      worldObjects.delete(id);

      // 3. Special case: Spawners
      if (existing?.type.startsWith("spawner_")) {
        await initializeSpawners();
        io.emit("spawners_sync", Array.from(spawners.values()));
      }

      // 4. Broadcast to everyone
      io.emit("world_object_removed", { id });
      serverLogger.info("world", `${player.characterName} removed world object ${id}`);
    } catch (e: any) {
      serverLogger.error("world", "Failed to remove world object", e.message);
    }
  });

  socket.on("request_spawner_reload", async () => {
    const player = players.get(socket.id);
    if (!player || !["dev", "admin"].includes(player.role)) return;
    await initializeSpawners();
    io.emit("spawners_sync", Array.from(spawners.values()));
    socket.emit("chat_message", {
      id: "sys-" + Date.now(),
      sender: "System",
      text: "Spawners reloaded from database.",
      timestamp: Date.now(),
      color: "#f59e0b"
    });
  });

  socket.on("accept_quest", (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    const questTemplate = SAMPLE_QUESTS[data.questId];
    if (!questTemplate) return;

    if (!player.quests) player.quests = {};
    
    // Don't re-accept if already active or completed
    if (player.quests[data.questId]) return;

    const newQuest = {
      ...questTemplate,
      status: "active",
      acceptedAt: Date.now()
    };

    player.quests[data.questId] = newQuest;
    socket.emit("quest_update", player.quests);

    db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
      quests: player.quests
    }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Quest accept failed", e.message));

    socket.emit("chat_message", {
      id: "sys-q-" + Date.now(),
      sender: "QUEST",
      text: `New Quest: ${newQuest.title}`,
      timestamp: Date.now(),
      color: "#c2a472"
    });
  });

  socket.on("turn_in_quest", (data) => {
    const player = players.get(socket.id);
    if (!player || !player.quests) return;

    const quest = player.quests[data.questId];
    if (!quest || quest.status !== "active") return;

    // Verify objectives
    const allDone = quest.objectives.every((obj: any) => obj.completed);
    if (!allDone) return;

    quest.status = "completed";
    quest.completedAt = Date.now();

    // Rewards (Simple gold/exp for now)
    if (quest.reward) {
      // player.exp += quest.reward.exp || 0; // If exp is implemented
      // player.gold += quest.reward.gold || 0; // If gold is implemented
    }

    socket.emit("quest_update", player.quests);
    
    db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
      quests: player.quests
    }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Quest completion failed", e.message));

    socket.emit("chat_message", {
      id: "sys-q-" + Date.now(),
      sender: "QUEST",
      text: `Quest Completed: ${quest.title}!`,
      timestamp: Date.now(),
      color: "#22c55e"
    });
  });

  socket.on("request_spawner_reload", () => {
    const player = players.get(socket.id);
    if (!player || player.role !== "dev") return;
    spawners.clear();
    for (const [eid, ent] of entities.entries()) {
      if (ent.spawnerId) entities.delete(eid);
    }
    initializeSpawners();
    io.emit("spawners_sync", Array.from(spawners.values()));
    serverLogger.info("game", `Spawners reloaded by ${player.characterName}`);
  });

  socket.on("equip_item", (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    const updated = CharacterModel.equipItem(player, data.item);
    if (updated) {
      players.set(socket.id, { ...updated, id: socket.id });
      socket.emit("session_start", players.get(socket.id)); // Sync full state back
      
      // Persistence
      db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
        equipment: updated.equipment,
        inventory: updated.inventory,
        maxHp: updated.maxHp,
        maxMp: updated.maxMp
      }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Equip save failed", e.message));
    }
  });

  socket.on("unequip_item", (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    const updated = CharacterModel.unequipItem(player, data.slot);
    if (updated) {
      players.set(socket.id, { ...updated, id: socket.id });
      socket.emit("session_start", players.get(socket.id));

      // Persistence
      db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
        equipment: updated.equipment,
        inventory: updated.inventory,
        maxHp: updated.maxHp,
        maxMp: updated.maxMp
      }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Unequip save failed", e.message));
    }
  });

  socket.on("update_inventory", (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    // TODO: Add more validation here (e.g. check item counts/types)
    player.inventory = data.inventory;
    
    db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
      inventory: data.inventory
    }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Inventory save failed", e.message));
  });

  socket.on("update_hotbar", (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    player.hotbar = data.hotbar;
    
    db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
      hotbar: data.hotbar
    }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Hotbar save failed", e.message));
  });

  socket.on("chat_message", (text) => {
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
  });

  socket.on("disconnect", () => {
    const player = players.get(socket.id);
    if (player && player.userId && player.characterId) {
      serverLogger.info("net", `Player blipped: ${player.characterName}. 10s logout timer started.`);
      
      const timer = setTimeout(async () => {
        logoutTimers.delete(socket.id);
        if (!players.has(socket.id)) return; // Already taken over by a new socket

        try {
          // Final persistence save
          const p = players.get(socket.id);
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
            lastActive: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          
          serverLogger.info("net", `Saved & Logged out: ${p.characterName}`);
        } catch (e: any) {
          serverLogger.error("firestore", `Save failed for session ${socket.id}`, e.message);
        }
        
        players.delete(socket.id);
        io.emit("player_leave", socket.id);
      }, 10000);

      logoutTimers.set(socket.id, timer);
    } else {
      players.delete(socket.id);
      io.emit("player_leave", socket.id);
    }
    
    // Cleanup security data
    lastSkillUse.delete(socket.id);
    lastChatMessage.delete(socket.id);
  });

  socket.on("request_world_sync", () => {
    const player = players.get(socket.id);
    if (!player) return;
    const nearby = filterNearby(Array.from(worldObjects.values()), player.pos, 150);
    socket.emit("world_sync", nearby);
  });
};
