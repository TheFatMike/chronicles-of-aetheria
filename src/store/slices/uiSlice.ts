/**
 * @file src/store/slices/uiSlice.ts
 * @description State management for general user interface elements.
 * Tracks chat history, active menu windows, and system notifications.
 * @importance Essential: Coordinates the visibility and state of non-gameplay UI components.
 */
import { StateCreator } from 'zustand';
import { GameState, UISlice } from '../types';

export const createUISlice: StateCreator<GameState, [], [], UISlice> = (set) => ({
  messages: [],
  connected: false,
  activeMenu: null,
  devMode: false,
  isEditorOpen: false,
  isTransforming: false,
  editorShowOutliner: false,
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
  uiScale: parseFloat(localStorage.getItem('ui_scale') || '1.0'),
  brightness: parseFloat(localStorage.getItem('game_brightness') || '1.0'),
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
  setUIScale: (uiScale) => {
    localStorage.setItem('ui_scale', uiScale.toString());
    set({ uiScale });
  },
  setBrightness: (brightness) => {
    localStorage.setItem('game_brightness', brightness.toString());
    set({ brightness });
  },
  setDevMode: (devMode) => set({ devMode }),
  
  setEditorOpen: (isOpen) => set({ isEditorOpen: isOpen }),
  setTransforming: (isTransforming) => set({ isTransforming }),
  setGridSnap: (gridSnap) => set({ gridSnap }),
  setEditorTransformMode: (editorTransformMode) => set({ editorTransformMode }),
  setEditorSelectedType: (type) => set({ editorSelectedType: type, selectedWorldObjectId: null }),
  setEditorBrushSize: (size) => set({ editorBrushSize: size }),
  setEditorBrushStrength: (strength) => set({ editorBrushStrength: strength }),
  setEditorShowOutliner: (val) => set({ editorShowOutliner: val }),
  editorStartPosition: null,
  setEditorStartPosition: (pos) => set({ editorStartPosition: pos }),
  setSelectedWorldObjectId: (id) => set({ selectedWorldObjectId: id, isTransforming: false }),
  requestTeleport: (pos) => set({ teleportRequest: pos }),
  setContextMenu: (menu) => set({ contextMenu: menu }),
  activeLoot: null,
  setActiveLoot: (loot) => set({ activeLoot: loot }),
});
