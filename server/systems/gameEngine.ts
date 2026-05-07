import { Server } from "socket.io";
import admin from "firebase-admin";
import { players, entities, spawners, worldObjects } from "../state";
import { serverLogger } from "../logger";
import { performance } from "perf_hooks";
import { db } from "../db";
import { INITIAL_WORLD_OBJECTS } from "../../src/data/world";
import { calculateTotalStats, calculateHPRegen, calculateMPRegen, calculateMaxHP } from "../../src/lib/gameUtils";
import { ENTITY_TEMPLATES } from "../data/entityTemplates";
import { filterNearby, checkWorldCollision } from "./spatial";

export const GET_HITBOXES = (type: string, scale: number = 1): any[] => {
  switch (type) {
    case 'house': {
      const s = 2 * scale; 
      const t = 0.2 * scale; 
      return [
        { type: 'box', x: 0, z: -s, w: 4 * scale, d: t },   // Back Wall
        { type: 'box', x: -s, z: 0, w: t, d: 4 * scale },   // Left Wall
        { type: 'box', x: s, z: 0, w: t, d: 4 * scale },    // Right Wall
        { type: 'box', x: -1.4 * scale, z: s, w: 1.2 * scale, d: t }, // Front Wall Left (Tighter door)
        { type: 'box', x: 1.4 * scale, z: s, w: 1.2 * scale, d: t },  // Front Wall Right
      ];
    }
    case 'tent': {
      const s = 1.5 * scale;
      const t = 0.15 * scale;
      return [
        { type: 'box', x: 0, z: -s, w: 3 * scale, d: t },   // Back Wall
        { type: 'box', x: -1 * scale, z: 0, w: t, d: 3 * scale },   // Left Wall (Inward)
        { type: 'box', x: 1 * scale, z: 0, w: t, d: 3 * scale },    // Right Wall (Inward)
      ];
    }
    case 'tree': return [{ type: 'circle', x: 0, z: 0, r: 0.3 * scale }]; // ONLY the trunk is solid now!
    case 'rock': return [{ type: 'circle', x: 0, z: 0, r: 0.8 * scale }];
    case 'fence': return [{ type: 'box', x: 0, z: 0, w: 2 * scale, d: 0.15 * scale }];
    case 'bush': return [{ type: 'circle', x: 0, z: 0, r: 0.4 * scale }];
    case 'barrel': return [{ type: 'circle', x: 0, z: 0, r: 0.35 * scale }];
    case 'well': return [{ type: 'circle', x: 0, z: 0, r: 1.1 * scale }];
    case 'campfire': return [{ type: 'circle', x: 0, z: 0, r: 0.6 * scale }];
    case 'dummy': return [{ type: 'circle', x: 0, z: 0, r: 0.3 * scale }];
    default: return [];
  }
};

