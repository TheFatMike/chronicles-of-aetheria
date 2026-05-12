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
import { LootEntitySchema, TakeLootItemSchema, EquipItemSchema, UnequipItemSchema, MoveItemSchema, SplitStackSchema, DestroyItemSchema, BankDepositSchema, BankWithdrawSchema, BankMoveSchema } from "../../lib/schemas";
import { validatePayload } from "../../lib/validation";

export const handleLootEntity = (io: Server, socket: Socket, data: any) => {
  const validated = validatePayload(socket, LootEntitySchema, data, "loot_entity");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;
  
  const target = entities.get(validated.targetId);
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
  const validated = validatePayload(socket, TakeLootItemSchema, data, "take_loot_item");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const target = entities.get(validated.targetId);
  if (!target || !target.isDead || !target.lootInstances) return;

  const item = target.lootInstances[validated.lootIndex];
  if (!item) return;

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
  target.lootInstances.splice(validated.lootIndex, 1);

  socket.emit("inventory_update", { inventory: newInventory });
  socket.emit("loot_update", {
    targetId: target.id,
    items: target.lootInstances,
    gold: target.gold || 0
  });

  markPlayerDirty(socket.id, ["inventory"]);
  syncQuestInventory(socket, player);

  if (target.lootInstances.length === 0 && (target.gold || 0) <= 0) {
    entities.delete(target.id);
    socket.broadcast.emit("entity_despawn", target.id);
    socket.emit("entity_despawn", target.id);
  }
};

export const handleTakeAllLoot = (io: Server, socket: Socket, data: any) => {
  const validated = validatePayload(socket, LootEntitySchema, data, "take_all_loot");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const target = entities.get(validated.targetId);
  if (!target || !target.isDead) return;

  if (target.gold && target.gold > 0) {
    player.gold = (player.gold || 0) + target.gold;
    target.gold = 0;
    socket.emit("player_stats", { id: player.id, gold: player.gold });
  }

  if (!target.lootInstances) {
    target.lootInstances = (target.loot || []).map((id: string) => generateItemInstance(id)).filter(Boolean);
  }

  const newInventory = [...player.inventory];
  const itemsToRemove: number[] = [];

  for (let i = 0; i < target.lootInstances.length; i++) {
    const item = target.lootInstances[i];
    let taken = false;

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

    if (!taken) {
      const emptyIdx = newInventory.findIndex((s: InventoryItem | null) => s === null);
      if (emptyIdx !== -1) {
        newInventory[emptyIdx] = item;
        taken = true;
      }
    }

    if (taken) {
      itemsToRemove.push(i);
    }
  }

  target.lootInstances = target.lootInstances.filter((_: any, idx: number) => !itemsToRemove.includes(idx));
  player.inventory = newInventory;

  syncQuestInventory(socket, player);
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
  const validated = validatePayload(socket, LootEntitySchema, data, "take_loot_gold");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const target = entities.get(validated.targetId);
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

  if ((target.lootInstances || []).length === 0) {
    entities.delete(target.id);
    socket.broadcast.emit("entity_despawn", target.id);
    socket.emit("entity_despawn", target.id);
  }
};

export const handleEquipItem = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, EquipItemSchema, data, "equip_item");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const itemInInventory = player.inventory[validated.inventoryIndex];
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
  const validated = validatePayload(socket, UnequipItemSchema, data, "unequip_item");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const updated = CharacterModel.unequipItem(player, validated.slot);
  if (updated) {
    players.set(socket.id, { ...updated, id: socket.id });
    socket.emit("session_start", players.get(socket.id));
    markPlayerDirty(socket.id, ["equipment", "inventory", "maxHp", "maxMp", "stats"]);
  }
};

export const handleMoveItem = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, MoveItemSchema, data, "move_item");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const { fromIndex, toIndex } = validated;
  if (fromIndex === toIndex) return;

  const newInventory = [...player.inventory];
  const itemA = newInventory[fromIndex];
  const itemB = newInventory[toIndex];

  if (!itemA) return;

  if (itemB && itemA.itemId === itemB.itemId && itemB.stackable) {
    const maxStack = itemB.maxStack || 99;
    const space = maxStack - (itemB.quantity || 1);
    
    if (space > 0) {
      const toAdd = Math.min(space, itemA.quantity || 1);
      newInventory[toIndex] = { ...itemB, quantity: (itemB.quantity || 1) + toAdd };
      const remaining = (itemA.quantity || 1) - toAdd;
      newInventory[fromIndex] = remaining <= 0 ? null : { ...itemA, quantity: remaining };
      
      player.inventory = newInventory;
      socket.emit("inventory_update", { inventory: newInventory });
      markPlayerDirty(socket.id, ["inventory"]);
      return;
    }
  }

  newInventory[toIndex] = itemA;
  newInventory[fromIndex] = itemB;
  player.inventory = newInventory;
  socket.emit("inventory_update", { inventory: newInventory });
  markPlayerDirty(socket.id, ["inventory"]);
};

export const handleSplitStack = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, SplitStackSchema, data, "split_stack");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const { fromIndex, amount } = validated;
  const item = player.inventory[fromIndex];
  
  if (!item || !item.stackable || (item.quantity || 1) <= amount || amount <= 0) return;

  const emptyIdx = player.inventory.findIndex((s: any) => s === null);
  if (emptyIdx === -1) return;

  const newInventory = [...player.inventory];
  newInventory[fromIndex] = { ...item, quantity: item.quantity - amount };
  newInventory[emptyIdx] = { 
    ...item, 
    id: Math.random().toString(36).substring(2, 11), 
    quantity: amount 
  };

  player.inventory = newInventory;
  socket.emit("inventory_update", { inventory: newInventory });
  markPlayerDirty(socket.id, ["inventory"]);
};

