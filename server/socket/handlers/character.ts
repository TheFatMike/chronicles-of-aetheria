/**
 * @file server/socket/handlers/character.ts
 * @description Socket handlers for player character management.
 * Facilitates character creation, selection, and retrieval from the database.
 * @importance Essential: Required for players to enter the game world with their chosen identity and stats.
 */
import { Socket } from "socket.io";
import admin from "firebase-admin";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { CHARACTER_CLASSES } from "../../../src/constants";
import { EquipmentSlots } from "../../../src/types";
import { CLASS_STARTING_GEAR, generateItemInstance } from "../../data/items";
import { CharacterModel } from "../../../src/models/CharacterModel";
import { getUserRole } from "../../lib/auth";
import { removeCharacterSessionRedis } from "../../redis";
import { players } from "../../state";
import { markPlayerDirty } from "../../lib/stateUtils";

export const handleCreateCharacter = async (socket: Socket, data: any, userId: string, email: string) => {
  try {
    const userRole = await getUserRole(userId, email);

    const { characterName, class: classId, color } = data;
    const lowerName = characterName.toLowerCase().trim();
    const nameRef = db.collection("characterNames").doc(lowerName);

    if (characterName.length < 3 || characterName.length > 16) {
      return socket.emit("error", { message: "Invalid name length" });
    }

    const selectedClassData = CHARACTER_CLASSES.find(c => c.id === classId);
    if (!selectedClassData) {
      return socket.emit("error", { message: "Invalid class selection" });
    }

    const result = await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
      // Name collision check
      const nameDoc = (await transaction.get(nameRef)) as any as admin.firestore.DocumentSnapshot;
      if (nameDoc.exists) {
        throw new Error("This name has already been claimed.");
      }

      // Character limit check (Max 6)
      const charCol = db.collection("users").doc(userId).collection("characters");
      const userChars = await transaction.get(charCol);
      if (userChars.size >= 6) {
        throw new Error("You have reached the maximum character limit (6).");
      }

      const charDocRef = charCol.doc();
      
      const baseStats = selectedClassData.stats;
      const startingItems = CLASS_STARTING_GEAR[classId] || [];
      const initialInventory = Array(30).fill(null);
      let initialEquipment: EquipmentSlots = { head: null, chest: null, legs: null, boots: null, weapon: null, offhand: null, accessory: null };
      
      startingItems.forEach((itemId) => {
        const itemInstance = generateItemInstance(itemId);
        if (itemInstance) {
          const emptyIdx = initialInventory.findIndex(s => s === null);
          if (emptyIdx !== -1) initialInventory[emptyIdx] = itemInstance;
        }
      });

      const { maxHp, maxMp } = CharacterModel.calculateDerivedStats(baseStats, initialEquipment);

      const charData = {
        name: characterName.trim(),
        class: classId,
        color: color,
        level: 1,
        stats: baseStats,
        hp: maxHp,
        mp: maxMp,
        inventory: initialInventory,
        bank: Array(50).fill(null),
        hotbar: Array(10).fill(null),
        equipment: initialEquipment,
        passivePoints: 0,
        passives: {},
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
};

export const handleDeleteCharacter = async (socket: Socket, charId: string, userId: string) => {
  try {
    const charRef = db.collection("users").doc(userId).collection("characters").doc(charId);
    const charSnap = await charRef.get();

    if (!charSnap.exists) {
      return socket.emit("error", { message: "Character not found" });
    }

    const data = charSnap.data() || {};
    const lowerName = data.name ? data.name.toLowerCase().trim() : null;
    const nameRef = lowerName ? db.collection("characterNames").doc(lowerName) : null;

    // Verify ownership
    if (nameRef) {
      const nameSnap = await nameRef.get();
      if (nameSnap.exists && nameSnap.data().characterId !== charId) {
         return socket.emit("error", { message: "Unauthorized deletion attempt" });
      }
    }

    serverLogger.info("net", `Deleting character ${data.name} (${charId}) for user ${userId}`);

    // Atomic Delete
    const batch = db.batch();
    if (nameRef) batch.delete(nameRef);
    batch.delete(charRef);
    await batch.commit();

    // 2. Clear Redis session so it doesn't save back!
    await removeCharacterSessionRedis(charId);

    socket.emit("character_deleted", charId);
  } catch (e: any) {
    serverLogger.error("net", "Character deletion failed", e.message);
    socket.emit("error", { message: "Failed to delete character." });
  }
};
export const handleUpdateCharacter = async (socket: Socket, data: any) => {
  try {
    const player = players.get(socket.id);
    if (!player) return;

    // 1. Update In-Memory State
    const allowedFields = ["discoveredTeleports", "hotbar", "role"];
    const updates: string[] = [];

    for (const key of Object.keys(data)) {
      if (allowedFields.includes(key)) {
        (player as any)[key] = data[key];
        updates.push(key);
      }
    }

    if (updates.length > 0) {
      // 2. Mark as dirty for Redis/Firestore persistence
      markPlayerDirty(socket.id, updates);
      
      // 3. Broadcast update to the client themselves (confirmation)
      socket.emit("character_update", data);
      
      serverLogger.debug("net", `Updated character ${player.characterName} fields: ${updates.join(", ")}`);
    }
  } catch (e: any) {
    serverLogger.error("net", "Character update failed", e.message);
  }
};
