import { StateCreator } from 'zustand';
import { GameState, EntitySlice } from '../types';
import { GameEntity } from '../../types';

export const createEntitySlice: StateCreator<GameState, [], [], EntitySlice> = (set) => ({
  entities: {},

  setEntities: (entitiesArray) => set((state) => {
    const entitiesObj: Record<string, GameEntity> = {};
    entitiesArray.forEach(e => {
      entitiesObj[e.id] = {
        ...e,
        hp: e.hp ?? 100,
        maxHp: e.maxHp ?? 100
      };
    });

    const currentTargetId = state.currentTarget?.id;
    const updatedTarget = currentTargetId ? entitiesObj[currentTargetId] || null : state.currentTarget;

    return { 
      entities: entitiesObj,
      currentTarget: updatedTarget ? (updatedTarget as any) : null
    };
  }),

  registerEntity: (entity) => set((state) => {
    const newEntity = {
      ...entity,
      hp: entity.hp ?? 100,
      maxHp: entity.maxHp ?? 100
    };
    
    const updatedTarget = state.currentTarget?.id === entity.id ? newEntity as any : state.currentTarget;

    return {
      entities: { 
        ...state.entities, 
        [entity.id]: newEntity
      },
      currentTarget: updatedTarget
    };
  }),

  unregisterEntity: (id) => set((state) => {
    const newEntities = { ...state.entities };
    delete newEntities[id];
    const newTarget = state.currentTarget?.id === id ? null : state.currentTarget;
    return { entities: newEntities, currentTarget: newTarget };
  }),

  updateEntity: (id, data) => set((state) => {
    if (!state.entities[id]) return state;
    const updatedEntity = { ...state.entities[id], ...data };
    const updatedTarget = state.currentTarget?.id === id ? updatedEntity as any : state.currentTarget;
    return {
      entities: { ...state.entities, [id]: updatedEntity },
      currentTarget: updatedTarget
    };
  }),
});
