/**
 * @file server/lib/playerUtils.ts
 * @description Centralized player management utilities.
 */
import { Server, Socket } from "socket.io";
import { markPlayerDirty } from "./stateUtils";

export function giveGold(socket: Socket, player: any, amount: number) {
  player.gold = (player.gold || 0) + amount;
  socket.emit("player_stats", { id: player.id, gold: player.gold });
  markPlayerDirty(socket.id, ["gold"]);
}

export function takeGold(socket: Socket, player: any, amount: number): boolean {
  if ((player.gold || 0) < amount) return false;
  player.gold -= amount;
  socket.emit("player_stats", { id: player.id, gold: player.gold });
  markPlayerDirty(socket.id, ["gold"]);
  return true;
}

export function syncPlayerStats(io: Server | Socket, player: any) {
  const payload = {
    id: player.id,
    hp: player.hp,
    mp: player.mp,
    maxHp: player.maxHp,
    maxMp: player.maxMp,
    level: player.level,
    exp: player.exp,
    maxExp: player.maxExp,
    gold: player.gold
  };
  
  if ("emit" in io && typeof io.emit === 'function') {
    (io as Socket).emit("player_stats", payload);
  }
}
