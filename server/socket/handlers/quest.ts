import { Socket } from "socket.io";
import { players } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { SAMPLE_QUESTS } from "../../../src/data/quests";
import { validateQuestState } from "../../logic/quest";

export const handleAcceptQuest = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const questTemplate = SAMPLE_QUESTS[data.questId];
  if (!questTemplate) return;

  if (!player.quests) player.quests = {};
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

  validateQuestState(socket, player);
};

export const handleTurnInQuest = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player || !player.quests) return;

  const quest = player.quests[data.questId];
  if (!quest || quest.status !== "active") return;

  const allDone = quest.objectives.every((obj: any) => obj.completed);
  if (!allDone) return;

  quest.status = "completed";
  quest.completedAt = Date.now();

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
};
