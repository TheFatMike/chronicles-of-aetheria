/**
 * @file server/systems/persistence/chunks.ts
 * @description Manages chunk-based lazy loading and LRU unloading of terrain and world objects.
 */
import { db } from "../../db";
import { 
  worldObjects, entities, spawners, spawnerEntityCounts, terrainData, loadedChunksLocal, 
  chunkLastAccess, chunkToObjects, chunkToTerrain, players 
} from "../../state";
import { serverLogger } from "../../logger";
import { redis } from "../../redis";
import { updateInGrid, objectGrid, entityGrid } from "../spatial";
import { createNPCEntity } from "../../lib/entities";

/**
 * Loads terrain tiles and objects for a specific region. 
 * Uses db.getAll() to batch Firestore reads for better performance and lower R/W costs.
 */
export const loadTerrainRegion = async (centerX: number, centerZ: number) => {
  const currentChunkX = Math.floor(centerX / 100);
  const currentChunkZ = Math.floor(centerZ / 100);

  const chunksToFetch: { tx: number, tz: number, localKey: string, terrainId: string, objectId: string }[] = [];

  // 1. Identify which chunks need loading
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const tx = currentChunkX + dx;
      const tz = currentChunkZ + dz;
      const localKey = `${tx},${tz}`;
      const terrainId = `chunk_${tx}_${tz}`;
      const objectId = `chunk_${tx}_${tz}`;

      chunkLastAccess.set(localKey, Date.now());
      if (loadedChunksLocal.has(localKey)) continue;

      // Check Interest Registry (Redis) to see if this chunk even exists in DB
      if (redis.status === 'ready') {
        const exists = await redis.sismember("world:existing_chunks", terrainId);
        if (!exists) {
          loadedChunksLocal.add(localKey); // Mark as loaded so we don't check again
          continue;
        }
      }

      chunksToFetch.push({ tx, tz, localKey, terrainId, objectId });
    }
  }

  if (chunksToFetch.length === 0) return;

  try {
    // 2. Prepare Firestore batch read refs
    const terrainRefs = chunksToFetch.map(c => db.collection("terrain_chunks").doc(c.terrainId));
    const objectRefs = chunksToFetch.map(c => db.collection("object_chunks").doc(c.objectId));

    // 3. Perform batch fetch
    const [terrainDocs, objectDocs] = await Promise.all([
      db.getAll(...terrainRefs),
      db.getAll(...objectRefs)
    ]);

    const { io } = await import("../../../server") as any;
    const { broadcastToNearbyPlayers } = await import("../../systems/spatial");
    const { OBJECT_TEMPLATES } = await import("../../../shared/data/world/templates");

    // 4. Process Results
    for (let i = 0; i < chunksToFetch.length; i++) {
      const info = chunksToFetch[i];
      const terrainDoc = terrainDocs[i];
      const objectDoc = objectDocs[i];

      // Process Terrain
      if (terrainDoc.exists) {
        const chunkData = terrainDoc.data()?.data || {};
        if (!chunkToTerrain.has(info.localKey)) chunkToTerrain.set(info.localKey, new Set());
        const terrainSet = chunkToTerrain.get(info.localKey)!;

        const syncPoints: any[] = [];
        Object.entries(chunkData).forEach(([key, val]: [string, any]) => {
          terrainData.set(key, { y: val.y, type: val.type || 'grass' });
          terrainSet.add(key);
          const [px, pz] = key.split('_').map(Number);
          syncPoints.push({ x: px, z: pz, y: val.y, type: val.type || 'grass' });
        });

        if (syncPoints.length > 0 && io) {
          const centerX = info.tx * 100 + 50;
          const centerZ = info.tz * 100 + 50;
          broadcastToNearbyPlayers(io, [centerX, 0, centerZ], 200, "terrain_sync", syncPoints);
        }
      }

      // Process Objects
      if (objectDoc.exists) {
        const chunkData = objectDoc.data()?.objects || {};
        const newObjs: any[] = [];
        
        for (const [id, rawData] of Object.entries(chunkData as any)) {
          const data = rawData as any;
          const template = OBJECT_TEMPLATES[data.type];
          
          // Template merging
          const mergedObj = { id, ...template, ...data };
          
          worldObjects.set(id, mergedObj);
          updateInGrid(objectGrid, id, null, mergedObj.pos);
          
          if (!chunkToObjects.has(info.localKey)) chunkToObjects.set(info.localKey, new Set());
          chunkToObjects.get(info.localKey)!.add(id);
          newObjs.push(mergedObj);

          if (mergedObj.type.startsWith("spawner_")) {
            const { registerSpawnerFromObject } = await import("../spawners");
            await registerSpawnerFromObject(mergedObj);
          }
        }

        if (newObjs.length > 0 && io) {
          const centerX = info.tx * 100 + 50;
          const centerZ = info.tz * 100 + 50;
          broadcastToNearbyPlayers(io, [centerX, 0, centerZ], 200, "world_objects_sync", newObjs);
        }
      }

      loadedChunksLocal.add(info.localKey);
      serverLogger.info("system", `Loaded region ${info.localKey}: Terrain + Objects`);
    }
  } catch (e: any) {
    serverLogger.error("system", `Failed to load region batch`, e.message);
  }
};

