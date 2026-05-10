/**
 * @file server/lib/stateUtils.ts
 * @description Utility functions for managing player dirty state.
 */
import { dirtyPlayers } from "../state";

/**
 * Marks a specific player and their fields as dirty for the next autosave.
 * @param socketId The player's socket ID.
 * @param fields The fields that have changed (e.g., 'pos', 'inventory', 'stats').
 */
export function markPlayerDirty(socketId: string, fields: string[]) {
  let playerFields = dirtyPlayers.get(socketId);
  if (!playerFields) {
    playerFields = new Set<string>();
    dirtyPlayers.set(socketId, playerFields);
  }
  
  fields.forEach(f => playerFields!.add(f));
}
