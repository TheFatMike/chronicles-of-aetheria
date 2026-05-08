import { StateCreator } from 'zustand';
import { GameState, PartySlice } from '../types';

export const createPartySlice: StateCreator<
  GameState,
  [],
  [],
  PartySlice
> = (set) => ({
  party: null,
  partyInvite: null,
  setParty: (party) => set({ party }),
  setPartyInvite: (partyInvite) => set({ partyInvite }),
});
