import { Server, Socket } from "socket.io";
import { players, activeTrades } from "../../state";
import { serverLogger } from "../../logger";
import { db } from "../../db";
import crypto from "crypto";
import { updateQuestProgress, syncQuestInventory } from "../../logic/quest";

export const handleTradeRequest = (io: Server, socket: Socket, targetId: string) => {
  const player = players.get(socket.id);
  const target = players.get(targetId);

  if (!player || !target || socket.id === targetId) return;

  // Check distance
  const dx = player.pos[0] - target.pos[0];
  const dz = player.pos[2] - target.pos[2];
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist > 5) {
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

export const handleTradeAccept = (io: Server, socket: Socket, requesterId: string) => {
  const player = players.get(socket.id);
  const requester = players.get(requesterId);

  if (!player || !requester) return;

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

export const handleTradeLock = (io: Server, socket: Socket, data: { tradeId: string, gold: number }) => {
  const trade = activeTrades.get(data.tradeId);
  if (!trade) return;

  const isP1 = trade.p1 === socket.id;
  const player = players.get(socket.id);
  if (!player) return;

  // Validate gold
  const gold = Math.max(0, data.gold);
  if (player.gold < gold) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "You don't have enough gold.", color: "#ef4444" });
    return;
  }

  if (isP1) {
    trade.p1Locked = true;
    trade.p1Gold = gold;
  } else {
    trade.p2Locked = true;
    trade.p2Gold = gold;
  }

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
      // 1. Check Inventory Space
      // P1 needs space for P2's items, and vice versa.
      // But they are ALSO losing items, so we need to be careful.
      
      const p1Available = p1.inventory.filter((s: any) => s === null).length;
      const p2Available = p2.inventory.filter((s: any) => s === null).length;

      // P1 receives trade.p2Items.length items
      // P2 receives trade.p1Items.length items
      // Important: the items being traded AWAY will open up slots.
      // However, to keep it simple and safe:
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

      // 2. Perform Exchange
      
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

      // 3. Save & Notify
      const savePlayer = (p: any, socket: Socket) => {
        socket.emit("player_stats", { id: p.id, gold: p.gold });
        socket.emit("inventory_update", { inventory: p.inventory });
        db.collection("users").doc(p.userId).collection("characters").doc(p.characterId).set({
          gold: p.gold,
          inventory: p.inventory
        }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Trade save failed", e.message));
      };
      const s1 = io.sockets.sockets.get(trade.p1);
      const s2 = io.sockets.sockets.get(trade.p2);

      if (s1) {
        savePlayer(p1, s1);
        syncQuestInventory(s1, p1);
      }
      if (s2) {
        savePlayer(p2, s2);
        syncQuestInventory(s2, p2);
      }

      io.to(trade.p1).emit("chat_message", { sender: "SYSTEM", text: "Trade complete!", color: "#22c55e" });
      io.to(trade.p2).emit("chat_message", { sender: "SYSTEM", text: "Trade complete!", color: "#22c55e" });
    }

    activeTrades.delete(tradeId);
    io.to(trade.p1).emit("trade_cancel");
    io.to(trade.p2).emit("trade_cancel");
  } else {
    io.to(trade.p1).emit("trade_start", trade);
    io.to(trade.p2).emit("trade_start", trade);
  }
};

export const handleTradeAddItem = (io: Server, socket: Socket, data: { tradeId: string, inventoryIndex: number }) => {
  const trade = activeTrades.get(data.tradeId);
  if (!trade) return;

  const isP1 = trade.p1 === socket.id;
  if ((isP1 && trade.p1Locked) || (!isP1 && trade.p2Locked)) return;

  trade.p1Locked = false;
  trade.p2Locked = false;
  trade.p1Confirmed = false;
  trade.p2Confirmed = false;

  const player = players.get(socket.id);
  if (!player) return;

  const item = player.inventory[data.inventoryIndex];
  if (!item) return;

  // Check if already in trade
  const tradeItems = isP1 ? trade.p1Items : trade.p2Items;
  if (tradeItems.length >= 8) {
    socket.emit("chat_message", { sender: "SYSTEM", text: "Trade is full (max 8 items).", color: "#facc15" });
    return;
  }

  // Add a copy to trade (with original inventory index for final move)
  tradeItems.push({ ...item, inventoryIndex: data.inventoryIndex });

  io.to(trade.p1).emit("trade_start", trade);
  io.to(trade.p2).emit("trade_start", trade);
};

export const handleTradeRemoveItem = (io: Server, socket: Socket, data: { tradeId: string, tradeIndex: number }) => {
  const trade = activeTrades.get(data.tradeId);
  if (!trade) return;

  trade.p1Locked = false;
  trade.p2Locked = false;
  trade.p1Confirmed = false;
  trade.p2Confirmed = false;

  const isP1 = trade.p1 === socket.id;

  const tradeItems = isP1 ? trade.p1Items : trade.p2Items;
  if (data.tradeIndex >= 0 && data.tradeIndex < tradeItems.length) {
    tradeItems.splice(data.tradeIndex, 1);
  }

  io.to(trade.p1).emit("trade_start", trade);
  io.to(trade.p2).emit("trade_start", trade);
};
