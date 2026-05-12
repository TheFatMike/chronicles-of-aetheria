/**
 * @file src/data/shops.ts
 * @description Static definitions for in-game shops and their inventories.
 */
import { Shop } from "../store/types";

export const SHOPS: Record<string, Shop> = {
  "general_merchant": {
    id: "general_merchant",
    name: "Silas's General Goods",
    items: [
      { itemId: "health-potion", price: 10 },
      { itemId: "mana-potion", price: 15 },
      { itemId: "iron-sword", price: 50 },
      { itemId: "wooden-staff", price: 45 },
      { itemId: "leather-tunic", price: 60 }
    ]
  },
  "blacksmith": {
    id: "blacksmith",
    name: "The Iron Anvil",
    items: [
      { itemId: "iron-sword", price: 40 },
      { itemId: "leather-tunic", price: 55 }
    ]
  }
};
