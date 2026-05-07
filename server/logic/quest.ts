import { db } from "../db";
import { serverLogger } from "../logger";

export const updateQuestProgress = (socket: any, player: any, type: string, targetId: string) => {
  if (!player.quests) return;

  let questChanged = false;
  Object.values(player.quests).forEach((quest: any) => {
    if (quest.status === "active") {
      quest.objectives.forEach((obj: any) => {
        if (obj.type === type && obj.targetId === targetId && !obj.completed) {
          obj.currentCount = Math.min(obj.count, (obj.currentCount || 0) + 1);
          
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
 * Validates all active quest objectives against the current player state.
 * Useful for checking if an objective was already met before the quest was accepted.
 */
export const validateQuestState = (socket: any, player: any) => {
  if (!player.quests || !player.equipment) return;

  let questChanged = false;
  Object.values(player.quests).forEach((quest: any) => {
    if (quest.status === "active") {
      quest.objectives.forEach((obj: any) => {
        // Handle "equip" objectives
        if (obj.type === "equip" && !obj.completed) {
          // Check if any equipped item matches the targetId (item type)
          const isEquipped = Object.values(player.equipment).some((item: any) => item && item.type === obj.targetId);
          if (isEquipped) {
            obj.currentCount = obj.count;
            obj.completed = true;
            questChanged = true;
            
            socket.emit("chat_message", {
              id: "sys-q-init-" + Date.now(),
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

  if (questChanged) {
    socket.emit("quest_update", player.quests);
    db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
      quests: player.quests
    }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Quest re-validation save failed", e.message));
  }
};
