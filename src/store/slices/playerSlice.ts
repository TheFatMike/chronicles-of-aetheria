import { StateCreator } from 'zustand';
import { GameState, PlayerSlice, PlayerState } from '../types';

export const createPlayerSlice: StateCreator<GameState, [], [], PlayerSlice> = (set) => ({
  id: null,
  players: {},

  setPlayerId: (id) => set({ id }),

  setPlayers: (playersArray) => set((state) => {
    const playersObj: Record<string, PlayerState> = {};
    playersArray.forEach(p => {
      // PREVENT SNAPPING: If this is the local player and we already have state,
      // keep our local position/rotation to ensure smooth movement.
      if (p.id === state.id && state.players[p.id]) {
        playersObj[p.id] = {
          ...p,
          pos: state.players[p.id].pos,
          rot: state.players[p.id].rot
        };
      } else {
        playersObj[p.id] = p;
      }
    });
    return { players: playersObj };
  }),
  
  updatePlayer: (id, data) => set((state) => {
    let updatedPlayer;
    if (!state.players[id]) {
      updatedPlayer = {
        id,
        characterName: "Unknown",
        displayName: "Unknown",
        class: "warrior",
        color: "#fff",
        pos: [0, 0, 0],
        rot: [0, 0, 0],
        ...data
      } as any;
    } else {
      // Filter out undefined values from data to prevent overwriting existing state
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );
      updatedPlayer = { ...state.players[id], ...cleanData };
    }
    
    // Auto-update target if we are targeting this player (cast as target)
    const updatedTarget = state.currentTarget?.id === id 
      ? { ...state.currentTarget, name: updatedPlayer.characterName, color: updatedPlayer.color, class: updatedPlayer.class, role: updatedPlayer.role } 
      : state.currentTarget;

    return {
      players: {
        ...state.players,
        [id]: updatedPlayer
      },
      currentTarget: updatedTarget as any
    };
  }),

  removePlayer: (id) => set((state) => {
    const newPlayers = { ...state.players };
    delete newPlayers[id];
    const newTarget = state.currentTarget?.id === id ? null : state.currentTarget;
    return { players: newPlayers, currentTarget: newTarget };
  }),
});
