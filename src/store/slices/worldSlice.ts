/**
 * @file src/store/slices/worldSlice.ts
 * @description State management for static and global world elements.
 * Tracks world object placements, entity spawners, and terrain height data.
 * @importance Essential: The primary data source for the environment and static entities in the game world.
 */
import { StateCreator } from 'zustand';
import { GameState, WorldSlice } from '../types';
import { Spawner, WorldObject } from '@shared/types';
export const createWorldSlice: StateCreator<GameState, [], [], WorldSlice> = (set) => ({
  spawners: {},
  worldObjects: {},
  worldEditorBuffer: {},
  worldEditorDeleted: [],
  terrainData: {},
  terrainDirtyPoints: [],

  setSpawners: (spawnersArray) => {
    const spawnersObj: Record<string, Spawner> = {};
    spawnersArray.forEach(s => {
      spawnersObj[s.id] = s;
    });
    set({ spawners: spawnersObj });
  },

  setWorldObjects: (objectsArray) => {
    const objectsObj: Record<string, WorldObject> = {};
    objectsArray.forEach(o => {
      objectsObj[o.id] = o;
    });
    set({ worldObjects: objectsObj });
  },

  addWorldObjects: (objectsArray) => set((state) => {
    const newObjects = { ...state.worldObjects };
    objectsArray.forEach(o => {
      newObjects[o.id] = o;
    });
    return { worldObjects: newObjects };
  }),

  setTerrainData: (dataArray) => set((state) => {
    const terrainObj: Record<string, { y: number; type: string; waterLevel?: number }> = { ...state.terrainData };
    const dirty: { x: number; z: number; y: number; type: string; waterLevel?: number }[] = [];
    
    dataArray.forEach(p => {
      const data = { y: p.y, type: p.type, waterLevel: p.waterLevel };
      terrainObj[`${p.x}_${p.z}`] = data;
      dirty.push({ x: p.x, z: p.z, ...data });
    });

    return { 
      terrainData: terrainObj,
      terrainDirtyPoints: dirty 
    };
  }),

  updateTerrainData: (dataArray) => set((state) => {
    if (!dataArray || dataArray.length === 0) return state;
    
    const newTerrain = { ...state.terrainData };
    const dirty: { x: number; z: number; y: number; type: string; waterLevel?: number }[] = [];
    let hasChanges = false;

    dataArray.forEach(p => {
      const key = `${p.x}_${p.z}`;
      const exists = !!newTerrain[key];
      const current = newTerrain[key] || { y: 0, type: 'grass', waterLevel: -1000 };
      
      const update: { y: number; type: string; waterLevel?: number } = { ...current };
      let itemChanged = !exists;

      if (p.y !== undefined && !isNaN(p.y) && update.y !== p.y) {
        update.y = p.y;
        itemChanged = true;
      }
      if (p.deltaY !== undefined && !isNaN(p.deltaY) && p.deltaY !== 0) {
        update.y += p.deltaY;
        itemChanged = true;
      }
      if (p.type !== undefined && update.type !== p.type) {
        update.type = p.type;
        itemChanged = true;
      }
      if (p.waterLevel !== undefined && update.waterLevel !== p.waterLevel) {
        update.waterLevel = p.waterLevel;
        itemChanged = true;
      }
      
      if (itemChanged) {
        newTerrain[key] = update;
        dirty.push({ x: p.x, z: p.z, ...update });
        hasChanges = true;
      }
    });

    if (!hasChanges) return state;
    
    if (state.isEditorOpen) {
      const bufferedChanges: Record<string, { y: number; type: string; waterLevel?: number }> = { ...state.terrainEditorBuffer };
      dirty.forEach(p => {
        bufferedChanges[`${p.x}_${p.z}`] = { y: p.y, type: p.type, waterLevel: p.waterLevel };
      });

      return { 
        terrainData: newTerrain,
        terrainDirtyPoints: dirty,
        terrainEditorBuffer: bufferedChanges
      };
    }

    return { 
      terrainData: newTerrain,
      terrainDirtyPoints: dirty
    };
  }),

  floodFillWater: (startX, startZ, level) => set((state) => {
    const queue: [number, number][] = [[startX, startZ]];
    const visited = new Set<string>();
    const key = (x: number, z: number) => `${x}_${z}`;
    
    const updates: { x: number; z: number; waterLevel: number }[] = [];
    const resolution = 2;

    while (queue.length > 0) {
      const [currX, currZ] = queue.shift()!;
      const k = key(currX, currZ);
      if (visited.has(k)) continue;
      visited.add(k);

      const point = state.terrainData[k] || { y: 0 };
      if (point.y < level + 0.5) {
        updates.push({ x: currX, z: currZ, waterLevel: level });
        
        // Neighbors
        [[2, 0], [-2, 0], [0, 2], [0, -2]].forEach(([dx, dz]) => {
          const nx = currX + dx;
          const nz = currZ + dz;
          const nk = key(nx, nz);
          if (!visited.has(nk)) {
            queue.push([nx, nz]);
          }
        });
      }

      if (updates.length > 5000) break; // Safety limit
    }

    if (updates.length > 0) {
      // Reuse updateTerrainData logic via a separate set call or just calculate here
      const newTerrain = { ...state.terrainData };
      const dirty: any[] = [];
      const bufferedChanges = { ...state.terrainEditorBuffer };

      updates.forEach(u => {
        const k = key(u.x, u.z);
        const current = newTerrain[k] || { y: 0, type: 'grass', waterLevel: -1000 };
        const updated = { ...current, waterLevel: u.waterLevel, type: 'water' };
        newTerrain[k] = updated;
        dirty.push({ x: u.x, z: u.z, ...updated });
        if (state.isEditorOpen) {
          bufferedChanges[k] = updated;
        }
      });

      return {
        terrainData: newTerrain,
        terrainDirtyPoints: dirty,
        terrainEditorBuffer: bufferedChanges
      };
    }

    return state;
  }),

  addWorldObject: (obj) => set((state) => {
    console.log("[worldSlice] addWorldObject", obj);
    return {
      worldObjects: { ...state.worldObjects, [obj.id]: obj },
      worldEditorBuffer: state.isEditorOpen 
        ? { ...state.worldEditorBuffer, [obj.id]: obj }
        : state.worldEditorBuffer
    };
  }),

  updateWorldObject: (id, data) => set((state) => {
    if (!state.worldObjects[id]) return state;
    
    // Update main state for real-time feedback
    const updatedObject = { ...state.worldObjects[id], ...data };
    
    // Update buffer for batch save (only if editor is open)
    const updatedBuffer = state.isEditorOpen 
      ? { ...(state.worldEditorBuffer[id] || {}), ...data }
      : null;

    // Synchronize with entities slice if it exists (for real-time NPC feedback in editor)
    const updatedEntities = state.entities[id] ? {
      ...state.entities,
      [id]: { 
        ...state.entities[id], 
        pos: updatedObject.pos, 
        rot: updatedObject.rot, 
        scale: updatedObject.scale 
      }
    } : state.entities;

    return {
      worldObjects: {
        ...state.worldObjects,
        [id]: updatedObject
      },
      entities: updatedEntities,
      ...(updatedBuffer ? {
        worldEditorBuffer: {
          ...state.worldEditorBuffer,
          [id]: updatedBuffer
        }
      } : {})
    };
  }),

  removeWorldObject: (id) => set((state) => {
    const newObjects = { ...state.worldObjects };
    delete newObjects[id];
    return { worldObjects: newObjects };
  }),

  addToEditorBuffer: (id, data) => set((state) => ({
    worldEditorBuffer: {
      ...state.worldEditorBuffer,
      [id]: { ...(state.worldEditorBuffer[id] || {}), ...data }
    }
  })),

  markObjectDeleted: (id) => set((state) => {
    const obj = state.worldObjects[id];
    const newObjects = { ...state.worldObjects };
    delete newObjects[id];
    
    return { 
      worldObjects: newObjects,
      worldEditorDeleted: [...state.worldEditorDeleted, { id, pos: obj?.pos }],
      // If it was in the buffer to be saved, remove it since it's now deleted
      worldEditorBuffer: (() => {
        const newBuffer = { ...state.worldEditorBuffer };
        delete newBuffer[id];
        return newBuffer;
      })()
    };
  }),

  terrainEditorBuffer: {},
  clearEditorBuffer: () => set({ 
    worldEditorBuffer: {}, 
    worldEditorDeleted: [],
    terrainEditorBuffer: {}
  }),
});