/**
 * Unloads chunks that have not been accessed recently and have no players nearby.
 */
export const unloadInactiveChunks = async (maxAgeMs: number = 1000 * 60 * 10) => {
  const now = Date.now();
  const activeChunks = new Set<string>();
  
  for (const p of players.values()) {
    const tx = Math.floor(p.pos[0] / 100);
    const tz = Math.floor(p.pos[2] / 100);
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        activeChunks.add(`${tx+dx},${tz+dz}`);
      }
    }
  }
  
  let unloadCount = 0;
  const chunksToUnload = [];
  
  for (const chunkKey of loadedChunksLocal) {
    if (activeChunks.has(chunkKey)) continue;
    
    // SAFETY: Never unload a chunk that has unsaved terrain modifications
    const { dirtyTerrainChunks } = await import("../../state");
    if (dirtyTerrainChunks.has(chunkKey)) {
      // Chunk is modified but not yet saved. Skip unloading for now.
      continue;
    }
    
    const lastAccess = chunkLastAccess.get(chunkKey) || 0;
    if (now - lastAccess > maxAgeMs) {
      chunksToUnload.push(chunkKey);
    }
  }
  
  for (const chunkKey of chunksToUnload) {
    const terrainKeys = chunkToTerrain.get(chunkKey);
    if (terrainKeys) {
      for (const tKey of terrainKeys) {
        terrainData.delete(tKey);
      }
      chunkToTerrain.delete(chunkKey);
    }
    
    const objects = chunkToObjects.get(chunkKey);
    if (objects) {
      for (const objId of objects) {
        const obj = worldObjects.get(objId);
        if (obj) {
          const gridKey = Math.floor(obj.pos[0] / 50) + "," + Math.floor(obj.pos[2] / 50);
          objectGrid.get(gridKey)?.delete(objId);
          
          // Cleanup Spawner
          if (obj.type?.startsWith("spawner_")) {
            spawners.delete(objId);
            spawnerEntityCounts.delete(objId);
            
            // Cleanup entities belonging to this spawner
            for (const [eid, ent] of entities.entries()) {
              if (ent.spawnerId === objId) {
                if (ent.pos) {
                  const eKey = Math.floor(ent.pos[0] / 50) + "," + Math.floor(ent.pos[2] / 50);
                  entityGrid.get(eKey)?.delete(eid);
                }
                entities.delete(eid);
              }
            }
          }

          worldObjects.delete(objId);
          
          const entityId = `npc-${objId}`;
          const ent = entities.get(entityId);
          if (ent) {
            if (ent.pos) {
              const eKey = Math.floor(ent.pos[0] / 50) + "," + Math.floor(ent.pos[2] / 50);
              entityGrid.get(eKey)?.delete(entityId);
            }
            entities.delete(entityId);
          }
        }
      }
      chunkToObjects.delete(chunkKey);
    }
    
    loadedChunksLocal.delete(chunkKey);
    chunkLastAccess.delete(chunkKey);
    unloadCount++;
  }
  
  if (unloadCount > 0) {
    serverLogger.info("system", `LRU CACHE: Unloaded ${unloadCount} inactive chunks from memory.`);
  }
};
