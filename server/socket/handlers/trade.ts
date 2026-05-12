/**
 * @file server/socket/handlers/trade.ts
 * @description Manages the secure item trading system between players.
 * Handles trade requests, item locking, confirmation, and final transaction processing.
 * @importance Essential: Provides a safe and reliable way for players to exchange goods and currency.
 */
import { Server, Socket } from "socket.io";
import { players, activeTrades } from "../../state";
import { serverLogger } from "../../logger";
import { db } from "../../db";
import crypto from "crypto";
import { updateQuestProgress, syncQuestInventory } from "../../logic/quest";
import { TradeRequestSchema, TradeAcceptSchema, TradeLockSchema, TradeItemSchema } from "../../lib/schemas";
import { validatePayload } from "../../lib/validation";
import { markPlayerDirty } from "../../lib/stateUtils";

export const handleTradeRequest = (io: Server, socket: Socket, data: any) => {
  const validated = validatePayload(socket, TradeRequestSchema, data, "trade_request");
  if (!validated) return;

  const { targetId } = validated;
  const player = players.get(socket.id);
  const target = players.get(targetId);

  if (!player || !target || socket.id === targetId) return;

  // Check distance
  const dx = player.pos[0] - target.pos[0];
  const dz = player.pos[2] - target.pos[2];
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist > 10) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "Target is too far away to trade.", color: "#ef4444" });
    return;
  }

  // Send request to target
  io.to(targetId).emit("trade_request_received", {
    fromId: socket.id,
    fromName: player.characterName
  });

  socket.emit("chat_message", { sender: "SYSTEM", text: `Trade request sent to ${target.characterName}.`, color: "#3b82f6" });
};

export const handleTradeAccept = (io: Server, socket: Socket, data: any) => {
  const validated = validatePayload(socket, TradeAcceptSchema, data, "trade_accept");
  if (!validated) return;

  const { requesterId } = validated;
  const player = players.get(socket.id);
  const requester = players.get(requesterId);

  if (!player || !requester) return;

  // Final Proximity Check
  const dx = player.pos[0] - requester.pos[0];
  const dz = player.pos[2] - requester.pos[2];
  if (Math.sqrt(dx*dx + dz*dz) > 12) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "Requester is now too far away.", color: "#ef4444" });
    return;
  }

  const tradeId = crypto.randomUUID();
  const trade = {
    id: tradeId,
    p1: requesterId,
    p2: socket.id,
    p1Name: requester.characterName,
    p2Name: player.characterName,
    p1Items: [],
    p2Items: [],
    p1Gold: 0,
    p2Gold: 0,
    p1Locked: false,
    p2Locked: false,
    p1Confirmed: false,
    p2Confirmed: false
  };

  activeTrades.set(tradeId, trade);

  // Notify both
  io.to(requesterId).emit("trade_start", trade);
  io.to(socket.id).emit("trade_start", trade);
};

export const handleTradeCancel = (io: Server, socket: Socket, tradeId: string) => {
  const trade = activeTrades.get(tradeId);
  if (!trade) return;

  activeTrades.delete(tradeId);

  io.to(trade.p1).emit("trade_cancel");
  io.to(trade.p2).emit("trade_cancel");
  
  io.to(trade.p1).emit("chat_message", { sender: "SYSTEM", text: "Trade cancelled.", color: "#ef4444" });
  io.to(trade.p2).emit("chat_message", { sender: "SYSTEM", text: "Trade cancelled.", color: "#ef4444" });
};

export const handleTradeLock = (io: Server, socket: Socket, data: any) => {
  const validated = validatePayload(socket, TradeLockSchema, data, "trade_lock");
  if (!validated) return;

  const trade = activeTrades.get(validated.tradeId);
  if (!trade) return;

  const isP1 = trade.p1 === socket.id;
  const player = players.get(socket.id);
  if (!player) return;

  // Validate gold
  const gold = Math.max(0, validated.gold);
  if (player.gold < gold) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You don't have enough gold.", color: "#ef4444" });
    return;
  }

  if (isP1) {
    trade.p1Locked = true;
    trade.p1Gold = gold;
    trade.p1Confirmed = false;
  } else {
    trade.p2Locked = true;
    trade.p2Gold = gold;
    trade.p2Confirmed = false;
  }
  
  // Any lock reset confirmations
  trade.p1Confirmed = false;
  trade.p2Confirmed = false;

  io.to(trade.p1).emit("trade_start", trade);
  io.to(trade.p2).emit("trade_start", trade);
};