export const initializeWorld = async () => {
  let spawnerIdCounter = 0;
  worldObjects.clear();
  spawners.clear();

  serverLogger.info("game", "Loading world from Firestore...");
  
  const worldSnap = await db.collection("world").get();
  let objects = worldSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));

  // SEEDING: If database is empty, use the static file data
  if (objects.length === 0) {
    serverLogger.info("game", "World database empty. Seeding from INITIAL_WORLD_OBJECTS...");
    const batch = db.batch();
    for (const obj of INITIAL_WORLD_OBJECTS) {
      const ref = db.collection("world").doc(obj.id);
      batch.set(ref, obj);
      objects.push(obj);
    }
    await batch.commit();
    serverLogger.info("game", `Seeded ${objects.length} objects.`);
  }

  for (const obj of objects) {
    // 1. Setup Spawners
    if (obj.type.startsWith("spawner_")) {
      const typeStr = obj.type.split("_")[1];
      let name = "Unknown";
      let entityClass = "Slime";
      let level = 1;
      let maxEntities = 3;
      let type = "enemy";
      let radius = 5;

      if (typeStr === "slime") { name = "Marsh Slime"; entityClass = "Slime"; level = 1; maxEntities = 3; radius = 8; }
      else if (typeStr === "wolf") { name = "Forest Wolf"; entityClass = "Wolf"; level = 3; maxEntities = 3; radius = 10; }
      else if (typeStr === "guard") { name = "Guard Captain"; entityClass = "Guard"; level = 25; maxEntities = 1; radius = 2; type = "npc"; }

      const sId = obj.id || `spawn-${spawnerIdCounter++}`;
      spawners.set(sId, {
        id: sId,
        name,
        type,
        entityClass,
        level,
        pos: obj.pos,
        spawnRadius: radius,
        maxEntities: maxEntities,
        respawnTime: 15,
        pathId: obj.pathId || null
      });
    }

    // 2. Setup Hitboxes and Add to World Map
    const hitboxes = GET_HITBOXES(obj.type, obj.scale);
    worldObjects.set(obj.id, {
      ...obj,
      hitboxes: hitboxes || []
    } as any);
  }
  serverLogger.info("game", `World initialized: ${spawners.size} spawners, ${worldObjects.size} total objects.`);
};

export const initializeSpawners = initializeWorld; // Alias for backward compatibility

