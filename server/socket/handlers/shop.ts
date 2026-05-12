/**
 * @file server/socket/handlers/shop.ts
 * @description Handles buying and selling items between players and NPCs.
 */
import { Socket } from "socket.io";
import { players } from "../../state";
import { generateItemInstance, ITEM_REGISTRY } from "../../data/items";
import { SHOPS } from "../../../src/data/shops";
import { markPlayerDirty } from "../../lib/stateUtils";
import { syncQuestInventory } from "../../logic/quest";

export const handleBuyItem = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const { itemId, price, shopId } = data;
  const shop = SHOPS[shopId];
  if (!shop) return;

  // Verify item is in shop
  const shopItem = shop.items.find(i => i.itemId === itemId);
  if (!shopItem || shopItem.price !== price) return;

  // Check gold
  if ((player.gold || 0) < price) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You don't have enough gold!", color: "#ff4444" });
    return;
  }

  // Process transaction
  const itemTemplate = ITEM_REGISTRY[itemId];
  if (!itemTemplate) return;

  const newInventory = [...player.inventory];
  let success = false;

  // 1. Try to stack if stackable
  if (itemTemplate.stackable) {
    for (let i = 0; i < newInventory.length; i++) {
      const slot = newInventory[i];
      if (slot && slot.itemId === itemId && (slot.quantity || 0) < (slot.maxStack || 99)) {
        newInventory[i] = { ...slot, quantity: (slot.quantity || 0) + 1 };
        success = true;
        break;
      }
    }
  }

  // 2. Try empty slot if not stacked
  if (!success) {
    const emptyIdx = newInventory.findIndex((s: any) => s === null);
    if (emptyIdx !== -1) {
      const itemInstance = generateItemInstance(itemId);
      if (itemInstance) {
        newInventory[emptyIdx] = itemInstance;
        success = true;
      }
    } else {
      socket.emit("chat_message", { sender: "SYSTEM", text: "Your inventory is full!", color: "#ff4444" });
      return;
    }
  }

  if (!success) return;

  player.gold = (player.gold || 0) - price;
  player.inventory = newInventory;

  // Sync
  socket.emit("inventory_update", { inventory: player.inventory });
  socket.emit("player_stats", { id: player.id, gold: player.gold });
  socket.emit("chat_message", { 
    sender: "SYSTEM", 
    text: `Purchased ${itemTemplate.name} for ${price} gold.`, 
    color: "#22c55e" 
  });

  markPlayerDirty(socket.id, ["inventory", "gold"]);
  syncQuestInventory(socket, player);
};

export const handleSellItem = (socket: Socket, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const { inventoryIndex } = data;
  const item = player.inventory[inventoryIndex];
  if (!item) return;

  // Calculate sell price (simple logic: 50% of registry value or default)
  // For now we'll use a fixed logic or check if it exists in any shop
  let sellPrice = 5; // Default junk price
  if (item.type === 'weapon' || item.type === 'chest') sellPrice = 20;
  if (item.type === 'consumable') sellPrice = 2;
  
  // If it's a stack, multiply by quantity
  sellPrice *= (item.quantity || 1);

  // Process transaction
  player.gold = (player.gold || 0) + sellPrice;
  player.inventory[inventoryIndex] = null;

  // Sync
  socket.emit("inventory_update", { inventory: player.inventory });
  socket.emit("player_stats", { id: player.id, gold: player.gold });
  socket.emit("chat_message", { 
    sender: "SYSTEM", 
    text: `Sold ${item.name} for ${sellPrice} gold.`, 
    color: "#22c55e" 
  });

  markPlayerDirty(socket.id, ["inventory", "gold"]);
  syncQuestInventory(socket, player);
};
