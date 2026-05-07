/**
 * Permission System
 * 
 * Centralized mapping of email addresses to administrative roles.
 * Adding an email here will grant that account (and all its characters) 
 * the specified role across the entire game.
 */

export type UserRole = 'dev' | 'admin' | 'mod' | 'player';

export const STAFF_MAPPING: Record<string, UserRole> = {
  "michaeljhoward94@gmail.com": "dev",
  // Add more staff here:
  // "admin@example.com": "admin",
  // "mod@example.com": "mod",
};

/**
 * Gets the administrative role for a given email address.
 * Defaults to 'player' if no special role is assigned.
 */
export const getAccountRole = (email: string | null | undefined): UserRole => {
  if (!email) return 'player';
  return STAFF_MAPPING[email.toLowerCase()] || 'player';
};

/**
 * Helper to check if a role has at least a certain level of access.
 * Levels: player (0), mod (1), admin (2), dev (3)
 */
export const getRoleLevel = (role: string | null | undefined): number => {
  switch (role) {
    case 'dev': return 3;
    case 'admin': return 2;
    case 'mod': return 1;
    default: return 0;
  }
};
