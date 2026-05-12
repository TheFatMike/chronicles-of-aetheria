/**
 * @file server/systems/persistence/players.ts
 * @description Manages player session persistence using a Redis Write-Back pattern.
 */
import { db } from "../../db";
import { players, dirtyPlayers } from "../../state";
import { serverLogger } from "../../logger";
import admin from "firebase-admin";
import { redis } from "../../redis";
import { unloadInactiveChunks } from "./chunks";

export const autosavePlayers = async () => {
  if (dirtyPlayers.size === 0) return;
  
  const playersToSave = new Map(dirtyPlayers);
  dirtyPlayers.clear();
  
  for (const [id, fields] of playersToSave.entries()) {
    const p = players.get(id);
    if (p) {
      const redisData = {
        ...p,
        pos: JSON.stringify(p.pos),
        rot: JSON.stringify(p.rot),
        stats: JSON.stringify(p.stats),
        inventory: JSON.stringify(p.inventory),
        equipment: JSON.stringify(p.equipment),
        hotbar: JSON.stringify(p.hotbar),
        quests: JSON.stringify(p.quests),
        lastActive: Date.now()
      };
      await redis.hset(`player:session:${p.characterId}`, redisData);
    }
  }
  
  serverLogger.info("redis", `Buffered ${playersToSave.size} player updates to Redis Write-Back cache.`);
};

export const flushRedisToFirestore = async () => {
  try {
    let cursor = "0";
    let keys: string[] = [];
    
    do {
      const [newCursor, foundKeys] = await redis.scan(cursor, "MATCH", "player:session:*", "COUNT", "100");
      cursor = newCursor;
      keys.push(...foundKeys);
    } while (cursor !== "0" && keys.length < 1000);

    if (keys.length === 0) return;

    const pipeline = redis.pipeline();
    keys.forEach(k => pipeline.hgetall(k));
    const results = await pipeline.exec();

    const batch = db.batch();
    let count = 0;

    for (let i = 0; i < (results?.length || 0); i++) {
      const [err, data] = results![i] as [any, any];
      if (err || !data || !data.userId || !data.characterId) continue;

      const charRef = db.collection("users").doc(data.userId).collection("characters").doc(data.characterId);
      
      const payload: any = {
        name: data.characterName,
        class: data.class,
        color: data.color,
        level: parseInt(data.level) || 1,
        exp: parseInt(data.exp) || 0,
        maxExp: parseInt(data.maxExp) || 100,
        hp: parseFloat(data.hp) || 0,
        mp: parseFloat(data.mp) || 0,
        gold: parseInt(data.gold) || 0,
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      };

      try {
        if (data.pos) payload.pos = JSON.parse(data.pos);
        if (data.rot) payload.rot = JSON.parse(data.rot);
        if (data.stats) payload.stats = JSON.parse(data.stats);
        if (data.inventory) payload.inventory = JSON.parse(data.inventory);
        if (data.equipment) payload.equipment = JSON.parse(data.equipment);
        if (data.hotbar) payload.hotbar = JSON.parse(data.hotbar);
        if (data.quests) payload.quests = JSON.parse(data.quests);
      } catch (e: any) {
        serverLogger.error("persistence", `Failed to parse Redis data for ${data.characterName}: ${e.message}`);
      }

      batch.set(charRef, payload, { merge: true });
      count++;
      if (count >= 450) break;
    }

    if (count > 0) {
      await batch.commit();
      serverLogger.info("system", `Flushed ${count} player sessions from Redis to Firestore.`);
    }
  } catch (e: any) {
    serverLogger.error("system", "Failed to flush Redis to Firestore", e.message);
  }
};

export const performShutdownSave = async () => {
  serverLogger.info("system", "Performing final shutdown save...");
  await autosavePlayers();
  await flushRedisToFirestore();
};

export const startPeriodicTasks = () => {
  // 1. Player Autosave to Redis (Every 1 minute)
  setInterval(async () => {
    await autosavePlayers();
  }, 1000 * 60);

  // 2. Redis to Firestore Flush (Every 30 minutes)
  setInterval(async () => {
    await flushRedisToFirestore();
  }, 1000 * 60 * 30);

  // 3. Redis Ghost Cleanup (10 minutes)
  setInterval(async () => {
    const { cleanupGhostPlayers } = await import("../../redis");
    await cleanupGhostPlayers();
  }, 1000 * 60 * 10);

  // 4. Chunk Unloading (Every 5 minutes)
  setInterval(async () => {
    await unloadInactiveChunks();
  }, 1000 * 60 * 5);
};
