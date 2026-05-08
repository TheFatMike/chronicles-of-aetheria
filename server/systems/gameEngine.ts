import { Server } from "socket.io";
import admin from "firebase-admin";
import { players, entities, spawners, worldObjects } from "../state";
import { serverLogger } from "../logger";
import { performance } from "perf_hooks";
import { db } from "../db";
import { INITIAL_WORLD_OBJECTS } from "../../src/data/world";
import { calculateTotalStats, calculateHPRegen, calculateMPRegen, calculateMaxHP, calculateMaxMP } from "../../src/lib/gameUtils";
import { ENTITY_TEMPLATES } from "../data/entityTemplates";
import { filterNearby, checkWorldCollision } from "./spatial";

export const GET_HITBOXES = (type: string, scale: number = 1): any[] => {
  // We now use automatic Mesh Collision on the client. 
  // Manual hitboxes are deprecated.
  return [];
};

export const initializeWorld = async () => {
  try {
    const snapshot = await db.collection("world").get();
    if (snapshot.empty) {
      serverLogger.info("world", "No world objects in DB. Initializing default world...");
      const batch = db.batch();
      for (const obj of INITIAL_WORLD_OBJECTS) {
        const docRef = db.collection("world").doc(obj.id);
        batch.set(docRef, obj);
        worldObjects.set(obj.id, { ...obj, hitboxes: GET_HITBOXES(obj.type, obj.scale) });
      }
      await batch.commit();
    } else {
      serverLogger.info("world", `Loading ${snapshot.size} objects from DB...`);
      snapshot.forEach((doc: any) => {
        const data = doc.data() as any;
        worldObjects.set(doc.id, { 
          ...data, 
          hitboxes: GET_HITBOXES(data.type, data.scale) 
        });

        // AUTO-SPAWN: If this is an NPC or Spawner world object, register it!
        if (data.type.startsWith('spawner_')) {
          const entityType = data.type.replace('spawner_', '');
          spawners.set(doc.id, { 
            id: doc.id, 
            entityType,
            pos: data.pos,
            radius: 5,
            maxEntities: 3,
            spawnInterval: 10000 
          });
        } else if (data.type.startsWith('npc_')) {
          const template = ENTITY_TEMPLATES[data.type.replace('npc_', '')];
          if (template) {
            const maxHp = calculateMaxHP(template.baseStats);
            entities.set(doc.id, {
              ...template,
              id: doc.id,
              pos: data.pos,
              rot: data.rot || [0,0,0],
              hp: maxHp,
              maxHp: maxHp,
              stats: template.baseStats,
              aiState: 'IDLE',
              isMoving: false
            });
          }
        }
      });
    }
  } catch (error: any) {
    serverLogger.error("world", `Failed to initialize world: ${error.message}`);
  }
};

export const initializeSpawners = async () => {
  try {
    const snapshot = await db.collection("spawners").get();
    snapshot.forEach((doc: any) => {
      spawners.set(doc.id, { id: doc.id, ...doc.data() } as any);
    });
    serverLogger.info("system", `Initialized ${spawners.size} spawners.`);
  } catch (error: any) {
    serverLogger.error("system", `Failed to initialize spawners: ${error.message}`);
  }
};

