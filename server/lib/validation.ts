/**
 * @file server/lib/validation.ts
 * @description Helper for validating socket payloads against Zod schemas.
 */
import { Socket } from "socket.io";
import { z } from "zod";
import { serverLogger } from "../logger";

/**
 * Validates data against a schema. 
 * Returns the parsed data if valid, otherwise sends an error message to the client and returns null.
 */
export function validatePayload<T>(socket: Socket, schema: z.ZodSchema<T>, data: any, eventName: string): T | null {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errorMsg = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(", ");
    serverLogger.warn("security", `Invalid payload for event '${eventName}' from ${socket.id}: ${errorMsg}`);
    
    socket.emit("chat_message", {
      sender: "SYSTEM",
      text: "Invalid request format.",
      color: "#ff4444"
    });
    
    return null;
  }
  
  return result.data;
}
