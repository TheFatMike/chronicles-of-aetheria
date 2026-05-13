/**
 * @file server/socket/handlers/inventory.ts
 * @description Manages player inventory and item-related socket events.
 * Handles item movement, stack splitting, and item consumption/usage.
 * @importance Essential: Core to the RPG experience, allowing players to manage their gear and resources.
 */
import { Socket, Server } from "socket.io";
import { players, entities, worldObjects } from "../../state";
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
import { addItemToItems, removeItemFromItems } from "../../lib/inventoryUtils";
import { isWithinRange } from "../../lib/math";
import { giveGold } from "../../lib/playerUtils";

export const handleLootEntity = (io: Server, socket: Socket, data: any) => {
  const validated = validatePayload(socket, LootEntitySchema, data, "loot_entity");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;
  
  const target = entities.get(validated.targetId);
  if (target && target.isDead) {
    const distSq = Math.pow(player.pos[0] - target.pos[0], 2) + Math.pow(player.pos[2] - target.pos[2], 2);
    const targetRadius = (target.scale || 1) / 2;
    const maxRange = 5 + targetRadius;

    if (distSq <= maxRange * maxRange) {
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

  const { success, newItems: newInventory } = addItemToItems(player.inventory, item);

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

  giveGold(socket, player, target.gold);
  const goldTaken = target.gold;
  target.gold = 0;

  socket.emit("loot_update", {
    targetId: target.id,
    items: target.lootInstances || [],
    gold: 0
  });

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

  // Proximity Check: Search both dynamic entities and static world objects
  const nearbyBanker = 
    Array.from(entities.values()).find(e => e.type === 'npc' && e.role?.toLowerCase().includes('bank') && isWithinRange(player.pos, e.pos, 10)) ||
    Array.from(worldObjects.values()).find(o => o.role?.toLowerCase().includes('bank') && isWithinRange(player.pos, o.pos, 10));

  if (!nearbyBanker) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You must be near a banker to deposit items!", color: "#ff4444" });
    return;
  }

  if (!player.bank) player.bank = Array(50).fill(null);
  
  let depositAmount = amount || (item.quantity || 1);
  if (all) depositAmount = item.quantity || 1;
  depositAmount = Math.min(depositAmount, item.quantity || 1);

  const newBank = [...player.bank];
  const newInventory = [...player.inventory];
  let actuallyAdded = 0;

  // 1. If bankIndex is specified, try to place/stack there
  if (bankIndex !== undefined && bankIndex >= 0 && bankIndex < 50) {
    const targetSlot = newBank[bankIndex];
    if (!targetSlot) {
      // Empty slot, just place it
      newBank[bankIndex] = { ...item, quantity: depositAmount };
      actuallyAdded = depositAmount;
    } else if (targetSlot.itemId === item.itemId && targetSlot.stackable) {
      // Same item, try to stack
      const maxStack = targetSlot.maxStack || 99;
      const space = maxStack - (targetSlot.quantity || 0);
      const toAdd = Math.min(space, depositAmount);
      if (toAdd > 0) {
        newBank[bankIndex] = { ...targetSlot, quantity: (targetSlot.quantity || 0) + toAdd };
        actuallyAdded = toAdd;
      }
    }
    
    // If we couldn't add to the specific slot (e.g. different item there), 
    // fall back to finding first available slot if not a "forced" move (optional design choice)
    // For drag and drop, if they drag onto an occupied slot with different item, we might want to swap.
    // Let's implement swap if it's a specific bankIndex and not stacking.
    if (actuallyAdded === 0 && newBank[bankIndex]) {
       // SWAP logic: If we are moving the full stack, we can swap.
       // If we are only moving a portion, swapping is weird. Let's only swap if depositAmount == item.quantity
       if (depositAmount === item.quantity) {
         const temp = newBank[bankIndex];
         newBank[bankIndex] = { ...item, quantity: depositAmount };
         newInventory[inventoryIndex] = temp;
         actuallyAdded = depositAmount;
         // Special case: we don't use removeItemFromItems here because we swapped
         player.bank = newBank;
         player.inventory = newInventory;
         socket.emit("bank_update", { bank: newBank });
         socket.emit("inventory_update", { inventory: newInventory });
         markPlayerDirty(socket.id, ["bank", "inventory"]);
         return;
       }
    }
  } else {
    // No specific index, use default "add to items" logic
    const { success, newItems, remaining } = addItemToItems(player.bank, { ...item, quantity: depositAmount }, 50);
    if (remaining === depositAmount) {
      socket.emit("chat_message", { sender: "SYSTEM", text: "Your bank is full!", color: "#ff4444" });
      return;
    }
    actuallyAdded = depositAmount - remaining;
    player.bank = newItems;
  }

  if (actuallyAdded > 0) {
    const { newItems: updatedInventory } = removeItemFromItems(player.inventory, inventoryIndex, actuallyAdded);
    if (bankIndex !== undefined) player.bank = newBank;
    player.inventory = updatedInventory;

    socket.emit("bank_update", { bank: player.bank });
    socket.emit("inventory_update", { inventory: updatedInventory });
    markPlayerDirty(socket.id, ["bank", "inventory"]);
  }
};

export const handleBankWithdraw = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, BankWithdrawSchema, data, "bank_withdraw");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player || !player.bank) return;

  const { bankIndex, inventoryIndex, amount, all } = validated;
  let item = player.bank[bankIndex];
  if (!item) return;

  // Proximity Check: Search both dynamic entities and static world objects
  const nearbyBanker = 
    Array.from(entities.values()).find(e => e.type === 'npc' && e.role?.toLowerCase().includes('bank') && isWithinRange(player.pos, e.pos, 10)) ||
    Array.from(worldObjects.values()).find(o => o.role?.toLowerCase().includes('bank') && isWithinRange(player.pos, o.pos, 10));

  if (!nearbyBanker) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You must be near a banker to withdraw items!", color: "#ff4444" });
    return;
  }

  let withdrawAmount = amount || (item.quantity || 1);
  if (all) withdrawAmount = item.quantity || 1;
  withdrawAmount = Math.min(withdrawAmount, item.quantity || 1);

  const newInventory = [...player.inventory];
  const newBank = [...player.bank];
  let actuallyWithdrawn = 0;

  // 1. If inventoryIndex is specified, try to place/stack there
  if (inventoryIndex !== undefined && inventoryIndex >= 0 && inventoryIndex < 30) {
    const targetSlot = newInventory[inventoryIndex];
    if (!targetSlot) {
      newInventory[inventoryIndex] = { ...item, quantity: withdrawAmount };
      actuallyWithdrawn = withdrawAmount;
    } else if (targetSlot.itemId === item.itemId && targetSlot.stackable) {
      const maxStack = targetSlot.maxStack || 99;
      const space = maxStack - (targetSlot.quantity || 0);
      const toAdd = Math.min(space, withdrawAmount);
      if (toAdd > 0) {
        newInventory[inventoryIndex] = { ...targetSlot, quantity: (targetSlot.quantity || 0) + toAdd };
        actuallyWithdrawn = toAdd;
      }
    }

    // SWAP logic
    if (actuallyWithdrawn === 0 && newInventory[inventoryIndex]) {
      if (withdrawAmount === item.quantity) {
        const temp = newInventory[inventoryIndex];
        newInventory[inventoryIndex] = { ...item, quantity: withdrawAmount };
        newBank[bankIndex] = temp;
        actuallyWithdrawn = withdrawAmount;
        player.bank = newBank;
        player.inventory = newInventory;
        socket.emit("bank_update", { bank: newBank });
        socket.emit("inventory_update", { inventory: newInventory });
        markPlayerDirty(socket.id, ["bank", "inventory"]);
        return;
      }
    }
  } else {
    // No specific index, use default logic
    const { success, newItems, remaining } = addItemToItems(player.inventory, { ...item, quantity: withdrawAmount }, 30);
    if (remaining === withdrawAmount) {
      socket.emit("chat_message", { sender: "SYSTEM", text: "Your inventory is full!", color: "#ff4444" });
      return;
    }
    actuallyWithdrawn = withdrawAmount - remaining;
    player.inventory = newItems;
  }

  if (actuallyWithdrawn > 0) {
    const { newItems: updatedBank } = removeItemFromItems(player.bank, bankIndex, actuallyWithdrawn);
    if (inventoryIndex !== undefined) player.inventory = newInventory;
    player.bank = updatedBank;

    socket.emit("bank_update", { bank: player.bank });
    socket.emit("inventory_update", { inventory: player.inventory });
    markPlayerDirty(socket.id, ["bank", "inventory"]);
  }
};

