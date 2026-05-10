/**
 * @file server/lib/auth.ts
 * @description Provides authentication and role-based access control helpers on the server.
 * Verifies user identities and manages administrative permissions.
 * @importance Essential: Ensures the security of server operations and restricts access to privileged tools.
 */
import { db } from "../db";

export async function getUserRole(userId: string, email: string): Promise<string> {
  let userRole = "player";
  
  // Hardcoded owner check
  const isOwner = email && email.toLowerCase() === "michaeljhoward94@gmail.com";
  if (isOwner) userRole = "dev";

  // Check DB for specific role override
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      userRole = userDoc.data()?.role || userRole;
    }
  } catch (e) {
    // Fallback to default
  }

  return userRole;
}

export function hasPermission(role: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(role);
}
