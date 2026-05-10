/**
 * @file src/store/slices/partySlice.ts
 * @description State management for party-related social features.
 * Tracks party membership, invitations, and member status across the world.
 * @importance Essential: Key for coordinating group activities and social interaction.
 */
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
