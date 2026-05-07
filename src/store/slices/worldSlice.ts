import { StateCreator } from 'zustand';
import { GameState, WorldSlice } from '../types';
import { Spawner, WorldObject } from '../../types';
export const createWorldSlice: StateCreator<GameState, [], [], WorldSlice> = (set) => ({
  spawners: {},
  worldObjects: {},

  setSpawners: (spawnersArray) => {
    console.log(`STORE: Spawners updated (${spawnersArray.length})`);
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