export const handleTradeConfirm = (io: Server, socket: Socket, tradeId: string) => {
  const trade = activeTrades.get(tradeId);
  if (!trade || !trade.p1Locked || !trade.p2Locked) return;

  const isP1 = trade.p1 === socket.id;
  if (isP1) trade.p1Confirmed = true;
  else trade.p2Confirmed = true;

  if (trade.p1Confirmed && trade.p2Confirmed) {
    // FINAL EXCHANGE
    const p1 = players.get(trade.p1);
    const p2 = players.get(trade.p2);

    if (p1 && p2) {
      // 1. RE-VERIFY ITEMS AND GOLD (CRITICAL ANTI-CHEAT)
      const verifyPlayerTrade = (p: any, committedItems: any[], committedGold: number) => {
        if ((p.gold || 0) < committedGold) return false;
        for (const item of committedItems) {
          const actualItem = p.inventory[item.inventoryIndex];
          if (!actualItem || actualItem.itemId !== item.itemId || (actualItem.quantity || 1) !== (item.quantity || 1)) {
            return false;
          }
        }
        return true;
      };

      if (!verifyPlayerTrade(p1, trade.p1Items, trade.p1Gold) || !verifyPlayerTrade(p2, trade.p2Items, trade.p2Gold)) {
        serverLogger.warn("anti-cheat", `Trade validation failed for ${p1.characterName} or ${p2.characterName}. Potential duplication attempt.`);
        io.to(trade.p1).emit("chat_message", { sender: "SYSTEM", text: "Trade failed: Items or gold state changed.", color: "#ef4444" });
        io.to(trade.p2).emit("chat_message", { sender: "SYSTEM", text: "Trade failed: Items or gold state changed.", color: "#ef4444" });
        activeTrades.delete(tradeId);
        io.to(trade.p1).emit("trade_cancel");
        io.to(trade.p2).emit("trade_cancel");
        return;
      }

      // 2. Check Inventory Space
      const p1Available = p1.inventory.filter((s: any) => s === null).length;
      const p2Available = p2.inventory.filter((s: any) => s === null).length;

      // P1 receives trade.p2Items.length items
      // P2 receives trade.p1Items.length items
      if (p1Available < trade.p2Items.length) {
        io.to(trade.p1).emit("chat_message", { sender: "SYSTEM", text: "You don't have enough inventory space!", color: "#ef4444" });
        io.to(trade.p2).emit("chat_message", { sender: "SYSTEM", text: `${p1.characterName} doesn't have enough space.`, color: "#ef4444" });
        return;
      }
      if (p2Available < trade.p1Items.length) {
        io.to(trade.p2).emit("chat_message", { sender: "SYSTEM", text: "You don't have enough inventory space!", color: "#ef4444" });
        io.to(trade.p1).emit("chat_message", { sender: "SYSTEM", text: `${p2.characterName} doesn't have enough space.`, color: "#ef4444" });
        return;
      }

      // 3. Perform Exchange
      
      // GOLD
      p1.gold -= trade.p1Gold;
      p2.gold += trade.p1Gold;
      
      p2.gold -= trade.p2Gold;
      p1.gold += trade.p2Gold;

      // ITEMS
      const p1Inv = [...p1.inventory];
      const p2Inv = [...p2.inventory];

      // Remove items from sellers
      trade.p1Items.forEach((item: any) => {
        p1Inv[item.inventoryIndex] = null;
      });
      trade.p2Items.forEach((item: any) => {
        p2Inv[item.inventoryIndex] = null;
      });

      // Add items to buyers
      trade.p1Items.forEach((item: any) => {
        const empty = p2Inv.findIndex(s => s === null);
        if (empty !== -1) {
          const { inventoryIndex, ...itemData } = item;
          p2Inv[empty] = itemData;
        }
      });
      trade.p2Items.forEach((item: any) => {
        const empty = p1Inv.findIndex(s => s === null);
        if (empty !== -1) {
          const { inventoryIndex, ...itemData } = item;
          p1Inv[empty] = itemData;
        }
      });

      p1.inventory = p1Inv;
      p2.inventory = p2Inv;

      // 4. Save & Notify
      const s1 = io.sockets.sockets.get(trade.p1);
      const s2 = io.sockets.sockets.get(trade.p2);

      if (s1) {
        s1.emit("player_stats", { id: p1.id, gold: p1.gold });
        s1.emit("inventory_update", { inventory: p1.inventory });
        syncQuestInventory(s1, p1);
        markPlayerDirty(trade.p1, ["inventory", "gold"]);
      }
      if (s2) {
        s2.emit("player_stats", { id: p2.id, gold: p2.gold });
        s2.emit("inventory_update", { inventory: p2.inventory });
        syncQuestInventory(s2, p2);
        markPlayerDirty(trade.p2, ["inventory", "gold"]);
      }

      io.to(trade.p1).emit("chat_message", { sender: "SYSTEM", text: "Trade complete!", color: "#22c55e" });
      io.to(trade.p2).emit("chat_message", { sender: "SYSTEM", text: "Trade complete!", color: "#22c55e" });
      
      serverLogger.info("trade", `Trade complete between ${p1.characterName} and ${p2.characterName}.`);
    }

    activeTrades.delete(tradeId);
    io.to(trade.p1).emit("trade_cancel");
    io.to(trade.p2).emit("trade_cancel");
  } else {
    io.to(trade.p1).emit("trade_start", trade);
    io.to(trade.p2).emit("trade_start", trade);
  }
};

