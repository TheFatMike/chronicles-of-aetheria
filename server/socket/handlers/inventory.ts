/**
 * @file server/socket/handlers/inventory.ts
 * @description Manages player inventory and item-related socket events.
 * Handles item movement, stack splitting, and item consumption/usage.
 * @importance Essential: Core to the RPG experience, allowing players to manage their gear and resources.
 */
import { Socket, Server } from "socket.io";
import { players, entities } from "../../state";
import { db } from "../../db";
import { serverLogger } from "../../logger";
import { generateItemInstance } from "../../data/items";
import { decrementSpawnerCount } from "../../systems/spawners";
import { CharacterModel } from "../../../src/models/CharacterModel";
import { InventoryItem } from "../../../src/types";
import { updateQuestProgress, syncQuestInventory } from "../../logic/quest";
import { markPlayerDirty } from "../../lib/stateUtils";

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

  // Move item (with stacking)
  const newInventory = [...player.inventory];
  let success = false;

  if (item.stackable) {
    for (let i = 0; i < newInventory.length; i++) {
      const slot = newInventory[i];
      if (slot && slot.itemId === item.itemId && (slot.quantity || 0) < (slot.maxStack || 99)) {
        const space = (slot.maxStack || 99) - (slot.quantity || 0);
        const toAdd = Math.min(space, item.quantity || 1);
        newInventory[i] = { ...slot, quantity: (slot.quantity || 0) + toAdd };
        
        const remaining = (item.quantity || 1) - toAdd;
        if (remaining <= 0) {
          success = true;
          break;
        } else {
          item.quantity = remaining;
        }
      }
    }
  }

  if (!success) {
    const emptyIdx = newInventory.findIndex((s: InventoryItem | null) => s === null);
    if (emptyIdx !== -1) {
      newInventory[emptyIdx] = item;
      success = true;
    }
  }

  if (!success) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "Your inventory is full!", color: "#ff4444" });
    return;
  }

  player.inventory = newInventory;
  target.lootInstances.splice(data.lootIndex, 1);


  // Sync
  socket.emit("inventory_update", { inventory: newInventory });
  socket.emit("loot_update", {
    targetId: target.id,
    items: target.lootInstances,
    gold: target.gold || 0
  });

  // Mark as dirty for eventual batch persistence (Selective)
  markPlayerDirty(socket.id, ["inventory"]);

  // Update Quest Progress
  syncQuestInventory(socket, player);

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
  const itemsToRemove: number[] = [];
  const takenItems: { itemId: string, quantity: number }[] = [];

  for (let i = 0; i < target.lootInstances.length; i++) {
    const item = target.lootInstances[i];
    const initialQuantity = item.quantity || 1;
    let taken = false;

    // Try stacking
    if (item.stackable) {
      for (let j = 0; j < newInventory.length; j++) {
        const slot = newInventory[j];
        if (slot && slot.itemId === item.itemId && (slot.quantity || 0) < (slot.maxStack || 99)) {
          const space = (slot.maxStack || 99) - (slot.quantity || 0);
          const toAdd = Math.min(space, item.quantity || 1);
          newInventory[j] = { ...slot, quantity: (slot.quantity || 0) + toAdd };
          
          const remaining = (item.quantity || 1) - toAdd;
          if (remaining <= 0) {
            taken = true;
            break;
          } else {
            item.quantity = remaining;
          }
        }
      }
    }

    // Try empty slot
    if (!taken) {
      const emptyIdx = newInventory.findIndex((s: InventoryItem | null) => s === null);
      if (emptyIdx !== -1) {
        newInventory[emptyIdx] = item;
        taken = true;
      }
    }

    if (taken) {
      itemsToRemove.push(i);
      takenItems.push({ itemId: item.itemId, quantity: initialQuantity });
    }
  }

  // Remove taken items from loot
  target.lootInstances = target.lootInstances.filter((_: any, idx: number) => !itemsToRemove.includes(idx));
  player.inventory = newInventory;

  // Update Quest Progress
  syncQuestInventory(socket, player);


  // Sync & Mark Dirty
  socket.emit("inventory_update", { inventory: newInventory });
  markPlayerDirty(socket.id, ["inventory", "gold"]);

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

export const handleTakeGold = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const target = entities.get(data.targetId);
  if (!target || !target.isDead || !target.gold || target.gold <= 0) return;

  player.gold = (player.gold || 0) + target.gold;
  target.gold = 0;

  socket.emit("player_stats", { id: player.id, gold: player.gold });
  socket.emit("loot_update", {
    targetId: target.id,
    items: target.lootInstances || [],
    gold: 0
  });

  markPlayerDirty(socket.id, ["gold"]);

  // If empty, despawn
  if ((target.lootInstances || []).length === 0) {
    entities.delete(target.id);
    socket.broadcast.emit("entity_despawn", target.id);
    socket.emit("entity_despawn", target.id);
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
    
    markPlayerDirty(socket.id, ["equipment", "inventory", "maxHp", "maxMp", "stats"]);

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

    markPlayerDirty(socket.id, ["equipment", "inventory", "maxHp", "maxMp", "stats"]);
  }
};

export const handleMoveItem = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const { fromIndex, toIndex } = data;
  if (fromIndex < 0 || fromIndex >= 30 || toIndex < 0 || toIndex >= 30) return;
  if (fromIndex === toIndex) return;

  const newInventory = [...player.inventory];
  const itemA = newInventory[fromIndex];
  const itemB = newInventory[toIndex];

  if (!itemA) return;

  // 1. Check for stacking
  if (itemB && itemA.itemId === itemB.itemId && itemB.stackable) {
    const maxStack = itemB.maxStack || 99;
    const space = maxStack - (itemB.quantity || 1);
    
    if (space > 0) {
      const toAdd = Math.min(space, itemA.quantity || 1);
      const updatedB = { ...itemB, quantity: (itemB.quantity || 1) + toAdd };
      const updatedA = { ...itemA, quantity: (itemA.quantity || 1) - toAdd };
      
      newInventory[toIndex] = updatedB;
      if (updatedA.quantity <= 0) {
        newInventory[fromIndex] = null;
      } else {
        newInventory[fromIndex] = updatedA;
      }
      
      player.inventory = newInventory;
      socket.emit("inventory_update", { inventory: newInventory });
      
      markPlayerDirty(socket.id, ["inventory"]);
      
      return;
    }
  }

  // 2. Default: Just Swap
  newInventory[toIndex] = itemA;
  newInventory[fromIndex] = itemB;
  
  player.inventory = newInventory;
  socket.emit("inventory_update", { inventory: newInventory });
  markPlayerDirty(socket.id, ["inventory"]);
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
  markPlayerDirty(socket.id, ["inventory"]);
};

export const handleDestroyItem = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const { inventoryIndex } = data;
  if (inventoryIndex < 0 || inventoryIndex >= 30) return;

  const item = player.inventory[inventoryIndex];
  if (!item) return;

  const newInventory = [...player.inventory];
  newInventory[inventoryIndex] = null;
  
  player.inventory = newInventory;
  socket.emit("inventory_update", { inventory: newInventory });
  syncQuestInventory(socket, player);

  markPlayerDirty(socket.id, ["inventory"]);
  
  serverLogger.info("inventory", `Player ${player.characterName} destroyed item: ${item.name}`);
};

