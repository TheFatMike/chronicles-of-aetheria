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
  activeQuestOffer: null,
  activeQuestNPCId: null,
  activeQuests: {},
  trackedQuestIds: [],

  setActiveDialogue: (dialogue) => set({ activeDialogue: dialogue }),
  setQuestOffer: (quest, npcId) => set({ 
    activeQuestOffer: quest,
    activeQuestNPCId: npcId || null
  }),
  setActiveQuests: (quests) => set({ activeQuests: quests }),
  
  addQuest: (quest) => set((state) => ({
    activeQuests: { ...state.activeQuests, [quest.id]: { ...quest, status: 'active' } },
    trackedQuestIds: [...state.trackedQuestIds, quest.id] // Auto-track new quests
  })),

  abandonQuest: (questId) => set((state) => {
    const nextQuests = { ...state.activeQuests };
    delete nextQuests[questId];
    return {
      activeQuests: nextQuests,
      trackedQuestIds: state.trackedQuestIds.filter(id => id !== questId)
    };
  }),

  toggleQuestTracking: (questId) => set((state) => ({
    trackedQuestIds: state.trackedQuestIds.includes(questId)
      ? state.trackedQuestIds.filter(id => id !== questId)
      : [...state.trackedQuestIds, questId]
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
