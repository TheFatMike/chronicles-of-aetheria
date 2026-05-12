/**
 * @file server/lib/auth.ts
 * @description Provides authentication and role-based access control helpers on the server.
 * Verifies user identities and manages administrative permissions.
 * @importance Essential: Ensures the security of server operations and restricts access to privileged tools.
 */
import { db } from "../db";

export async function getUserRole(userId: string, email: string): Promise<string> {
  let userRole = "player";

  // Check DB for specific role override
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      userRole = userDoc.data()?.role || userRole;
    }
  } catch (e) {
    // Fallback to default
  }

  // 1. Check environment variables for Owner status - ALWAYS takes priority
  const ownerEmails = (process.env.OWNER_EMAILS || "").toLowerCase().split(",");
  const isOwner = email && ownerEmails.includes(email.toLowerCase());
  
  if (isOwner) userRole = "owner";

  return userRole;
}

/**
 * Gets numerical level for a role to allow hierarchy checks.
 */
export function getRoleLevel(role: string | null | undefined): number {
  switch (role) {
    case 'owner': return 4;
    case 'dev': return 3;
    case 'admin': return 2;
    case 'mod': return 1;
    default: return 0;
  }
}

export function hasPermission(role: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(role);
}
