import { StateCreator } from 'zustand';
import { GameState, WorldSlice } from '../types';
import { Spawner, WorldObject } from '../../types';
export const createWorldSlice: StateCreator<GameState, [], [], WorldSlice> = (set) => ({
  spawners: {},
  worldObjects: {},
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
    return { 
      terrainData: newTerrain,
      terrainDirtyPoints: dirty
    };
  }),

  addWorldObject: (obj) => set((state) => ({
    worldObjects: { ...state.worldObjects, [obj.id]: obj }
  })),

  updateWorldObject: (id, data) => set((state) => {
    if (!state.worldObjects[id]) return state;
    return {
      worldObjects: {
        ...state.worldObjects,
        [id]: { ...state.worldObjects[id], ...data }
      }
    };
  }),

  removeWorldObject: (id) => set((state) => {
    const newObjects = { ...state.worldObjects };
    delete newObjects[id];
    return { worldObjects: newObjects };
  }),
});
