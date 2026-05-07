import { StateCreator } from 'zustand';
import { GameState, CombatSlice } from '../types';

export const createCombatSlice: StateCreator<GameState, [], [], CombatSlice> = (set) => ({
  currentTarget: null,
  autoAttackTargetId: null,
  isAttacking: false,
  skillCooldowns: {},
  castState: null,
  projectiles: [],

  setTarget: (target) => set((state) => ({ 
    currentTarget: target,
    autoAttackTargetId: target ? state.autoAttackTargetId : null
  })),

  setAutoAttackTarget: (id) => set({ autoAttackTargetId: id }),
  setAttacking: (isAttacking) => set({ isAttacking }),
  
  setSkillCooldown: (skillId, timestamp) => set((state) => ({
    skillCooldowns: { ...state.skillCooldowns, [skillId]: timestamp }
  })),

  startCast: (name, duration) => set({
    castState: {
      active: true,
      name,
      duration,
      startTime: Date.now()
    }
  }),
  
  cancelCast: () => set({ castState: null }),
  completeCast: () => set({ castState: null }),

  addProjectile: (p) => set(state => ({ projectiles: [...state.projectiles, p] })),
  removeProjectile: (id) => set(state => ({ projectiles: state.projectiles.filter(p => p.id !== id) })),

  takeDamage: (id, amount) => set((state) => {
    const entity = state.entities[id];
    if (!entity) return state;

    const currentHp = entity.hp !== undefined ? entity.hp : (entity.maxHp || 100);
    const newHp = Math.max(0, currentHp - amount);
    const updatedEntity = { ...entity, hp: newHp };
    
    if (newHp === 0) {
      const newEntities = { ...state.entities };
      delete newEntities[id];
      
      if (entity.entityClass) {
        state.trackKill(entity.entityClass);
      }

      return { 
        entities: newEntities,
        currentTarget: state.currentTarget?.id === id ? null : state.currentTarget
      };
    }

    return {
      entities: { ...state.entities, [id]: updatedEntity },
      currentTarget: state.currentTarget?.id === id ? { ...state.currentTarget, hp: newHp } as any : state.currentTarget
    };
  }),
});