export const handleDestroyItem = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, DestroyItemSchema, data, "destroy_item");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const { inventoryIndex } = validated;
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

// --- Bank Handlers ---

export const handleBankDeposit = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, BankDepositSchema, data, "bank_deposit");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const { inventoryIndex, bankIndex, amount, all } = validated;
  let item = player.inventory[inventoryIndex];
  if (!item) return;

  if (!player.bank) player.bank = Array(50).fill(null);
  const newBank = [...player.bank];
  const newInventory = [...player.inventory];

  // Determine amount to deposit
  let depositAmount = amount || (item.quantity || 1);
  if (all) {
    // If 'all', find all items of this type and sum their quantities
    // For simplicity, we just take the full stack from this slot first
    depositAmount = item.quantity || 1;
  }
  
  depositAmount = Math.min(depositAmount, item.quantity || 1);

  // 1. Try to stack in existing bank slots first
  if (item.stackable) {
    for (let i = 0; i < newBank.length; i++) {
      const slot = newBank[i];
      if (slot && slot.itemId === item.itemId && (slot.quantity || 0) < (slot.maxStack || 99)) {
        const space = (slot.maxStack || 99) - (slot.quantity || 0);
        const toAdd = Math.min(space, depositAmount);
        newBank[i] = { ...slot, quantity: (slot.quantity || 0) + toAdd };
        depositAmount -= toAdd;
        if (depositAmount <= 0) break;
      }
    }
  }

  // 2. If amount remains, put in a new slot (specified or first empty)
  if (depositAmount > 0) {
    let targetIdx = bankIndex;
    if (targetIdx === undefined || targetIdx < 0 || targetIdx >= 50 || newBank[targetIdx] !== null) {
      targetIdx = newBank.findIndex(s => s === null);
    }

    if (targetIdx === -1) {
      socket.emit("chat_message", { sender: "SYSTEM", text: "Your bank is full!", color: "#ff4444" });
    } else {
      newBank[targetIdx] = { ...item, quantity: depositAmount };
      depositAmount = 0;
    }
  }

  // Update inventory based on what was actually deposited
  const actualDeposited = (item.quantity || 1) - depositAmount;
  if (actualDeposited >= (item.quantity || 1)) {
    newInventory[inventoryIndex] = null;
  } else if (actualDeposited > 0) {
    newInventory[inventoryIndex] = { ...item, quantity: (item.quantity || 1) - actualDeposited };
  }

  player.bank = newBank;
  player.inventory = newInventory;

  socket.emit("bank_update", { bank: newBank });
  socket.emit("inventory_update", { inventory: newInventory });
  markPlayerDirty(socket.id, ["bank", "inventory"]);
};

export const handleBankWithdraw = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, BankWithdrawSchema, data, "bank_withdraw");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player || !player.bank) return;

  const { bankIndex, inventoryIndex, amount, all } = validated;
  let item = player.bank[bankIndex];
  if (!item) return;

  const newBank = [...player.bank];
  const newInventory = [...player.inventory];

  let withdrawAmount = amount || (item.quantity || 1);
  if (all) withdrawAmount = item.quantity || 1;
  withdrawAmount = Math.min(withdrawAmount, item.quantity || 1);

  // 1. Try to stack in existing inventory slots
  if (item.stackable) {
    for (let i = 0; i < newInventory.length; i++) {
      const slot = newInventory[i];
      if (slot && slot.itemId === item.itemId && (slot.quantity || 0) < (slot.maxStack || 99)) {
        const space = (slot.maxStack || 99) - (slot.quantity || 0);
        const toAdd = Math.min(space, withdrawAmount);
        newInventory[i] = { ...slot, quantity: (slot.quantity || 0) + toAdd };
        withdrawAmount -= toAdd;
        if (withdrawAmount <= 0) break;
      }
    }
  }

  // 2. If amount remains, put in new inventory slot
  if (withdrawAmount > 0) {
    let targetIdx = inventoryIndex;
    if (targetIdx === undefined || targetIdx < 0 || targetIdx >= 30 || newInventory[targetIdx] !== null) {
      targetIdx = newInventory.findIndex(s => s === null);
    }

    if (targetIdx === -1) {
      socket.emit("chat_message", { sender: "SYSTEM", text: "Your inventory is full!", color: "#ff4444" });
    } else {
      newInventory[targetIdx] = { ...item, quantity: withdrawAmount };
      withdrawAmount = 0;
    }
  }

  // Update bank based on what was actually withdrawn
  const actualWithdrawn = (item.quantity || 1) - withdrawAmount;
  if (actualWithdrawn >= (item.quantity || 1)) {
    newBank[bankIndex] = null;
  } else if (actualWithdrawn > 0) {
    newBank[bankIndex] = { ...item, quantity: (item.quantity || 1) - actualWithdrawn };
  }

  player.bank = newBank;
  player.inventory = newInventory;

  socket.emit("bank_update", { bank: newBank });
  socket.emit("inventory_update", { inventory: newInventory });
  markPlayerDirty(socket.id, ["bank", "inventory"]);
};

export const handleBankMove = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, BankMoveSchema, data, "bank_move");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player || !player.bank) return;

  const { fromIndex, toIndex } = validated;
  if (fromIndex === toIndex) return;

  const newBank = [...player.bank];
  const itemA = newBank[fromIndex];
  const itemB = newBank[toIndex];

  if (!itemA) return;

  newBank[toIndex] = itemA;
  newBank[fromIndex] = itemB;

  player.bank = newBank;
  socket.emit("bank_update", { bank: newBank });
  markPlayerDirty(socket.id, ["bank"]);
};
