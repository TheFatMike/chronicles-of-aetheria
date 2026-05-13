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
    const terrainId = `chunk_${chunkKey.replace(',', '_')}`;
    
    // Collect all terrain points in this chunk using the efficient mapping
    const chunkData: Record<string, any> = {};
    const terrainKeys = chunkToTerrain.get(chunkKey);
    
    if (terrainKeys && terrainKeys.size > 0) {
      for (const tKey of terrainKeys) {
        const data = terrainData.get(tKey);
        if (data) chunkData[tKey] = data;
      }
    }

    // Only add to batch if there is actually data to save
    if (Object.keys(chunkData).length > 0) {
      const docRef = db.collection("terrain_chunks").doc(terrainId);
      batch.set(docRef, { data: chunkData }, { merge: true });
      count++;
    }

    if (count >= 450) {
      await batch.commit();
      serverLogger.info("system", `Autosaved ${count} terrain chunks to Firestore.`);
      // Continue with remaining chunks if any
      return autosaveTerrain(); 
    }
  }
  
  if (count > 0) {
    await batch.commit();
    serverLogger.info("system", `Autosaved ${count} terrain chunks to Firestore.`);
  }
};
