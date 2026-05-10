import { StateCreator } from 'zustand';
import { GameState, UISlice } from '../types';

export const createUISlice: StateCreator<GameState, [], [], UISlice> = (set) => ({
  messages: [],
  connected: false,
  activeMenu: null,
  devMode: false,
  isEditorOpen: false,
  isTransforming: false,
  gridSnap: false,
  editorTransformMode: 'translate',
  editorSelectedType: null,
  editorBrushSize: 8,
  editorBrushStrength: 0.5,
  selectedWorldObjectId: null,
  teleportRequest: null,
  isInventoryOpen: false,
  isCharacterOpen: false,
  isQuestsOpen: false,
  isSkillsOpen: false,
  isWorldLoading: false,
  contextMenu: null,

  addMessage: (message) => set((state) => ({
    messages: [...state.messages.slice(-99), message],
  })),

  setConnected: (connected) => set({ connected }),
  setActiveMenu: (menu) => set((state) => {
    if (menu === 'map') {
      return { 
        activeMenu: menu,
        isInventoryOpen: false,
        isCharacterOpen: false,
        isQuestsOpen: false,
        isSkillsOpen: false
      };
    }
    return { activeMenu: menu };
  }),
  setInventoryOpen: (isOpen) => set({ isInventoryOpen: isOpen }),
  setCharacterOpen: (isOpen) => set({ isCharacterOpen: isOpen }),
  setQuestsOpen: (isOpen) => set({ isQuestsOpen: isOpen }),
  setSkillsOpen: (isOpen) => set({ isSkillsOpen: isOpen }),
  setWorldLoading: (isLoading) => set({ isWorldLoading: isLoading }),
  setDevMode: (devMode) => set({ devMode }),
  
  setEditorOpen: (isOpen) => set({ isEditorOpen: isOpen }),
  setTransforming: (isTransforming) => set({ isTransforming }),
  setGridSnap: (gridSnap) => set({ gridSnap }),
  setEditorTransformMode: (editorTransformMode) => set({ editorTransformMode }),
  setEditorSelectedType: (type) => set({ editorSelectedType: type, selectedWorldObjectId: null }),
  setEditorBrushSize: (size) => set({ editorBrushSize: size }),
  setEditorBrushStrength: (strength) => set({ editorBrushStrength: strength }),
  setSelectedWorldObjectId: (id) => set({ selectedWorldObjectId: id }),
  requestTeleport: (pos) => set({ teleportRequest: pos }),
  setContextMenu: (menu) => set({ contextMenu: menu }),
  activeLoot: null,
  setActiveLoot: (loot) => set({ activeLoot: loot }),
});
