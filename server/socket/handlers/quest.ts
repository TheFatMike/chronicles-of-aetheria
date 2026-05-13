/**
 * @file server/socket/handlers/quest.ts
 * @description Manages quest-related events and player progression.
 * Handles quest acceptance, objective tracking, and reward processing.
 * @importance Essential: Provides structure and goals for the player, driving engagement and narrative progression.
 */
import { Socket } from "socket.io";
import { players } from "../../state";
import { db } from "../../db";
import admin from "firebase-admin";
import { serverLogger } from "../../logger";
import { SAMPLE_QUESTS } from "../../../shared/data/quests";
import { validateQuestState } from "../../logic/quest";
import { giveExperience } from "../../logic/combat";
import { generateItemInstance } from "../../data/items";

export const handleAcceptQuest = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const questTemplate = SAMPLE_QUESTS[data.questId];
  if (!questTemplate) return;

  if (!player.quests) player.quests = {};
  if (player.quests[data.questId]) return;

  // Deep clone the template to avoid mutating the global SAMPLE_QUESTS
  const newQuest = {
    ...JSON.parse(JSON.stringify(questTemplate)),
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

  validateQuestState(socket, player);
};

export const handleTurnInQuest = (io: any, socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player || !player.quests) return;

  const quest = player.quests[data.questId];
  if (!quest || quest.status !== "active") return;

  const allDone = quest.objectives.every((obj: any) => obj.completed);
  if (!allDone) return;

  // Check inventory space for rewards
  const rewardItems = quest.reward?.items || [];
  if (rewardItems.length > 0) {
    const emptySlots = player.inventory.filter((s: any) => s === null).length;
    if (emptySlots < rewardItems.length) {
      socket.emit("chat_message", {
        id: "sys-q-inv-full-" + Date.now(),
        sender: "SYSTEM",
        text: `Inventory full! You need ${rewardItems.length} free slots to complete this quest.`,
        timestamp: Date.now(),
        color: "#ff4444"
      });
      return;
    }
  }

  const newInventory = [...player.inventory];
  let inventoryChanged = false;

  quest.objectives.forEach((obj: any) => {
    if (obj.type === 'collect') {
      let remainingToRemove = obj.count;
      for (let i = 0; i < newInventory.length; i++) {
        const slot = newInventory[i];
        if (slot && slot.itemId === obj.targetId) {
          const quantity = slot.quantity || 1;
          const toRemove = Math.min(quantity, remainingToRemove);
          
          if (quantity > toRemove) {
            newInventory[i] = { ...slot, quantity: quantity - toRemove };
          } else {
            newInventory[i] = null;
          }
          
          remainingToRemove -= toRemove;
          inventoryChanged = true;
          if (remainingToRemove <= 0) break;
        }
      }
    }
  });

  if (inventoryChanged) {
    player.inventory = newInventory;
    socket.emit("inventory_update", { inventory: newInventory });
  }

  // 2. Mark as completed
  quest.status = "completed";
  quest.completedAt = Date.now();

  // 2. Award Rewards
  const rewards = quest.reward;
  if (rewards) {
    // EXP
    if (rewards.exp) {
      giveExperience(io, player, rewards.exp);
    }

    // Gold
    if (rewards.gold) {
      player.gold = (player.gold || 0) + rewards.gold;
      socket.emit("chat_message", {
        id: "sys-q-gold-" + Date.now(),
        sender: "QUEST",
        text: `Reward: ${rewards.gold} Gold`,
        timestamp: Date.now(),
        color: "#fbbf24"
      });
    }

    // Items
    if (rewards.items && rewards.items.length > 0) {
      const awardedItems: string[] = [];
      const newInventory = [...player.inventory];
      
      rewards.items.forEach((itemId: string) => {
        const emptyIdx = newInventory.findIndex(s => s === null);
        if (emptyIdx !== -1) {
          const itemInstance = generateItemInstance(itemId);
          if (itemInstance) {
            newInventory[emptyIdx] = itemInstance;
            awardedItems.push(itemInstance.name);
          }
        } else {
          socket.emit("chat_message", {
            id: "sys-q-inv-" + Date.now(),
            sender: "SYSTEM",
            text: "No inventory space for quest items! They were lost to the void...",
            timestamp: Date.now(),
            color: "#ff4444"
          });
        }
      });

      if (awardedItems.length > 0) {
        player.inventory = newInventory;
        socket.emit("inventory_update", { inventory: newInventory });
        socket.emit("chat_message", {
          id: "sys-q-item-" + Date.now(),
          sender: "QUEST",
          text: `Reward Items: ${awardedItems.join(", ")}`,
          timestamp: Date.now(),
          color: "#c2a472"
        });
      }
    }
  }

  // 3. Sync & Persist
  socket.emit("quest_update", player.quests);
  socket.emit("player_stats", { 
    id: player.id, 
    hp: player.hp, 
    mp: player.mp, 
    level: player.level, 
    exp: player.exp, 
    maxExp: player.maxExp, 
    gold: player.gold 
  });
  
  db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
    quests: player.quests,
    gold: player.gold,
    exp: player.exp,
    level: player.level,
    inventory: player.inventory
  }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Quest completion failed", e.message));

  socket.emit("chat_message", {
    id: "sys-q-" + Date.now(),
    sender: "QUEST",
    text: `Quest Completed: ${quest.title}!`,
    timestamp: Date.now(),
    color: "#22c55e"
  });
};

export const handleAbandonQuest = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player || !player.quests) return;

  const quest = player.quests[data.questId];
  if (!quest) return;

  delete player.quests[data.questId];
  
  // Sync to client
  socket.emit("quest_update", player.quests);

  // Persist to DB - Use FieldValue.delete() to ensure it's removed from the map
  db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).update({
    [`quests.${data.questId}`]: admin.firestore.FieldValue.delete()
  }).catch((e: any) => serverLogger.error("firestore", "Quest abandon failed", e.message));

  socket.emit("chat_message", {
    id: "sys-q-abandon-" + Date.now(),
    sender: "QUEST",
    text: `Abandoned Quest: ${quest.title}`,
    timestamp: Date.now(),
    color: "#ff4444"
  });
};