export const startHeartbeat = (io: Server) => {
  let lastTime = performance.now();
  let lastStatLog = 0;
  
  const TICK_RATE = 20; // 20Hz
  const TICK_TIME = 1000 / TICK_RATE;

  // Main Engine Loop
  const tick = () => {
    try {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const shouldLog = now - lastStatLog > 10000;
      if (shouldLog) {
        serverLogger.info("game", `Engine Stats: Spawners=${spawners.size}, Entities=${entities.size}, Players=${players.size}, DT=${dt.toFixed(4)}s`);
        lastStatLog = now;
      }

      // 1. Spawning
      for (const spawner of spawners.values()) {
        const activeCount = Array.from(entities.values()).filter(e => e.spawnerId === spawner.id).length;
        if (activeCount < (Number(spawner.maxEntities) || 0)) {
          // ... (Spawning logic remains same)
          const templateId = spawner.entityClass?.toLowerCase();
          const template = ENTITY_TEMPLATES[templateId] || ENTITY_TEMPLATES['slime'];
          const entityId = `ent-${spawner.id}-${Math.random().toString(36).substring(2, 7)}`;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * (Number(spawner.spawnRadius) || 1);
          const spawnPos: [number, number, number] = [
            (Number(spawner.pos?.[0]) || 0) + Math.cos(angle) * radius, 
            Number(spawner.pos?.[1]) || 0, 
            (Number(spawner.pos?.[2]) || 0) + Math.sin(angle) * radius
          ];
          const stats = template.baseStats;
          const maxHp = calculateMaxHP(stats);
          const newEntity = {
            id: entityId,
            name: template.name,
            type: template.type,
            class: template.class,
            level: Number(spawner.level) || 1,
            pos: [...spawnPos],
            homePos: [...spawnPos],
            rot: [0, Math.random() * Math.PI * 2, 0],
            spawnerId: spawner.id,
            lastUpdate: Date.now(),
            hp: maxHp,
            maxHp: maxHp,
            stats: stats,
            isMoving: false,
            aiState: spawner.pathId ? 'PATROL' : 'IDLE',
            targetId: null,
            pathId: spawner.pathId || null,
            currentWaypointIndex: 0
          };
          entities.set(entityId, newEntity);
          io.emit("entity_spawn", newEntity);
        }
      }

      // 2. Advanced AI State Machine
      for (const entity of entities.values()) {
        if (entity.isDead) continue;

        // BUG FIX: Cap DT to prevent "teleporting" during lag spikes
        const cappedDt = Math.min(dt, 0.5);
        
        const template = ENTITY_TEMPLATES[entity.class?.toLowerCase()] || ENTITY_TEMPLATES['slime'];
        const speed = (template.moveSpeed || 0.05) * (cappedDt / 0.1); 
        
        // --- TARGETING / AGGRO ---
        let nearestPlayer: any = null;
        let minDistSq = Infinity;
        
        // Only enemies (not NPCs) look for players to attack
        if (entity.type === 'enemy' && entity.aiState !== 'RETURN') {
          for (const player of players.values()) {
            const dx = player.pos[0] - entity.pos[0];
            const dz = player.pos[2] - entity.pos[2];
            const dSq = dx*dx + dz*dz;
            const aggroRadiusSq = template.aggroRadius * template.aggroRadius;
            if (dSq < aggroRadiusSq && dSq < minDistSq) {
              minDistSq = dSq;
              nearestPlayer = player;
            }
          }
        }

        if (nearestPlayer) {
          entity.targetId = nearestPlayer.id;
          if (minDistSq <= template.attackRadius * template.attackRadius) {
            entity.aiState = 'ATTACK';
          } else {
            entity.aiState = 'CHASE';
          }
        } else if (entity.aiState === 'CHASE' || entity.aiState === 'ATTACK') {
          entity.aiState = 'RETURN';
          entity.targetId = null;
        }

        // Helper for AI movement with world collision
        const moveWithCollision = (dx: number, dz: number, moveSpeed: number) => {
          const dist = Math.sqrt(dx*dx + dz*dz);
          if (dist < 0.01) return;
          
          const stepX = (dx / dist) * moveSpeed;
          const stepZ = (dz / dist) * moveSpeed;
          const nextPos: [number, number, number] = [entity.pos[0] + stepX, entity.pos[1], entity.pos[2] + stepZ];
          
          // Check collision at next position
          if (!checkWorldCollision(nextPos, 0.4)) { // Enemies have slightly larger collision radius
            entity.pos[0] = nextPos[0];
            entity.pos[2] = nextPos[2];
          } else {
            // Sliding logic for AI (Try X then Z)
            const tryX: [number, number, number] = [nextPos[0], entity.pos[1], entity.pos[2]];
            const tryZ: [number, number, number] = [entity.pos[0], entity.pos[1], nextPos[2]];
            
            if (!checkWorldCollision(tryX, 0.4)) {
              entity.pos[0] = nextPos[0];
            } else if (!checkWorldCollision(tryZ, 0.4)) {
              entity.pos[2] = nextPos[2];
            }
          }
          entity.rot[1] = Math.atan2(dx, dz);
        };

        // --- STATE LOGIC ---
        switch (entity.aiState) {
          case 'IDLE':
            if (Math.random() < 0.01) {
              entity.aiState = 'WANDER';
              const angle = Math.random() * Math.PI * 2;
              const dist = 2 + Math.random() * 3;
              entity.moveTarget = [entity.homePos[0] + Math.cos(angle) * dist, entity.homePos[1], entity.homePos[2] + Math.sin(angle) * dist];
              entity.isMoving = true;
            }
            break;

          case 'WANDER':
            if (entity.moveTarget) {
              const dx = entity.moveTarget[0] - entity.pos[0];
              const dz = entity.moveTarget[2] - entity.pos[2];
              const dSq = dx*dx + dz*dz;
              if (dSq < 0.04) { // 0.2 units
                entity.isMoving = false;
                entity.aiState = 'IDLE';
                entity.moveTarget = null;
              } else {
                moveWithCollision(dx, dz, speed);
              }
            }
            break;

          case 'CHASE':
            const target = players.get(entity.targetId);
            if (target) {
              const dx = target.pos[0] - entity.pos[0];
              const dz = target.pos[2] - entity.pos[2];
              const dSq = dx*dx + dz*dz;
              const hdx = entity.pos[0] - entity.homePos[0];
              const hdz = entity.pos[2] - entity.homePos[2];
              
              if (hdx*hdx + hdz*hdz > template.leashRadius * template.leashRadius) {
                entity.aiState = 'RETURN';
                entity.targetId = null;
                break;
              }
              
              if (dSq < template.attackRadius * template.attackRadius * 0.64) { // 0.8 range
                entity.aiState = 'ATTACK';
              } else {
                entity.isMoving = true;
                moveWithCollision(dx, dz, speed);
              }
            }
            break;

          case 'ATTACK':
            const aTarget = players.get(entity.targetId);
            if (aTarget) {
              const dx = aTarget.pos[0] - entity.pos[0];
              const dz = aTarget.pos[2] - entity.pos[2];
              const dSq = dx*dx + dz*dz;
              entity.rot[1] = Math.atan2(dx, dz);
              entity.isMoving = false;
              if (dSq > template.attackRadius * template.attackRadius * 1.44) { // 1.2 range
                entity.aiState = 'CHASE';
              } else {
                const attackCooldown = 2000;
                const currentTime = Date.now();
                if (currentTime - (entity.lastAttackTime || 0) > attackCooldown) {
                  entity.lastAttackTime = currentTime;
                  const damage = Math.max(1, Math.floor(template.baseStats.strength * 0.5));
                  aTarget.hp = Math.max(0, aTarget.hp - damage);
                  io.emit("player_stats", { id: aTarget.id, hp: aTarget.hp, mp: aTarget.mp });
                  io.to(aTarget.id).emit("chat_message", {
                    id: "dmg-" + currentTime,
                    sender: "Combat",
                    text: `${entity.name} hits you for ${damage} damage!`,
                    timestamp: currentTime,
                    color: "#ff4444"
                  });
                }
              }
            }
            break;

          case 'RETURN':
            const rdx = entity.homePos[0] - entity.pos[0];
            const rdz = entity.homePos[2] - entity.pos[2];
            const rdSq = rdx*rdx + rdz*rdz;
            if (rdSq < 0.25) { // 0.5 units
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
            
            // Find waypoints for this path
            const waypoints = Array.from(worldObjects.values())
              .filter(obj => obj.type === 'waypoint' && obj.pathId === entity.pathId)
              .sort((a, b) => (Number(a.waypointId) || 0) - (Number(b.waypointId) || 0));

            if (waypoints.length === 0) {
              entity.aiState = 'IDLE';
              break;
            }

            const currentIdx = entity.currentWaypointIndex || 0;
            const targetWP = waypoints[currentIdx % waypoints.length];
            
            const pdx = targetWP.pos[0] - entity.pos[0];
            const pdz = targetWP.pos[2] - entity.pos[2];
            const pdSq = pdx*pdx + pdz*pdz;

            if (pdSq < 1) { // Reached waypoint
              // Wait a bit or move to next
              entity.currentWaypointIndex = (currentIdx + 1) % waypoints.length;
            } else {
              entity.isMoving = true;
              moveWithCollision(pdx, pdz, speed);
            }
            break;
        }
      }

      // 3. Broadcast (Spatial AOI)
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

  // Regeneration Loop
  setInterval(() => {
    try {
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
    } catch (e: any) {
      serverLogger.error("game", "Regen loop error", e.message);
    }
  }, 3000);

  // Persistence Loop (Autosave every 60 seconds)
  setInterval(async () => {
    if (players.size === 0) return;
    
    serverLogger.info("system", `Autosaving ${players.size} players...`);
    const batch = db.batch();
    
    for (const p of players.values()) {
      const charRef = db.collection("users").doc(p.userId).collection("characters").doc(p.characterId);
      batch.set(charRef, {
        pos: p.pos,
        rot: p.rot,
        hp: p.hp,
        mp: p.mp,
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    try {
      await batch.commit();
      serverLogger.info("system", "Autosave successful.");
    } catch (e: any) {
      serverLogger.error("system", "Autosave failed", e.message);
    }
  }, 60000);
};
