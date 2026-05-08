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
