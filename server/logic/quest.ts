import { db } from "../db";
import { serverLogger } from "../logger";

export const updateQuestProgress = (socket: any, player: any, type: string, targetId: string, amount: number = 1) => {
  if (!player.quests) return;

  let questChanged = false;
  Object.values(player.quests).forEach((quest: any) => {
    if (quest.status === "active") {
      quest.objectives.forEach((obj: any) => {
        if (obj.type === type && obj.targetId === targetId && !obj.completed) {
          obj.currentCount = Math.min(obj.count, (obj.currentCount || 0) + amount);
          
          if (obj.currentCount >= obj.count) {
            obj.completed = true;
            socket.emit("chat_message", {
              id: "sys-q-done-" + Date.now(),
              sender: "QUEST",
              text: `Objective Complete: ${obj.targetName} (${obj.currentCount}/${obj.count})`,
              timestamp: Date.now(),
              color: "#c2a472"
            });
          } else {
            socket.emit("chat_message", {
              id: "sys-q-prog-" + Date.now(),
              sender: "QUEST",
              text: `${quest.title}: ${obj.targetName} ${obj.currentCount}/${obj.count}`,
              timestamp: Date.now(),
              color: "#c2a472"
            });
          }
          questChanged = true;
        }
      });
    }
  });

  if (questChanged) {
    socket.emit("quest_update", player.quests);
    // PERSIST TO DB
    db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
      quests: player.quests
    }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Quest save failed", e.message));
  }
};

/**
 * Recalculates all 'collect' objectives based on the current inventory.
 * This should be called whenever the player's inventory changes.
 */
export const syncQuestInventory = (socket: any, player: any, silent: boolean = false) => {
  if (!player.quests || !player.inventory) return;

  let questChanged = false;
  Object.values(player.quests).forEach((quest: any) => {
    if (quest.status === "active") {
      quest.objectives.forEach((obj: any) => {
        if (obj.type === "collect") {
          const totalInInventory = player.inventory.reduce((sum: number, slot: any) => {
            if (slot && slot.itemId === obj.targetId) {
              return sum + (slot.quantity || 1);
            }
            return sum;
          }, 0);

          const newCount = Math.min(obj.count, totalInInventory);
          if (obj.currentCount !== newCount) {
            const wasCompleted = obj.completed;
            const isNowCompleted = newCount >= obj.count;
            
            obj.currentCount = newCount;
            obj.completed = isNowCompleted;
            questChanged = true;

            if (!silent) {
              if (isNowCompleted && !wasCompleted) {
                socket.emit("chat_message", {
                  id: "sys-q-sync-done-" + Date.now(),
                  sender: "QUEST",
                  text: `Objective Complete: ${obj.targetName} (${obj.currentCount}/${obj.count})`,
                  timestamp: Date.now(),
                  color: "#22c55e"
                });
              } else if (newCount > 0 && !isNowCompleted) {
                socket.emit("chat_message", {
                  id: "sys-q-sync-prog-" + Date.now(),
                  sender: "QUEST",
                  text: `${quest.title}: ${obj.targetName} ${obj.currentCount}/${obj.count}`,
                  timestamp: Date.now(),
                  color: "#c2a472"
                });
              }
            }
          }
        }
      });
    }
  });

  if (questChanged) {
    socket.emit("quest_update", player.quests);
    db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
      quests: player.quests
    }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Quest inventory sync failed", e.message));
  }
};

/**
 * Validates all active quest objectives against the current player state.
 * Useful for checking if an objective was already met before the quest was accepted.
 */
export const validateQuestState = (socket: any, player: any) => {
  if (!player.quests) return;

  let questChanged = false;
  Object.values(player.quests).forEach((quest: any) => {
    if (quest.status === "active") {
      quest.objectives.forEach((obj: any) => {
        // Handle "equip" objectives
        if (obj.type === "equip" && !obj.completed && player.equipment) {
          const isEquipped = Object.values(player.equipment).some((item: any) => item && item.type === obj.targetId);
          if (isEquipped) {
            obj.currentCount = obj.count;
            obj.completed = true;
            questChanged = true;
            
            socket.emit("chat_message", {
              id: "sys-q-init-eq-" + Date.now(),
              sender: "QUEST",
              text: `Objective Complete: ${obj.targetName} (Already equipped!)`,
              timestamp: Date.now(),
              color: "#22c55e"
            });
          }
        }
      });
    }
  });

  // Also run the inventory sync (this handles 'collect' types)
  syncQuestInventory(socket, player, false);

  if (questChanged) {
    socket.emit("quest_update", player.quests);
    db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
      quests: player.quests
    }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Quest re-validation save failed", e.message));
  }
};
