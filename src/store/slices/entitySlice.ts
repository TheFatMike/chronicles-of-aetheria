/**
 * @file src/store/slices/entitySlice.ts
 * @description Manages the collection of all dynamic entities in the game world.
 * Tracks positions, health, and metadata for NPCs, enemies, and other players.
 * @importance Critical: The authoritative source for all non-player character state on the client.
 */
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
    // Only update the target from the entity list if it's an entity (NPC/Enemy). 
    // If it's a player, we leave it alone (it's handled by playerSlice or preserved by merge)
    let updatedTarget = state.currentTarget;
    if (currentTargetId && entitiesObj[currentTargetId]) {
      updatedTarget = { ...state.currentTarget, ...entitiesObj[currentTargetId] } as any;
    } else if (currentTargetId && state.currentTarget?.type !== 'player') {
      // If it's not a player and not in the new entities list, it might have been removed
      updatedTarget = null;
    }

    return { 
      entities: entitiesObj,
      currentTarget: updatedTarget
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

  discoverEntities: (entitiesArray) => set((state) => {
    const newEntities = { ...state.entities };
    entitiesArray.forEach(e => {
      newEntities[e.id] = {
        ...e,
        hp: e.hp ?? 100,
        maxHp: e.maxHp ?? 100
      };
    });
    return { entities: newEntities };
  }),

  removeEntities: (ids) => set((state) => {
    const newEntities = { ...state.entities };
    ids.forEach(id => delete newEntities[id]);
    const newTarget = (state.currentTarget && ids.includes(state.currentTarget.id)) ? null : state.currentTarget;
    return { entities: newEntities, currentTarget: newTarget };
  }),

  updateEntity: (id, data) => set((state) => {
    if (!state.entities[id]) {
      // If entity doesn't exist, treat this as a registration
      const newEntity = {
        ...data,
        hp: data.hp ?? 100,
        maxHp: data.maxHp ?? 100
      } as GameEntity;
      
      return {
        entities: { ...state.entities, [id]: newEntity }
      };
    }
    
    const updatedEntity = { ...state.entities[id], ...data };
    const updatedTarget = state.currentTarget?.id === id ? updatedEntity as any : state.currentTarget;
    return {
      entities: { ...state.entities, [id]: updatedEntity },
      currentTarget: updatedTarget
    };
  }),
});
