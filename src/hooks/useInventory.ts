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
  
  const updateInventory = useCallback(async (newInventory: (InventoryItem | null)[]) => {
    if (!user || !selectedCharacter || !socket) return;
    
    // Optimistic UI update
    setSelectedCharacter(prev => prev ? { ...prev, inventory: newInventory } : null);
    socket.emit("update_inventory", { inventory: newInventory });
  }, [user, selectedCharacter, setSelectedCharacter, socket]);

  const updateHotbar = useCallback(async (newHotbar: (HotbarSlot | null)[]) => {
    if (!user || !selectedCharacter || !socket) return;
    
    // Optimistic UI update
    setSelectedCharacter(prev => prev ? { ...prev, hotbar: newHotbar } : null);
    socket.emit("update_hotbar", { hotbar: newHotbar });
  }, [user, selectedCharacter, setSelectedCharacter, socket]);

  const equipItem = useCallback(async (item: InventoryItem) => {
    if (!user || !selectedCharacter || !socket) return;
    
    // We let the server calculate the stats and reply via session_start or player_stats
    socket.emit("equip_item", { item });
  }, [user, selectedCharacter, setSelectedCharacter, socket]);

  const unequipItem = useCallback(async (slot: keyof EquipmentSlots) => {
    if (!user || !selectedCharacter || !socket) return;
    
    socket.emit("unequip_item", { slot });
  }, [user, selectedCharacter, setSelectedCharacter, socket]);

  return { updateInventory, updateHotbar, equipItem, unequipItem };
};

