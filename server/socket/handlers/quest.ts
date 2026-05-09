import { Socket } from "socket.io";
import { players } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { SAMPLE_QUESTS } from "../../../src/data/quests";
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

  // 1. Mark as completed
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
