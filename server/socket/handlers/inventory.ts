import { Socket, Server } from "socket.io";
import { players, entities } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { generateItemInstance } from "../../data/items";
import { decrementSpawnerCount } from "../../systems/spawners";
import { CharacterModel } from "../../../src/models/CharacterModel";
import { updateQuestProgress } from "../../logic/quest";

export const handleLootEntity = (io: Server, socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;
  
  const target = entities.get(data.targetId);
  if (target && target.isDead) {
    const dx = player.pos[0] - target.pos[0];
    const dz = player.pos[2] - target.pos[2];
    const distSq = dx*dx + dz*dz;

    if (distSq < 25) { 
      // If the target doesn't have instantiated loot yet, generate it
      if (!target.lootInstances) {
        target.lootInstances = (target.loot || []).map((id: string) => generateItemInstance(id)).filter(Boolean);
      }

      socket.emit("loot_opened", {
        targetId: target.id,
        items: target.lootInstances,
        gold: target.gold || 0
      });
    }
  }
};

export const handleTakeLootItem = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const target = entities.get(data.targetId);
  if (!target || !target.isDead || !target.lootInstances) return;

  const item = target.lootInstances[data.lootIndex];
  if (!item) return;

  // Check Inventory Space
  const emptyIdx = player.inventory.findIndex(s => s === null);
  if (emptyIdx === -1) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "Your inventory is full!", color: "#ff4444" });
    return;
  }

  // Move item
  const newInventory = [...player.inventory];
  newInventory[emptyIdx] = item;
  player.inventory = newInventory;

  // Remove from loot
  target.lootInstances.splice(data.lootIndex, 1);

  // Sync
  socket.emit("inventory_update", { inventory: newInventory });
  socket.emit("loot_update", {
    targetId: target.id,
    items: target.lootInstances,
    gold: target.gold || 0
  });

  // Save to DB
  db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
    inventory: newInventory
  }, { merge: true });

  // If empty, despawn
  if (target.lootInstances.length === 0 && (target.gold || 0) <= 0) {
    entities.delete(target.id);
    socket.broadcast.emit("entity_despawn", target.id);
    socket.emit("entity_despawn", target.id);
  }
};

export const handleTakeAllLoot = (io: Server, socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const target = entities.get(data.targetId);
  if (!target || !target.isDead) return;

  // 1. Take Gold
  if (target.gold && target.gold > 0) {
    player.gold = (player.gold || 0) + target.gold;
    target.gold = 0;
    socket.emit("player_stats", { id: player.id, gold: player.gold });
  }

  // 2. Take Items
  if (!target.lootInstances) {
    target.lootInstances = (target.loot || []).map((id: string) => generateItemInstance(id)).filter(Boolean);
  }

  const newInventory = [...player.inventory];
  const remainingLoot = [];

  for (const item of target.lootInstances) {
    const emptyIdx = newInventory.findIndex(s => s === null);
    if (emptyIdx !== -1) {
      newInventory[emptyIdx] = item;
    } else {
      remainingLoot.push(item);
    }
  }

  player.inventory = newInventory;
  target.lootInstances = remainingLoot;

  // Sync & Save
  socket.emit("inventory_update", { inventory: newInventory });
  db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
    inventory: newInventory,
    gold: player.gold
  }, { merge: true });

  if (target.lootInstances.length === 0) {
    entities.delete(target.id);
    io.emit("entity_despawn", target.id);
  } else {
    socket.emit("loot_update", {
      targetId: target.id,
      items: target.lootInstances,
      gold: target.gold || 0
    });
    socket.emit("chat_message", { sender: "SYSTEM", text: "Inventory full, some items left behind.", color: "#ffaa00" });
  }
};

export const handleEquipItem = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const itemInInventory = player.inventory[data.inventoryIndex];
  if (!itemInInventory) return;

  const updated = CharacterModel.equipItem(player, itemInInventory);
  if (updated) {
    players.set(socket.id, { ...updated, id: socket.id });
    socket.emit("session_start", players.get(socket.id));
    
    db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
      equipment: updated.equipment,
      inventory: updated.inventory,
      maxHp: updated.maxHp,
      maxMp: updated.maxMp
    }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Equip save failed", e.message));

    updateQuestProgress(socket, player, "equip", itemInInventory.type);
  }
};

export const handleUnequipItem = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const updated = CharacterModel.unequipItem(player, data.slot);
  if (updated) {
    players.set(socket.id, { ...updated, id: socket.id });
    socket.emit("session_start", players.get(socket.id));

    db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
      equipment: updated.equipment,
      inventory: updated.inventory,
      maxHp: updated.maxHp,
      maxMp: updated.maxMp
    }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Unequip save failed", e.message));
  }
};

export const handleMoveItem = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const { fromIndex, toIndex } = data;
  if (fromIndex < 0 || fromIndex >= 30 || toIndex < 0 || toIndex >= 30) return;

  const newInventory = [...player.inventory];
  const itemA = newInventory[fromIndex];
  const itemB = newInventory[toIndex];

  newInventory[toIndex] = itemA;
  newInventory[fromIndex] = itemB;
  
  player.inventory = newInventory;
  socket.emit("inventory_update", { inventory: newInventory });

  db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
    inventory: newInventory
  }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Inventory save failed", e.message));
};

export const handleSplitStack = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const { fromIndex, amount } = data;
  const item = player.inventory[fromIndex];
  
  if (!item || !item.stackable || (item.quantity || 1) <= amount || amount <= 0) return;

  const emptyIdx = player.inventory.findIndex((s: any) => s === null);
  if (emptyIdx === -1) return;

  const newInventory = [...player.inventory];
  const newStack = { 
    ...item, 
    id: Math.random().toString(36).substring(2, 11), 
    quantity: amount 
  };
  
  newInventory[fromIndex] = { ...item, quantity: item.quantity - amount };
  newInventory[emptyIdx] = newStack;

  player.inventory = newInventory;
  socket.emit("inventory_update", { inventory: newInventory });

  db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
    inventory: newInventory
  }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Inventory save failed", e.message));
};
