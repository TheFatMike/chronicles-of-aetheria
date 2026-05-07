import { useCallback } from "react";
import { Socket } from "socket.io-client";
import { Character, InventoryItem, EquipmentSlots, HotbarSlot } from "../types";
import { User } from "firebase/auth";

export const useInventory = (
  user: User | null, 
  selectedCharacter: Character | null, 
  setSelectedCharacter: React.Dispatch<React.SetStateAction<Character | null>>,
  socket: Socket | null
) => {
  
  const moveItem = useCallback(async (fromIndex: number, toIndex: number) => {
    if (!user || !selectedCharacter || !socket) return;
    
    // We update optimistically but the server is the source of truth
    const newInventory = [...selectedCharacter.inventory];
    const itemA = newInventory[fromIndex];
    newInventory[fromIndex] = newInventory[toIndex];
    newInventory[toIndex] = itemA;
    
    setSelectedCharacter(prev => prev ? { ...prev, inventory: newInventory } : null);
    socket.emit("move_item", { fromIndex, toIndex });
  }, [user, selectedCharacter, setSelectedCharacter, socket]);

  const splitStack = useCallback(async (fromIndex: number, amount: number) => {
    if (!user || !selectedCharacter || !socket) return;
    socket.emit("split_stack", { fromIndex, amount });
  }, [user, selectedCharacter, socket]);

  const updateHotbar = useCallback(async (newHotbar: (HotbarSlot | null)[]) => {
    if (!user || !selectedCharacter || !socket) return;
    
    // Optimistic UI update
    setSelectedCharacter(prev => prev ? { ...prev, hotbar: newHotbar } : null);
    socket.emit("update_hotbar", { hotbar: newHotbar });
  }, [user, selectedCharacter, setSelectedCharacter, socket]);

  const equipItem = useCallback(async (inventoryIndex: number) => {
    if (!user || !selectedCharacter || !socket) return;
    
    socket.emit("equip_item", { inventoryIndex });
  }, [user, selectedCharacter, socket]);

  const unequipItem = useCallback(async (slot: keyof EquipmentSlots) => {
    if (!user || !selectedCharacter || !socket) return;
    
    socket.emit("unequip_item", { slot });
  }, [user, selectedCharacter, setSelectedCharacter, socket]);

  return { moveItem, splitStack, updateHotbar, equipItem, unequipItem };
};

