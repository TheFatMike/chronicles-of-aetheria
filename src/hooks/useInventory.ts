/**
 * @file src/hooks/useInventory.ts
 * @description Manages player inventory and equipment logic on the client.
 * Handles item movement, equipment slots, and hotbar updates, coordinating with the server.
 * @importance Essential: Provides the business logic for managing player resources and character customization.
 */
import { useCallback } from "react";
import { Socket } from "socket.io-client";
import { Character, InventoryItem, EquipmentSlots, HotbarSlot } from "@shared/types";

import { useGameStore } from "../store/useGameStore";
import { useShallow } from "zustand/react/shallow";

export const useInventory = (socket: Socket | null) => {
  const { localPlayer, updateLocalPlayer } = useGameStore(
    useShallow((s) => ({
      localPlayer: s.localPlayer,
      updateLocalPlayer: s.updateLocalPlayer,
    }))
  );
  
  const moveItem = useCallback(async (fromIndex: number, toIndex: number) => {
    if (!localPlayer || !socket) return;
    
    // We update optimistically but the server is the source of truth
    const newInventory = [...localPlayer.inventory];
    const itemA = newInventory[fromIndex];
    newInventory[fromIndex] = newInventory[toIndex];
    newInventory[toIndex] = itemA;
    
    updateLocalPlayer({ inventory: newInventory });
    socket.emit("move_item", { fromIndex, toIndex });
  }, [localPlayer, updateLocalPlayer, socket]);

  const splitStack = useCallback(async (fromIndex: number, amount: number) => {
    if (!localPlayer || !socket) return;
    socket.emit("split_stack", { fromIndex, amount });
  }, [localPlayer, socket]);

  const updateHotbar = useCallback(async (newHotbar: (HotbarSlot | null)[]) => {
    if (!localPlayer || !socket) return;
    
    // Optimistic UI update
    updateLocalPlayer({ hotbar: newHotbar });
    socket.emit("update_hotbar", { hotbar: newHotbar });
  }, [localPlayer, updateLocalPlayer, socket]);

  const equipItem = useCallback(async (inventoryIndex: number) => {
    if (!localPlayer || !socket) return;
    
    socket.emit("equip_item", { inventoryIndex });
  }, [localPlayer, socket]);

  const unequipItem = useCallback(async (slot: keyof EquipmentSlots) => {
    if (!localPlayer || !socket) return;
    
    socket.emit("unequip_item", { slot });
  }, [localPlayer, socket]);

  return { moveItem, splitStack, updateHotbar, equipItem, unequipItem };
};

