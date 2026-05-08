import { create } from 'zustand';
import { GameState } from './types';
import { createPlayerSlice } from './slices/playerSlice';
import { createEntitySlice } from './slices/entitySlice';
import { createWorldSlice } from './slices/worldSlice';
import { createCombatSlice } from './slices/combatSlice';
import { createUISlice } from './slices/uiSlice';
import { createQuestSlice } from './slices/questSlice';
import { createPartySlice } from './slices/partySlice';
import { createTradeSlice } from './slices/tradeSlice';

export const useGameStore = create<GameState>((...a) => ({
  ...createPlayerSlice(...a),
  ...createEntitySlice(...a),
  ...createWorldSlice(...a),
  ...createCombatSlice(...a),
  ...createUISlice(...a),
  ...createQuestSlice(...a),
  ...createPartySlice(...a),
  ...createTradeSlice(...a),
}));
