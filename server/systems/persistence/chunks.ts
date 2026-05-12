/**
 * @file server/systems/persistence/chunks.ts
 * @description Manages chunk-based lazy loading and LRU unloading of terrain and world objects.
 */
import { db } from "../../db";
import { 
  worldObjects, entities, terrainData, loadedChunksLocal, 
  chunkLastAccess, chunkToObjects, chunkToTerrain, players 
} from "../../state";
import { serverLogger } from "../../logger";
import { redis } from "../../redis";
import { updateInGrid, objectGrid, entityGrid } from "../spatial";
import { createNPCEntity } from "../../lib/entities";

/**
 * Loads terrain tiles and objects for a specific region. 
 */
export const loadTerrainRegion = async (centerX: number, centerZ: number) => {
  const currentChunkX = Math.floor(centerX / 100);
  const currentChunkZ = Math.floor(centerZ / 100);

  const loadPromises: Promise<void>[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const tx = currentChunkX + dx;
      const tz = currentChunkZ + dz;
      const terrainId = `chunk_${tx}_${tz}`;
      const objectId = `chunk_${tx}_${tz}`;
      const localKey = `${tx},${tz}`;

      loadPromises.push((async () => {
        chunkLastAccess.set(localKey, Date.now());
        if (loadedChunksLocal.has(localKey)) return;

        try {
          if (redis.status === 'ready') {
            const exists = await redis.sismember("world:existing_chunks", terrainId);
            if (!exists) {
              loadedChunksLocal.add(localKey);
              return;
            }
          }

          const terrainDoc = await db.collection("terrain_chunks").doc(terrainId).get();
          if (terrainDoc.exists) {
            const chunkData = terrainDoc.data()?.data || {};
            if (!chunkToTerrain.has(localKey)) chunkToTerrain.set(localKey, new Set());
            const terrainSet = chunkToTerrain.get(localKey)!;

            Object.entries(chunkData).forEach(([key, val]: [string, any]) => {
              terrainData.set(key, { y: val.y, type: val.type || 'grass' });
              terrainSet.add(key);
            });
          }

          const objectDoc = await db.collection("object_chunks").doc(objectId).get();
          if (objectDoc.exists) {
            const chunkData = objectDoc.data()?.objects || {};
            const { OBJECT_TEMPLATES } = await import("../../../src/data/world/templates");
            
            for (const [id, rawData] of Object.entries(chunkData as any)) {
              const data = rawData as any;
              const template = OBJECT_TEMPLATES[data.type];
              
              const cleanData = { ...data };
              if (data.type === 'tent' && data.scale === 1) delete cleanData.scale;
              if (data.type === 'campfire' && data.scale === 1) delete cleanData.scale;

              const mergedObj = { id, ...template, ...cleanData };
              
              worldObjects.set(id, mergedObj);
              updateInGrid(objectGrid, id, null, mergedObj.pos);
              
              if (!chunkToObjects.has(localKey)) chunkToObjects.set(localKey, new Set());
              chunkToObjects.get(localKey)!.add(id);

              if (mergedObj.type.startsWith("npc_")) {
                const entityId = `npc-${id}`;
                if (!entities.has(entityId)) {
                  const npcEntity = createNPCEntity(entityId, id, mergedObj.type, mergedObj.pos, mergedObj.rot, mergedObj);
                  entities.set(entityId, npcEntity as any);
                  updateInGrid(entityGrid, entityId, null, mergedObj.pos);
                }
              } else if (mergedObj.type.startsWith("spawner_")) {
                const { registerSpawnerFromObject } = await import("../spawners");
                await registerSpawnerFromObject(mergedObj);
              }
            }

            const { io } = await import("../../../server") as any;
            const newObjs = Array.from(Object.keys(chunkData)).map(id => worldObjects.get(id)).filter(Boolean);
            const newEnts = Array.from(Object.keys(chunkData)).map(id => entities.get(`npc-${id}`)).filter(Boolean);

            if (newObjs.length > 0) io.emit("world_objects_sync", newObjs);
            if (newEnts.length > 0) io.emit("entities_sync", newEnts);
          }
          
          loadedChunksLocal.add(localKey);
          serverLogger.info("system", `Loaded region ${localKey}: Terrain + Objects`);
        } catch (e: any) {
          serverLogger.error("system", `Failed to load region ${localKey}`, e.message);
        }
      })());
    }
  }

  await Promise.all(loadPromises);
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
