/**
 * @file src/debug.config.ts
 * @description Centralized configuration for toggling debug features and logs.
 * Allows independent control over various subsystems for both client and server.
 * @importance Essential: Vital for developers to monitor and troubleshoot specific parts of the system during development.
 */

export type DebugCategory = 
  | 'MOVEMENT' 
  | 'NET' 
  | 'AI' 
  | 'DB' 
  | 'EDITOR' 
  | 'UI' 
  | 'PHYSICS' 
  | 'WORLD' 
  | 'SPAWNERS' 
  | 'STATS'
  | 'SYSTEM'
  | 'FIRESTORE'
  | 'TERRAIN'
  | 'COMBAT';

export interface DebugConfig {
  /** Master toggle: if false, all debug features and logs are disabled regardless of other settings. */
  ENABLED: boolean;
  
  /** Toggles for Client-side systems */
  CLIENT: Record<DebugCategory, boolean>;
  
  /** Toggles for Server-side systems */
  SERVER: Record<DebugCategory, boolean>;
}

export const DEBUG_CONFIG: DebugConfig = {
  ENABLED: false,
  
  CLIENT: {
    MOVEMENT: false,
    NET: false,
    AI: false,
    DB: false,
    EDITOR: false,
    UI: false,
    PHYSICS: false,
    WORLD: false,
    SPAWNERS: false,
    STATS: false,
    SYSTEM: false,
    FIRESTORE: false,
    TERRAIN: false,
    COMBAT: false,
  },
  
  SERVER: {
    MOVEMENT: false,
    NET: false,
    AI: false,
    DB: false,
    EDITOR: false,
    UI: false,
    PHYSICS: false,
    WORLD: false,
    SPAWNERS: false,
    STATS: false,
    SYSTEM: false,
    FIRESTORE: false,
    TERRAIN: false,
    COMBAT: false,
  }
};

/**
 * Helper to check if a debug category is enabled for a specific side.
 * @param side 'CLIENT' or 'SERVER'
 * @param category The subsystem to check
 * @returns boolean
 */
export const isDebugEnabled = (side: 'CLIENT' | 'SERVER', category: DebugCategory): boolean => {
  if (!DEBUG_CONFIG.ENABLED) return false;
  return DEBUG_CONFIG[side][category] ?? false;
};
