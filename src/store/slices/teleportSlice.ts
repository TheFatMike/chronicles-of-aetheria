/**
 * @file src/store/slices/teleportSlice.ts
 * @description State management for the fast-travel teleportation system.
 * Tracks discovered crystal locations and manages the teleportation UI state.
 * @importance Essential: Provides the logic for player traversal between key world locations.
 */
import { StateCreator } from 'zustand';
import { GameState, TeleportSlice } from '../types';
import { logger } from '../../lib/logger';

export const createTeleportSlice: StateCreator<GameState, [], [], TeleportSlice> = (set, get) => ({
  discoveredTeleports: [],
  isTeleportMenuOpen: false,
  activeTeleportCrystalId: null,

  discoverTeleport: (id) => set((state) => {
    if (state.discoveredTeleports.includes(id)) return state;
    
    logger.info("game", `Discovered new teleport crystal: ${id}`);
    
    const newDiscovered = [...state.discoveredTeleports, id];
    
    // 1. Update Local Store
    const me = state.players[state.id || ""];
    if (me) {
      state.updatePlayer(state.id!, {
        discoveredTeleports: newDiscovered
      });
    }

    // 2. Emit to Server for Persistence
    const socket = (window as any).socket;
    if (socket) {
      socket.emit("character_update", {
        discoveredTeleports: newDiscovered
      });
    }

    return { discoveredTeleports: newDiscovered };
  }),

  setTeleportMenuOpen: (open, crystalId = null) => {
    // If opening, ensure the current crystal is discovered
    if (open && crystalId) {
      get().discoverTeleport(crystalId);
    }
    
    set({ 
      isTeleportMenuOpen: open,
      activeTeleportCrystalId: crystalId 
    });
  },

  setDiscoveredTeleports: (ids) => set({ discoveredTeleports: ids }),
});
