/**
 * @file server.ts
 * @description The entry point for the Chronicles of Aetheria backend server.
 * Initializes Express, Socket.io, Firebase, Redis, and the game engine loop.
 * @importance Critical: Acts as the central hub connecting all server-side systems and serving the client application.
 */
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import customParser from "socket.io-msgpack-parser";
import admin from "firebase-admin";
import { initDb } from "./server/db";
import { redis } from "./server/redis";
import { serverLogger, logBuffer } from "./server/logger";
import { startHeartbeat, initializeSpawners, initializeWorld } from "./server/systems/gameEngine";
import { registerHandlers } from "./server/socket/handlers";
import { players, entities, spawners, terrainData } from "./server/state";

export let io: Server;

import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const db = await initDb();
  
  const app = express();
  const httpServer = createServer(app);
  io = new Server(httpServer, { 
    cors: { origin: "*" },
    parser: customParser
  });

  // 1. Auth Middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      (socket as any).userId = decoded.uid;
      (socket as any).email = decoded.email;
      next();
    } catch (e: any) {
      next(new Error("Auth failed"));
    }
  });

  // 2. HTTP Routes
  app.get("/api/health", (req, res) => res.json({ status: "ok", db: db.projectId }));
  app.get("/api/debug/state", (req, res) => res.json({ 
    players: Array.from(players.entries()), 
    entities: Array.from(entities.entries()), 
    terrainTiles: terrainData.size,
    logs: logBuffer 
  }));

  app.get("/api/debug/db-stats", async (req, res) => {
    try {
      const { getDatabaseStats } = await import("./server/diagnostics");
      const stats = await getDatabaseStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.post("/api/admin/wipe-terrain", async (req, res) => {
    try {
      const { db } = await import("./server/db");
      const snapshot = await db.collection("terrain_chunks").get();
      serverLogger.info("admin", `Wipe request received. Found ${snapshot.size} chunks.`);
      
      const batch = db.batch();
      snapshot.forEach((doc: any) => batch.delete(doc.ref));
      await batch.commit();
      
      terrainData.clear();
      
      // Clear Redis Cache
      const { redis } = await import("./server/redis");
      await redis.del("world:terrain");
      // Clear loaded chunk markers in Redis
      const keys = await redis.keys("loaded_chunk:*");
      if (keys.length > 0) await redis.del(...keys);
      
      redis.publish("terrain:sync", JSON.stringify([]));

      io.emit("terrain_sync", []); 
      
      serverLogger.info("admin", `Wipe complete. Deleted ${snapshot.size} chunks.`);
      res.json({ status: "ok", deletedChunks: snapshot.size });
    } catch (e: any) {
      serverLogger.error("admin", `Wipe failed: ${e.message}`);
      res.status(500).json({ error: e.message });
    }
  });

  // 3. Vite / Static Files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 4. Socket Handlers
  io.on("connection", (socket) => registerHandlers(io, socket));

  // 5. Game Engine
  await initializeWorld();
  await initializeSpawners();
  startHeartbeat(io);

  // 7. MMO Global Services (Redis Pub/Sub)
  const { redisSub } = await import("./server/redis");
  redisSub.subscribe("chat:global");
  redisSub.subscribe("terrain:sync");

  redisSub.on("message", (channel, message) => {
    if (channel === "chat:global") {
      const data = JSON.parse(message);
      io.emit("chat_message", data);
    } else if (channel === "terrain:sync") {
      const updates = JSON.parse(message);
      // Update local memory state
      for (const p of updates) {
        terrainData.set(`${p.x}_${p.z}`, { y: p.y, type: p.type });
      }
      // Broadcast to clients connected to THIS instance
      io.emit("terrain_sync", updates);
    }
  });

  // 6. Graceful Shutdown
  const shutdown = async (signal: string) => {
    serverLogger.info("system", `${signal} received. Performing final global save...`);
    
    try {
      // 1. Perform final save
      const { performShutdownSave } = await import("./server/systems/persistence");
      await performShutdownSave();
      
      // 2. Close Redis connections
      const { closeRedis } = await import("./server/redis");
      await closeRedis();
      
      serverLogger.info("system", "Shutdown complete.");
    } catch (err: any) {
      serverLogger.error("system", `Shutdown error: ${err.message}`);
    } finally {
      process.exit(0);
    }
  };


  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    serverLogger.info("system", `Server running at port ${PORT}`);
  });
}

import { isMainThread } from "worker_threads";

if (isMainThread) {
  bootstrap().catch(err => {
    console.error("Fatal startup error", err);
  });
}
