/**
 * @file src/hooks/useGameSync.ts
 * @description Centralizes the real-time synchronization of game state via sockets.
 * Listens for server updates and reflects changes in the local client store.
 * @importance Essential: Keeps the local world state consistent with the authoritative server version.
 */
import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { useGameStore } from "../store/useGameStore";
import { Character } from "../types";
import { logger } from "../lib/logger";

interface useGameSyncProps {
  socket: Socket | null;
  selectedCharacter: Character | null;
  setSelectedCharacter: React.Dispatch<React.SetStateAction<Character | null>>;
  connected: boolean;
}

export const useGameSync = ({ socket, selectedCharacter, setSelectedCharacter, connected }: useGameSyncProps) => {
  useEffect(() => {
    if (!socket || !connected) return;

    // 1. Quest Updates
    const handleQuestUpdate = (newQuests: any) => {
      setSelectedCharacter(prev => prev ? { ...prev, quests: newQuests } : null);
      useGameStore.getState().setActiveQuests(newQuests);
    };

    // 2. Session Start (Initial Full Sync)
    const handleSessionStart = (confirmedState: any) => {
      setSelectedCharacter(prev => prev ? {
        ...prev,
        inventory: confirmedState.inventory,
        equipment: confirmedState.equipment,
        hp: confirmedState.hp,
        maxHp: confirmedState.maxHp,
        mp: confirmedState.mp,
        maxMp: confirmedState.maxMp,
        stats: confirmedState.stats,
        level: confirmedState.level,
        quests: confirmedState.quests,
        gold: confirmedState.gold,
        role: confirmedState.role
      } : null);
      
      useGameStore.getState().setActiveQuests(confirmedState.quests || {});
    };

    // 3. Inventory Updates
    const handleInventoryUpdate = (data: any) => {
      setSelectedCharacter(prev => prev ? { ...prev, inventory: data.inventory } : null);
    };

    // 4. Player Stats (Health/Mana/Gold)
    const handlePlayerStats = (data: any) => {
      if (data.id === socket.id) {
        setSelectedCharacter(prev => {
          if (!prev) return null;
          const updates: any = {};
          if (data.hp !== undefined) updates.hp = data.hp;
          if (data.mp !== undefined) updates.mp = data.mp;
          if (data.gold !== undefined) updates.gold = data.gold;
          if (data.level !== undefined) updates.level = data.level;
          if (data.exp !== undefined) updates.exp = data.exp;
          if (data.maxExp !== undefined) updates.maxExp = data.maxExp;
          return { ...prev, ...updates };
        });
      }
    };

    // 5. Party Updates
    const handlePartyUpdate = (data: any) => {
      useGameStore.getState().setParty(data);
    };
    const handlePartyInvite = (data: any) => {
      useGameStore.getState().setPartyInvite(data);
    };

    // 6. Terrain Sync
    const handleTerrainSync = (data: any) => {
      useGameStore.getState().updateTerrainData(data);
    };

    // 7. World Sync (Nearby Objects)
    const handleWorldSync = (objects: any[]) => {
      logger.info("socket", `World sync received: ${objects.length} objects`);
      useGameStore.getState().setWorldObjects(objects);
    };

    const handleWorldObjectsSync = (objects: any[]) => {
      logger.info("socket", `World objects chunk sync: ${objects.length} objects`);
      useGameStore.getState().addWorldObjects(objects);
    };

    const handleEntitiesSync = (entities: any[]) => {
      logger.info("socket", `Entities sync: ${entities.length} entities`);
      useGameStore.getState().setEntities(entities);
    };

    const handleWorldObjectUpdated = (obj: any) => {
      useGameStore.getState().addWorldObject(obj);
    };

    const handleWorldObjectRemoved = (data: { id: string }) => {
      useGameStore.getState().removeWorldObject(data.id);
    };

    // 8. Loot Updates
    const handleLootOpened = (data: any) => {
      if (!data || (data.items.length === 0 && (data.gold || 0) <= 0)) {
        useGameStore.getState().setActiveLoot(null);
      } else {
        useGameStore.getState().setActiveLoot(data);
      }
    };

    // 9. Role Updates
    const handleRoleUpdate = (data: { role: string }) => {
      setSelectedCharacter(prev => prev ? { ...prev, role: data.role } : null);
    };
 
    // Register listeners
    socket.on("quest_update", handleQuestUpdate);
    socket.on("session_start", (data) => {
      handleSessionStart(data);
      if (data.pos) useGameStore.getState().requestTeleport(data.pos);
    });
    socket.on("inventory_update", handleInventoryUpdate);
    socket.on("player_stats", handlePlayerStats);
    socket.on("party_update", handlePartyUpdate);
    socket.on("party_invite_received", handlePartyInvite);
    socket.on("terrain_sync", handleTerrainSync);
    socket.on("world_sync", handleWorldSync);
    socket.on("world_objects_sync", handleWorldObjectsSync);
    socket.on("entities_sync", handleEntitiesSync);
    socket.on("world_object_updated", handleWorldObjectUpdated);
    socket.on("world_object_removed", handleWorldObjectRemoved);
    socket.on("loot_opened", handleLootOpened);
    socket.on("loot_update", handleLootOpened);
    socket.on("role_update", handleRoleUpdate);

    logger.info("system", "Socket listeners registered via useGameSync");

    return () => {
      socket.off("quest_update", handleQuestUpdate);
      socket.off("session_start");
      socket.off("inventory_update", handleInventoryUpdate);
      socket.off("player_stats", handlePlayerStats);
      socket.off("party_update", handlePartyUpdate);
      socket.off("party_invite_received", handlePartyInvite);
      socket.off("terrain_sync", handleTerrainSync);
      socket.off("world_sync", handleWorldSync);
      socket.off("world_objects_sync", handleWorldObjectsSync);
      socket.off("entities_sync", handleEntitiesSync);
      socket.off("world_object_updated", handleWorldObjectUpdated);
      socket.off("world_object_removed", handleWorldObjectRemoved);
      socket.off("loot_opened", handleLootOpened);
      socket.off("loot_update", handleLootOpened);
      socket.off("role_update");
    };
  }, [socket, connected, setSelectedCharacter]);
};
