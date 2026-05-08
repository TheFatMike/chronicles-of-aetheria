import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import customParser from "socket.io-msgpack-parser";
import admin from "firebase-admin";
import { initDb } from "./server/db";
import { serverLogger, logBuffer } from "./server/logger";
import { startHeartbeat, initializeSpawners, initializeWorld } from "./server/systems/gameEngine";
import { registerHandlers } from "./server/socket/handlers";
import { players, entities, spawners } from "./server/state";

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
  const io = new Server(httpServer, { 
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
  app.get("/api/debug/state", (req, res) => res.json({ players: Array.from(players.entries()), entities: Array.from(entities.entries()), logs: logBuffer }));

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

  // 6. Graceful Shutdown
  const shutdown = async (signal: string) => {
    serverLogger.info("system", `${signal} received. Performing final global save...`);
    await import("./server/systems/persistence").then(m => m.performShutdownSave());
    serverLogger.info("system", "Shutdown complete.");
    process.exit(0);
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
