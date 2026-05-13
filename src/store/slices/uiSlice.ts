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
  isPassiveTreeOpen: false,
  isWorldLoading: false,
  uiScale: parseFloat(localStorage.getItem('ui_scale') || '1.0'),
  brightness: parseFloat(localStorage.getItem('game_brightness') || '1.0'),
  contextMenu: null,
  worldReady: false,
  assetsReady: false,
  isShopOpen: false,
  activeShop: null,
  activeShopNPCId: null,
  isBankOpen: false,
  activeBankNPCId: null,
  showAllNames: localStorage.getItem('show_all_names') === 'true',

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
  setPassiveTreeOpen: (isOpen) => set({ isPassiveTreeOpen: isOpen }),
  setWorldLoading: (isLoading) => set({ isWorldLoading: isLoading }),
  setWorldReady: (isReady) => set({ worldReady: isReady }),
  setAssetsReady: (isReady) => set({ assetsReady: isReady }),
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
  editorMousePoint: null,
  setEditorMousePoint: (pos) => set((state) => {
    // Only update if the position has actually changed to prevent render loops
    if (!pos && !state.editorMousePoint) return state;
    if (pos && state.editorMousePoint && 
        pos[0] === state.editorMousePoint[0] && 
        pos[1] === state.editorMousePoint[1] && 
        pos[2] === state.editorMousePoint[2]) return state;
    return { editorMousePoint: pos };
  }),
  setSelectedWorldObjectId: (id) => set({ selectedWorldObjectId: id, isTransforming: false }),
  requestTeleport: (pos) => set({ teleportRequest: pos }),
  setContextMenu: (menu) => set({ contextMenu: menu }),
  activeLoot: null,
  setActiveLoot: (loot) => set({ activeLoot: loot }),
  setShopOpen: (isOpen, npcId) => set({ isShopOpen: isOpen, activeShopNPCId: npcId || null }),
  setActiveShop: (shop) => set({ activeShop: shop }),
  setBankOpen: (isOpen, npcId) => set({ isBankOpen: isOpen, activeBankNPCId: npcId || null }),
  setShowAllNames: (show) => {
    localStorage.setItem('show_all_names', show.toString());
    set({ showAllNames: show });
  },
});
