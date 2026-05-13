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
    
    // Centralized store access
    const store = useGameStore.getState();

    const listeners = {
      "quest_update": (newQuests: any) => {
        setSelectedCharacter(prev => prev ? { ...prev, quests: newQuests } : null);
        store.setActiveQuests(newQuests);
      },
      "session_start": (confirmedState: any) => {
        setSelectedCharacter(prev => prev ? { ...prev, ...confirmedState } : null);
        store.setActiveQuests(confirmedState.quests || {});
        if (confirmedState.pos) store.requestTeleport(confirmedState.pos);
        if (confirmedState.discoveredTeleports) {
          store.setDiscoveredTeleports(confirmedState.discoveredTeleports);
        } else {
          store.setDiscoveredTeleports([]);
        }
        store.setPlayerId(socket.id || null);
      },
      "inventory_update": (data: any) => {
        setSelectedCharacter(prev => prev ? { ...prev, inventory: data.inventory } : null);
        if (socket.id) store.updatePlayer(socket.id, { inventory: data.inventory });
      },
      "bank_update": (data: any) => {
        setSelectedCharacter(prev => prev ? { ...prev, bank: data.bank } : null);
        if (socket.id) store.updatePlayer(socket.id, { bank: data.bank });
      },
      "player_stats": (data: any) => {
        if (data.id === socket.id) {
          setSelectedCharacter(prev => {
            if (!prev) return null;
            // Only trigger re-render if values actually changed
            const hasChanged = Object.entries(data).some(([k, v]) => (prev as any)[k] !== v && v !== undefined);
            if (!hasChanged) return prev;
            return { ...prev, ...data };
          });
        }
        // Also update the players map in the store for other systems
        store.updatePlayer(data.id, data);
      },
      "party_update": store.setParty,
      "party_invite_received": store.setPartyInvite,
      "terrain_sync": store.updateTerrainData,
      "world_sync": (objects: any[]) => {
        logger.info("socket", `World sync: ${objects.length} objects`);
        store.setWorldObjects(objects);
      },
      "world_objects_sync": (objects: any[]) => {
        logger.info("socket", `World objects chunk sync: ${objects.length} objects`);
        store.addWorldObjects(objects);
      },
      "entities_sync": (entities: any[]) => {
        logger.info("socket", `Entities sync: ${entities.length} entities`);
        store.setEntities(entities);
      },
      "world_object_updated": store.addWorldObject,
      "world_object_removed": (data: { id: string }) => store.removeWorldObject(data.id),
      "loot_opened": (data: any) => {
        if (!data || (data.items.length === 0 && (data.gold || 0) <= 0)) {
          store.setActiveLoot(null);
        } else {
          store.setActiveLoot(data);
        }
      },
      "role_update": (data: { role: string }) => {
        setSelectedCharacter(prev => prev ? { ...prev, role: data.role } : null);
      }
    };

    // Register all listeners
    Object.entries(listeners).forEach(([event, handler]) => {
      socket.on(event, handler);
    });
    // Special case for loot_update sharing handler
    socket.on("loot_update", listeners.loot_opened);

    logger.info("system", `Registered ${Object.keys(listeners).length + 1} socket listeners via useGameSync`);

    return () => {
      Object.entries(listeners).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
      socket.off("loot_update", listeners.loot_opened);
    };

  }, [socket, connected, setSelectedCharacter]);
};
