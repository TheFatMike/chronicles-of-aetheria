/**
 * @file server/systems/persistence/terrain.ts
 * @description Manages persistence of terrain modifications to Firestore.
 */
import { db } from "../../db";
import { terrainData, dirtyTerrainChunks, chunkToTerrain } from "../../state";
import { serverLogger } from "../../logger";

export const autosaveTerrain = async (): Promise<void> => {
  if (dirtyTerrainChunks.size === 0) return;
  
  const chunksToSave = Array.from(dirtyTerrainChunks);
  dirtyTerrainChunks.clear();
  
  const batch = db.batch();
  let count = 0;

  for (const chunkKey of chunksToSave) {
    const [tx, tz] = chunkKey.split(',').map(Number);
    const terrainId = `chunk_${tx}_${tz}`;
    
    // Collect all terrain points in this chunk
    const chunkData: Record<string, any> = {};
    const terrainKeys = chunkToTerrain.get(chunkKey);
    
    if (terrainKeys) {
      for (const tKey of terrainKeys) {
        const data = terrainData.get(tKey);
        if (data) chunkData[tKey] = data;
      }
    } else {
       // Fallback: search terrainData if mapping is missing
       // This is expensive so we ideally avoid it
       for (const [key, val] of terrainData.entries()) {
          const [x, z] = key.split('_').map(Number);
          if (Math.floor(x / 100) === tx && Math.floor(z / 100) === tz) {
             chunkData[key] = val;
          }
       }
    }

    if (Object.keys(chunkData).length > 0) {
      const charRef = db.collection("terrain_chunks").doc(terrainId);
      batch.set(charRef, { data: chunkData }, { merge: true });
      count++;
    }

    if (count >= 450) {
      await batch.commit();
      serverLogger.info("system", `Autosaved ${count} terrain chunks to Firestore.`);
      // Continue with a new batch if needed
      return autosaveTerrain(); 
    }
  }
  
  if (count > 0) {
    await batch.commit();
    serverLogger.info("system", `Autosaved ${count} terrain chunks to Firestore.`);
  }
};
