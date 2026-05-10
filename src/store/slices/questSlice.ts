/**
 * @file src/store/slices/questSlice.ts
 * @description State management for the questing system and NPC interactions.
 * Tracks active quests, completed objectives, and current dialogue states.
 * @importance Essential: Vital for tracking narrative progression and providing clear goals for the player.
 */
import { StateCreator } from 'zustand';
import { GameState, QuestSlice } from '../types';

export const createQuestSlice: StateCreator<GameState, [], [], QuestSlice> = (set) => ({
  activeDialogue: null,
  activeQuests: {},

  setActiveDialogue: (dialogue) => set({ activeDialogue: dialogue }),
  setActiveQuests: (quests) => set({ activeQuests: quests }),
  
  addQuest: (quest) => set((state) => ({
    activeQuests: { ...state.activeQuests, [quest.id]: { ...quest, status: 'active' } }
  })),

  trackKill: (entityClass) => set((state) => {
    let updated = false;
    const nextQuests = { ...state.activeQuests };

    Object.values(nextQuests).forEach(quest => {
      quest.objectives.forEach(obj => {
        if (obj.type === 'kill' && obj.targetId === entityClass && !obj.completed) {
          obj.currentCount = Math.min(obj.count, obj.currentCount + 1);
          if (obj.currentCount >= obj.count) {
            obj.completed = true;
          }
          updated = true;
        }
      });
    });

    if (!updated) return state;

    return { activeQuests: nextQuests };
  }),
});