export const handleTradeAddItem = (io: Server, socket: Socket, data: any) => {
  const validated = validatePayload(socket, TradeItemSchema, data, "trade_add_item");
  if (!validated || validated.inventoryIndex === undefined) return;

  const trade = activeTrades.get(validated.tradeId);
  if (!trade) return;

  const isP1 = trade.p1 === socket.id;
  if ((isP1 && trade.p1Locked) || (!isP1 && trade.p2Locked)) return;

  // Reset confirmation on change
  trade.p1Locked = false;
  trade.p2Locked = false;
  trade.p1Confirmed = false;
  trade.p2Confirmed = false;

  const player = players.get(socket.id);
  if (!player) return;

  const item = player.inventory[validated.inventoryIndex];
  if (!item) return;

  // Check if already in trade
  const tradeItems = isP1 ? trade.p1Items : trade.p2Items;
  if (tradeItems.length >= 8) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "Trade is full (max 8 items).", color: "#facc15" });
    return;
  }

  // Ensure item isn't already added from this slot
  if (tradeItems.some((i: any) => i.inventoryIndex === validated.inventoryIndex)) {
    return;
  }

  // Add a copy to trade (with original inventory index for final move)
  tradeItems.push({ ...item, inventoryIndex: validated.inventoryIndex });

  io.to(trade.p1).emit("trade_start", trade);
  io.to(trade.p2).emit("trade_start", trade);
};

export const handleTradeRemoveItem = (io: Server, socket: Socket, data: any) => {
  const validated = validatePayload(socket, TradeItemSchema, data, "trade_remove_item");
  if (!validated || validated.tradeIndex === undefined) return;

  const trade = activeTrades.get(validated.tradeId);
  if (!trade) return;

  // Reset confirmation on change
  trade.p1Locked = false;
  trade.p2Locked = false;
  trade.p1Confirmed = false;
  trade.p2Confirmed = false;

  const isP1 = trade.p1 === socket.id;
  const tradeItems = isP1 ? trade.p1Items : trade.p2Items;
  
  if (validated.tradeIndex >= 0 && validated.tradeIndex < tradeItems.length) {
    tradeItems.splice(validated.tradeIndex, 1);
  }

  io.to(trade.p1).emit("trade_start", trade);
  io.to(trade.p2).emit("trade_start", trade);
};
