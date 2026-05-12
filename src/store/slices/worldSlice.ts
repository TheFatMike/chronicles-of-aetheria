/**
 * @file src/store/slices/worldSlice.ts
 * @description State management for static and global world elements.
 * Tracks world object placements, entity spawners, and terrain height data.
 * @importance Essential: The primary data source for the environment and static entities in the game world.
 */
import { StateCreator } from 'zustand';
import { GameState, WorldSlice } from '../types';
import { Spawner, WorldObject } from '../../types';
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
    const terrainObj: Record<string, { y: number; type: string }> = {};
    const dirty: { x: number; z: number; y: number; type: string }[] = [];
    
    dataArray.forEach(p => {
      const data = { y: p.y, type: p.type };
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
    const dirty: { x: number; z: number; y: number; type: string }[] = [];
    let hasChanges = false;

    dataArray.forEach(p => {
      const key = `${p.x}_${p.z}`;
      const current = newTerrain[key] || { y: 0, type: 'grass' };
      
      const update: { y: number; type: string } = { ...current };
      let itemChanged = false;

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
      
      if (itemChanged) {
        newTerrain[key] = update;
        dirty.push({ x: p.x, z: p.z, ...update });
        hasChanges = true;
      }
    });

    if (!hasChanges) return state;
    
    // Only buffer changes if the editor is open (to avoid buffering initial load or syncs)
    if (state.isEditorOpen) {
      const bufferedChanges: Record<string, { y: number; type: string }> = { ...state.terrainEditorBuffer };
      dirty.forEach(p => {
        bufferedChanges[`${p.x}_${p.z}`] = { y: p.y, type: p.type };
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

    return {
      worldObjects: {
        ...state.worldObjects,
        [id]: updatedObject
      },
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
