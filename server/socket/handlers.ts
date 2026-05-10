import { Server, Socket } from "socket.io";
import { handleUpdateTerrain, handleRequestTerrainSync } from "./handlers/terrain";
import { handleJoin, handleDisconnect } from "./handlers/session";
import { handleMove } from "./handlers/movement";
import { handleCombatSkill } from "./handlers/combat";
import { handleCreateCharacter } from "./handlers/character";
import { handleLootEntity, handleTakeLootItem, handleTakeGold, handleTakeAllLoot, handleEquipItem, handleUnequipItem, handleMoveItem, handleSplitStack, handleDestroyItem } from "./handlers/inventory";
import { handleSaveWorldObject, handleRemoveWorldObject, handleSpawnerReload } from "./handlers/editor";
import { handleAcceptQuest, handleTurnInQuest } from "./handlers/quest";
import { handleChatMessage } from "./handlers/chat";
import { handlePartyInvite, handlePartyAccept, handlePartyLeave } from "./handlers/party";
import { handleTradeRequest, handleTradeAccept, handleTradeCancel, handleTradeLock, handleTradeConfirm, handleTradeAddItem, handleTradeRemoveItem } from "./handlers/trade";
import { handleDebugToggle } from "./handlers/debug";
import { players, worldObjects, lastSkillUse, lastChatMessage } from "../state";
import { filterNearby } from "../systems/spatial";

export const registerHandlers = (io: Server, socket: Socket) => {
  const email = (socket as any).email;
  const userId = (socket as any).userId;

  // Session
  socket.on("join", (data) => handleJoin(io, socket, data, userId, email));
  socket.on("disconnect", () => {
    handleDisconnect(io, socket);
    lastSkillUse.delete(socket.id);
    lastChatMessage.delete(socket.id);
  });

  // Movement
  socket.on("move", (data) => handleMove(socket, data, io));

  // Combat
  socket.on("cast_skill", (data) => handleCombatSkill(io, socket, data));

  // Character
  socket.on("create_character", (data) => handleCreateCharacter(socket, data, userId, email));

  // Inventory & Loot
  socket.on("loot_entity", (data) => handleLootEntity(io, socket, data));
  socket.on("take_loot_item", (data) => handleTakeLootItem(socket, data));
  socket.on("take_loot_gold", (data) => handleTakeGold(socket, data));
  socket.on("take_all_loot", (data) => handleTakeAllLoot(io, socket, data));
  socket.on("equip_item", (data) => handleEquipItem(socket, data));
  socket.on("unequip_item", (data) => handleUnequipItem(socket, data));
  socket.on("move_item", (data) => handleMoveItem(socket, data));
  socket.on("split_stack", (data) => handleSplitStack(socket, data));
  socket.on("destroy_item", (data) => handleDestroyItem(socket, data));
  socket.on("update_hotbar", (data) => {
    const player = players.get(socket.id);
    if (player) player.hotbar = data.hotbar;
  });

  // World Editor
  socket.on("save_world_object", (data) => handleSaveWorldObject(io, socket, data));
  socket.on("remove_world_object", (data) => handleRemoveWorldObject(io, socket, data));
  socket.on("request_spawner_reload", () => handleSpawnerReload(io, socket));
  socket.on("request_world_sync", () => {
    const player = players.get(socket.id);
    if (!player) return;
    const nearby = filterNearby(Array.from(worldObjects.values()), player.pos, 150, 'object');
    socket.emit("world_sync", nearby);
  });

  // Terrain
  socket.on("update_terrain", (data) => handleUpdateTerrain(io, socket, data));
  socket.on("request_terrain_sync", () => handleRequestTerrainSync(socket));

  // Quests
  socket.on("accept_quest", (data) => handleAcceptQuest(socket, data));
  socket.on("turn_in_quest", (data) => handleTurnInQuest(io, socket, data));

  // Chat
  socket.on("chat_message", (text) => handleChatMessage(io, socket, text));

  // Party
  socket.on("party_invite", (targetId) => handlePartyInvite(io, socket, targetId));
  socket.on("party_accept", (inviterId) => handlePartyAccept(io, socket, inviterId));
  socket.on("party_leave", () => handlePartyLeave(io, socket));

  // Trade
  socket.on("trade_request", (targetId) => handleTradeRequest(io, socket, targetId));
  socket.on("trade_accept", (requesterId) => handleTradeAccept(io, socket, requesterId));
  socket.on("trade_cancel", (tradeId) => handleTradeCancel(io, socket, tradeId));
  socket.on("trade_lock", (data) => handleTradeLock(io, socket, data));
  socket.on("trade_confirm", (tradeId) => handleTradeConfirm(io, socket, tradeId));
  socket.on("trade_add_item", (data) => handleTradeAddItem(io, socket, data));
  socket.on("trade_remove_item", (data) => handleTradeRemoveItem(io, socket, data));

  // Debug
  socket.on("debug_toggle", (data) => handleDebugToggle(io, socket, data));
};
