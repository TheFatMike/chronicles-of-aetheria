/**
 * @file server/socket/handlers/combat.ts
 * @description Bridges socket events to combat logic systems.
 * Processes skill casting, ability activation, and combat state changes.
 * @importance Essential: Fundamental for the game's combat mechanics and interactive gameplay loop.
 */
import { Socket, Server } from "socket.io";
import { handleCastSkill } from "../../logic/combat";

export const handleCombatSkill = (io: Server, socket: Socket, data: any) => {
  handleCastSkill(io, socket, data);
};
