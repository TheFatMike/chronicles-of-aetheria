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
        quests: confirmedState.quests
      } : null);
      
      useGameStore.getState().setActiveQuests(confirmedState.quests || {});
    };

    // 3. Inventory Updates
    const handleInventoryUpdate = (data: any) => {
      setSelectedCharacter(prev => prev ? { ...prev, inventory: data.inventory } : null);
    };

    // 4. Player Stats (Health/Mana Regen)
    const handlePlayerStats = (data: any) => {
      if (data.id === socket.id) {
        setSelectedCharacter(prev => prev ? { ...prev, hp: data.hp, mp: data.mp } : null);
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

    // Register listeners
    socket.on("quest_update", handleQuestUpdate);
    socket.on("session_start", handleSessionStart);
    socket.on("inventory_update", handleInventoryUpdate);
    socket.on("player_stats", handlePlayerStats);
    socket.on("party_update", handlePartyUpdate);
    socket.on("party_invite_received", handlePartyInvite);
    socket.on("terrain_sync", handleTerrainSync);

    // Initial Terrain Request
    socket.emit("request_terrain_sync");

    logger.info("system", "Socket listeners registered via useGameSync");

    return () => {
      socket.off("quest_update", handleQuestUpdate);
      socket.off("session_start", handleSessionStart);
      socket.off("inventory_update", handleInventoryUpdate);
      socket.off("player_stats", handlePlayerStats);
      socket.off("party_update", handlePartyUpdate);
      socket.off("party_invite_received", handlePartyInvite);
      socket.off("terrain_sync", handleTerrainSync);
    };
  }, [socket, connected, setSelectedCharacter]);
};
