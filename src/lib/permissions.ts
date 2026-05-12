/**
 * @file src/lib/permissions.ts
 * @description Centralizes the definition of administrative roles and access levels.
 * Maps user identities (emails) to specific roles like 'admin' or 'developer'.
 * @importance Essential: Controls access to sensitive features like the world editor and debug tools.
 */
/**
 * Permission System
 * 
 * Centralized mapping of email addresses to administrative roles.
 * Adding an email here will grant that account (and all its characters) 
 * the specified role across the entire game.
 */

export type UserRole = 'owner' | 'dev' | 'admin' | 'mod' | 'player';

export const STAFF_MAPPING: Record<string, UserRole> = {
  // Add more staff here if you want hardcoded overrides:
};

/**
 * Gets the administrative role for a given email address.
 * Defaults to 'player' if no special role is assigned.
 */
export const getAccountRole = (email: string | null | undefined): UserRole => {
  if (!email) return 'player';
  
  // 1. Check local mapping
  if (STAFF_MAPPING[email.toLowerCase()]) return STAFF_MAPPING[email.toLowerCase()];

  // 2. Note: Server-side handles the environment variable OWNER_EMAILS check.
  // The client will receive the correct 'role' field in the character object from the server.
  return 'player';
};

/**
 * Helper to check if a role has at least a certain level of access.
 * Levels: player (0), mod (1), admin (2), dev (3), owner (4)
 */
export const getRoleLevel = (role: string | null | undefined): number => {
  switch (role) {
    case 'owner': return 4;
    case 'dev': return 3;
    case 'admin': return 2;
    case 'mod': return 1;
    default: return 0;
  }
};
