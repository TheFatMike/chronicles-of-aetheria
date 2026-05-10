/**
 * @file src/store/slices/tradeSlice.ts
 * @description State management for the player-to-player trading system.
 * Tracks offered items, gold amounts, and lock/confirmation statuses for both parties.
 * @importance Essential: Ensures the integrity and security of item exchanges within the game.
 */
import { StateCreator } from 'zustand';
import { GameState, TradeSlice } from '../types';

export const createTradeSlice: StateCreator<
  GameState,
  [],
  [],
  TradeSlice
> = (set) => ({
  tradeRequest: null,
  activeTrade: null,
  setTradeRequest: (tradeRequest) => set({ tradeRequest }),
  setActiveTrade: (activeTrade) => set({ activeTrade }),
});
