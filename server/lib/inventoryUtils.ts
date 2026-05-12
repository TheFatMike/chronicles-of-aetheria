/**
 * @file server/lib/inventoryUtils.ts
 * @description Centralized utility functions for managing player inventory and items.
 */
import { InventoryItem } from "../../src/types";

export function addItemToItems(items: (InventoryItem | null)[], item: InventoryItem, maxSlots: number = 30): { success: boolean, newItems: (InventoryItem | null)[], remaining: number } {
  const newItems = [...items];
  let remaining = item.quantity || 1;

  // 1. Try to stack
  if (item.stackable) {
    for (let i = 0; i < newItems.length; i++) {
      const slot = newItems[i];
      if (slot && slot.itemId === item.itemId && (slot.quantity || 0) < (slot.maxStack || 99)) {
        const space = (slot.maxStack || 99) - (slot.quantity || 0);
        const toAdd = Math.min(space, remaining);
        newItems[i] = { ...slot, quantity: (slot.quantity || 0) + toAdd };
        remaining -= toAdd;
        if (remaining <= 0) break;
      }
    }
  }

  // 2. Try empty slots
  if (remaining > 0) {
    for (let i = 0; i < newItems.length; i++) {
      if (newItems[i] === null) {
        newItems[i] = { ...item, quantity: remaining };
        remaining = 0;
        break;
      }
    }
  }

  return {
    success: remaining === 0,
    newItems,
    remaining
  };
}

export function hasSpace(items: (InventoryItem | null)[], itemsCount: number = 1): boolean {
  const emptySlots = items.filter(slot => slot === null).length;
  return emptySlots >= itemsCount;
}

export function removeItemFromItems(items: (InventoryItem | null)[], index: number, quantity: number = 1): { success: boolean, newItems: (InventoryItem | null)[] } {
  const newItems = [...items];
  const item = newItems[index];

  if (!item || (item.quantity || 1) < quantity) {
    return { success: false, newItems };
  }

  const newQuantity = (item.quantity || 1) - quantity;
  if (newQuantity <= 0) {
    newItems[index] = null;
  } else {
    newItems[index] = { ...item, quantity: newQuantity };
  }

  return { success: true, newItems };
}