export const handleBankMove = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, BankMoveSchema, data, "bank_move");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player || !player.bank) return;

  const { fromIndex, toIndex } = validated;
  if (fromIndex === toIndex) return;

  // Proximity Check: Search both dynamic entities and static world objects
  const nearbyBanker = 
    Array.from(entities.values()).find(e => e.type === 'npc' && e.role?.toLowerCase().includes('bank') && isWithinRange(player.pos, e.pos, 10)) ||
    Array.from(worldObjects.values()).find(o => o.role?.toLowerCase().includes('bank') && isWithinRange(player.pos, o.pos, 10));

  if (!nearbyBanker) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You must be near a banker to organize your bank!", color: "#ff4444" });
    return;
  }

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

export const handleBankDepositAll = (socket: Socket) => {
  const player = players.get(socket.id);
  if (!player) return;

  // Proximity Check: Search both dynamic entities and static world objects
  const nearbyBanker = 
    Array.from(entities.values()).find(e => e.type === 'npc' && e.role?.toLowerCase().includes('bank') && isWithinRange(player.pos, e.pos, 10)) ||
    Array.from(worldObjects.values()).find(o => o.role?.toLowerCase().includes('bank') && isWithinRange(player.pos, o.pos, 10));

  if (!nearbyBanker) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You must be near a banker to deposit items!", color: "#ff4444" });
    return;
  }

  if (!player.bank) player.bank = Array(50).fill(null);

  let newBank = [...player.bank];
  let newInventory = [...player.inventory];
  let itemsMoved = false;

  for (let i = 0; i < newInventory.length; i++) {
    const item = newInventory[i];
    if (!item) continue;

    const { success, newItems, remaining } = addItemToItems(newBank, item, 50);
    if (remaining < (item.quantity || 1)) {
      itemsMoved = true;
      newBank = newItems;
      if (remaining <= 0) {
        newInventory[i] = null;
      } else {
        newInventory[i] = { ...item, quantity: remaining };
      }
    }
  }

  if (itemsMoved) {
    player.bank = newBank;
    player.inventory = newInventory;
    socket.emit("bank_update", { bank: newBank });
    socket.emit("inventory_update", { inventory: newInventory });
    markPlayerDirty(socket.id, ["bank", "inventory"]);
    socket.emit("chat_message", { sender: "SYSTEM", text: "All possible items deposited into vault.", color: "#34d399" });
  } else {
    socket.emit("chat_message", { sender: "SYSTEM", text: "No items could be deposited (bank full or inventory empty).", color: "#ffaa00" });
  }
};
