/**
 * @file server/socket/handlers/shop.ts
 * @description Handles buying and selling items between players and NPCs.
 */
import { Socket } from "socket.io";
import { players, entities, worldObjects } from "../../state";
import { generateItemInstance, ITEM_REGISTRY } from "../../data/items";
import { SHOPS } from "../../../shared/data/shops";
import { markPlayerDirty } from "../../lib/stateUtils";
import { syncQuestInventory } from "../../logic/quest";
import { BuyItemSchema, SellItemSchema } from "../../lib/schemas";
import { validatePayload } from "../../lib/validation";
import { addItemToItems, removeItemFromItems } from "../../lib/inventoryUtils";
import { takeGold, giveGold } from "../../lib/playerUtils";
import { isWithinRange } from "../../lib/math";

export const handleBuyItem = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, BuyItemSchema, data, "buy_item");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const { itemId, shopId } = validated;
  const shop = SHOPS[shopId];
  if (!shop) return;

  // Proximity Check: Search both dynamic entities and static world objects
  const nearbyMerchant = 
    Array.from(entities.values()).find(e => e.type === 'npc' && e.shopId === shopId && isWithinRange(player.pos, e.pos, 10)) ||
    Array.from(worldObjects.values()).find(o => o.shopId === shopId && isWithinRange(player.pos, o.pos, 10));

  if (!nearbyMerchant) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You must be near the merchant to buy items!", color: "#ff4444" });
    return;
  }

  const shopItem = shop.items.find(i => i.itemId === itemId);
  if (!shopItem) return;

  // Process transaction
  const itemTemplate = ITEM_REGISTRY[itemId];
  if (!itemTemplate) return;

  if ((player.gold || 0) < shopItem.price) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You don't have enough gold!", color: "#ff4444" });
    return;
  }

  const itemInstance = generateItemInstance(itemId);
  if (!itemInstance) return;

  const { success, newItems: newInventory } = addItemToItems(player.inventory, itemInstance);
  
  if (!success) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "Your inventory is full!", color: "#ff4444" });
    return;
  }

  if (takeGold(socket, player, shopItem.price)) {
    player.inventory = newInventory;
    socket.emit("inventory_update", { inventory: player.inventory });
    socket.emit("chat_message", { 
      sender: "SYSTEM", 
      text: `Purchased ${itemTemplate.name} for ${shopItem.price} gold.`, 
      color: "#22c55e" 
    });
    markPlayerDirty(socket.id, ["inventory"]);
    syncQuestInventory(socket, player);
  }
};

export const handleSellItem = (socket: Socket, data: any) => {
  const validated = validatePayload(socket, SellItemSchema, data, "sell_item");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const { inventoryIndex } = validated;
  const item = player.inventory[inventoryIndex];
  if (!item) return;

  // Proximity Check: Search both dynamic entities and static world objects
  const nearbyMerchant = 
    Array.from(entities.values()).find(e => e.type === 'npc' && e.shopId && isWithinRange(player.pos, e.pos, 10)) ||
    Array.from(worldObjects.values()).find(o => o.shopId && isWithinRange(player.pos, o.pos, 10));

  if (!nearbyMerchant) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You must be near a merchant to sell items!", color: "#ff4444" });
    return;
  }

  // Calculate sell price
  let sellPrice = 5; 
  if (item.type === 'weapon' || item.type === 'chest') sellPrice = 20;
  if (item.type === 'consumable') sellPrice = 2;
  sellPrice *= (item.quantity || 1);

  // Process transaction
  const { success, newItems: newInventory } = removeItemFromItems(player.inventory, inventoryIndex, item.quantity || 1);
  if (success) {
    player.inventory = newInventory;
    giveGold(socket, player, sellPrice);
    socket.emit("inventory_update", { inventory: player.inventory });
    socket.emit("chat_message", { 
      sender: "SYSTEM", 
      text: `Sold ${item.name} for ${sellPrice} gold.`, 
      color: "#22c55e" 
    });
    markPlayerDirty(socket.id, ["inventory"]);
    syncQuestInventory(socket, player);
  }
};
