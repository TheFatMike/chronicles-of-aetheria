import { StateCreator } from 'zustand';
import { GameState, UISlice } from '../types';

export const createUISlice: StateCreator<GameState, [], [], UISlice> = (set) => ({
  messages: [],
  connected: false,
  activeMenu: null,
  devMode: false,
  isMobile: false,
  mobileJoystickPos: null,
  isEditorOpen: false,
  isTransforming: false,
  editorSelectedType: null,
  selectedWorldObjectId: null,
  teleportRequest: null,

  addMessage: (message) => set((state) => ({
    messages: [...state.messages.slice(-99), message],
  })),

  setConnected: (connected) => set({ connected }),
  setActiveMenu: (menu) => set({ activeMenu: menu }),
  setDevMode: (devMode) => set({ devMode }),
  setMobile: (isMobile) => set({ isMobile }),
  setMobileJoystickPos: (pos) => set({ mobileJoystickPos: pos }),
  
  setEditorOpen: (isOpen) => set({ isEditorOpen: isOpen }),
  setTransforming: (isTransforming) => set({ isTransforming }),
  setEditorSelectedType: (type) => set({ editorSelectedType: type, selectedWorldObjectId: null }),
  setSelectedWorldObjectId: (id) => set({ selectedWorldObjectId: id }),
  requestTeleport: (pos) => set({ teleportRequest: pos }),
});