export const startHeartbeat = (io: Server) => {
  const TICK_TIME = 100; // 10 ticks per second

  const tick = () => {
    try {
      const now = performance.now();

      // 1. Spawner Logic
      for (const spawner of spawners.values()) {
        const activeEntities = Array.from(entities.values()).filter(e => e.spawnerId === spawner.id);
        if (activeEntities.length < spawner.maxEntities && now - (spawner.lastSpawn || 0) > spawner.spawnInterval) {
          const id = crypto.randomUUID();
          const template = ENTITY_TEMPLATES[spawner.entityType];
          if (!template) continue;

          const rx = (Math.random() - 0.5) * spawner.radius * 2;
          const rz = (Math.random() - 0.5) * spawner.radius * 2;
          
          const maxHp = calculateMaxHP(template.baseStats);
          const maxMp = calculateMaxMP(template.baseStats);

          const newEntity = {
            ...template,
            id,
            spawnerId: spawner.id,
            pos: [spawner.pos[0] + rx, 0, spawner.pos[2] + rz] as [number, number, number],
            rot: [0, Math.random() * Math.PI * 2, 0] as [number, number, number],
            homePos: [spawner.pos[0] + rx, 0, spawner.pos[2] + rz] as [number, number, number],
            hp: maxHp,
            mp: maxMp,
            maxHp: maxHp,
            maxMp: maxMp,
            stats: template.baseStats,
            aiState: spawner.pathId ? 'PATROL' : 'IDLE',
            isMoving: false,
            pathId: spawner.pathId,
            currentWaypointIndex: 0
          };
          entities.set(id, newEntity as any);
          spawner.lastSpawn = now;
        }
      }

      // 2. Entity AI
      for (const entity of entities.values()) {
        const speed = entity.stats.moveSpeed * (TICK_TIME / 1000);
        
        const moveWithCollision = (dx: number, dz: number, s: number) => {
          const mag = Math.sqrt(dx*dx + dz*dz);
          if (mag < 0.01) return;
          const nx = (dx/mag) * s;
          const nz = (dz/mag) * s;
          const nextPos: [number, number, number] = [entity.pos[0] + nx, 0, entity.pos[2] + nz];
          
          if (!checkWorldCollision(nextPos, 0.5)) {
            entity.pos = nextPos;
          } else {
             // Basic sliding for AI
             const tryX: [number, number, number] = [entity.pos[0] + nx, 0, entity.pos[2]];
             const tryZ: [number, number, number] = [entity.pos[0], 0, entity.pos[2] + nz];
             if (!checkWorldCollision(tryX, 0.5)) entity.pos = tryX;
             else if (!checkWorldCollision(tryZ, 0.5)) entity.pos = tryZ;
          }
        };

        switch (entity.aiState) {
          case 'IDLE':
            if (Math.random() < 0.05) {
              entity.rot[1] += (Math.random() - 0.5) * 2;
            }
            break;
          case 'CHASE':
            // Logic for chasing target
            break;
          case 'RETURN':
            const rdx = entity.homePos[0] - entity.pos[0];
            const rdz = entity.homePos[2] - entity.pos[2];
            const rdSq = rdx*rdx + rdz*rdz;
            if (rdSq < 0.25) { 
              entity.aiState = entity.pathId ? 'PATROL' : 'IDLE';
              entity.isMoving = false;
            } else {
              entity.isMoving = true;
              moveWithCollision(rdx, rdz, speed * 1.5);
            }
            break;
          case 'PATROL':
            if (!entity.pathId) {
              entity.aiState = 'IDLE';
              break;
            }
            // Implementation of patrol logic...
            break;
        }
      }

      // 3. Broadcast
      if (entities.size > 0 && players.size > 0) {
        const allEntities = Array.from(entities.values());
        for (const player of players.values()) {
          const nearbyEntities = filterNearby(allEntities, player.pos, 80);
          io.to(player.id).emit("entities", nearbyEntities);
        }
      }

      setTimeout(tick, TICK_TIME);
    } catch (e: any) {
      serverLogger.error("game", "Main loop error", e.message);
      setTimeout(tick, TICK_TIME);
    }
  };

  tick();

  // Regen, Autosave, etc.
  setInterval(() => {
    for (const player of players.values()) {
      if (!player.stats || !player.equipment) continue;
      const stats = calculateTotalStats(player.stats, player.equipment);
      const hpRegen = calculateHPRegen(stats);
      const mpRegen = calculateMPRegen(stats);
      if (player.hp < player.maxHp || player.mp < player.maxMp) {
        player.hp = Math.min(player.maxHp, player.hp + hpRegen);
        player.mp = Math.min(player.maxMp, player.mp + mpRegen);
        io.emit("player_stats", { id: player.id, hp: player.hp, mp: player.mp });
      }
    }
  }, 3000);

  setInterval(async () => {
    if (players.size === 0) return;
    const batch = db.batch();
    for (const p of players.values()) {
      const charRef = db.collection("users").doc(p.userId).collection("characters").doc(p.characterId);
      batch.set(charRef, {
        pos: p.pos, rot: p.rot, hp: p.hp, mp: p.mp,
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    await batch.commit().catch((e: any) => serverLogger.error("system", "Autosave failed", e.message));
  }, 60000);
};
