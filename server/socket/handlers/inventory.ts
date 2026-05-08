import { Socket, Server } from "socket.io";
import { players, entities } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { generateItemInstance } from "../../data/items";
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
      if (target.loot && target.loot.length > 0) {
        const lootedItems: string[] = [];
        const newInventory = [...player.inventory];
        
        target.loot.forEach((itemId: string) => {
          const emptyIdx = newInventory.findIndex(s => s === null);
          if (emptyIdx !== -1) {
            const itemInstance = generateItemInstance(itemId);
            if (itemInstance) {
              newInventory[emptyIdx] = itemInstance;
              lootedItems.push(itemInstance.name);
            }
          }
        });

        if (lootedItems.length > 0) {
          player.inventory = newInventory;
          socket.emit("inventory_update", { inventory: newInventory });
          
          db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
            inventory: newInventory
          }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Loot save failed", e.message));

          socket.emit("chat_message", {
            id: "sys-" + Date.now(),
            sender: "SYSTEM",
            text: `You looted: ${lootedItems.join(", ")}`,
            timestamp: Date.now(),
            color: "#ffd700"
          });
        }
      }
      entities.delete(target.id);
      io.emit("entity_despawn", target.id);
    }
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
