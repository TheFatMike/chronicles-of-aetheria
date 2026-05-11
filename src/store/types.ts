/**
 * @file src/store/types.ts
 * @description Defines the comprehensive state structure and types for the client-side game store.
 * Provides the central type definitions for players, entities, and world state.
 * @importance Essential: Ensures type safety and consistent state management across the entire client application.
 */
import { GameTarget, GameEntity, Spawner, WorldObject, Quest } from '../types';

export interface PlayerState {
  id: string;
  characterName: string;
  displayName: string;
  class: string;
  color: string;
  pos: [number, number, number];
  rot: [number, number, number];
  isMoving?: boolean;
  isGrounded?: boolean;
  isAttacking?: boolean;
  role?: string;
  hp?: number;
  mp?: number;
  maxHp?: number;
  maxMp?: number;
  level?: number;
  exp?: number;
  maxExp?: number;
  gold?: number;
}

export interface Projectile {
  id: string;
  startPos: [number, number, number];
  targetId: string;
  targetPos: [number, number, number];
  speed: number;
  color: string;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  color: string;
  role?: string;
}

export interface PlayerSlice {
  id: string | null;
  players: Record<string, PlayerState>;
  setPlayerId: (id: string | null) => void;
  setPlayers: (players: PlayerState[]) => void;
  updatePlayer: (id: string, data: Partial<PlayerState>) => void;
  removePlayer: (id: string) => void;
}

export interface EntitySlice {
  entities: Record<string, GameEntity>;
  setEntities: (entities: GameEntity[]) => void;
  registerEntity: (entity: GameEntity) => void;
  unregisterEntity: (id: string) => void;
  updateEntity: (id: string, data: Partial<GameEntity>) => void;
  discoverEntities: (entities: GameEntity[]) => void;
  removeEntities: (ids: string[]) => void;
}

export interface WorldSlice {
  spawners: Record<string, Spawner>;
  worldObjects: Record<string, WorldObject>;
  terrainData: Record<string, { y: number; type: string }>;
  terrainDirtyPoints: { x: number; z: number; y: number; type: string }[];
  setSpawners: (spawners: Spawner[]) => void;
  setWorldObjects: (objects: WorldObject[]) => void;
  setTerrainData: (data: { x: number; z: number; y: number; type: string }[]) => void;
  updateTerrainData: (data: { x: number; z: number; y?: number; deltaY?: number; type?: string }[]) => void;
  addWorldObject: (obj: WorldObject) => void;
  updateWorldObject: (id: string, data: Partial<WorldObject>) => void;
  removeWorldObject: (id: string) => void;
}

export interface CombatSlice {
  currentTarget: GameTarget | null;
  autoAttackTargetId: string | null;
  isAttacking: boolean;
  skillCooldowns: Record<string, number>;
  castState: {
    active: boolean;
    name: string;
    duration: number;
    startTime: number;
  } | null;
  projectiles: Projectile[];
  setTarget: (target: GameTarget | null) => void;
  setAutoAttackTarget: (id: string | null) => void;
  setAttacking: (isAttacking: boolean) => void;
  setSkillCooldown: (skillId: string, timestamp: number) => void;
  startCast: (name: string, duration: number) => void;
  cancelCast: () => void;
  completeCast: () => void;
  addProjectile: (p: Projectile) => void;
  removeProjectile: (id: string) => void;
  takeDamage: (id: string, amount: number) => void;
}

export interface UISlice {
  messages: Message[];
  connected: boolean;
  activeMenu: 'inventory' | 'map' | 'menu' | 'spawners' | 'quests' | 'skills' | null;
  devMode: boolean;
  isEditorOpen: boolean;
  isTransforming: boolean;
  gridSnap: boolean;
  editorTransformMode: 'translate' | 'rotate' | 'scale';
  editorSelectedType: import('../types').WorldObjectType | null;
  editorBrushSize: number;
  editorBrushStrength: number;
  selectedWorldObjectId: string | null;
  teleportRequest: [number, number, number] | null;
  isInventoryOpen: boolean;
  isCharacterOpen: boolean;
  isQuestsOpen: boolean;
  isSkillsOpen: boolean;
  isWorldLoading: boolean;
  uiScale: number;
  contextMenu: { x: number; y: number; title: string; targetId: string } | null;
  activeLoot: { targetId: string; items: (import('../types').InventoryItem | null)[]; gold: number } | null;
  addMessage: (message: Message) => void;
  setConnected: (connected: boolean) => void;
  setActiveMenu: (menu: 'inventory' | 'map' | 'menu' | 'spawners' | 'quests' | 'skills' | null) => void;
  setInventoryOpen: (isOpen: boolean) => void;
  setCharacterOpen: (isOpen: boolean) => void;
  setQuestsOpen: (isOpen: boolean) => void;
  setSkillsOpen: (isOpen: boolean) => void;
  setWorldLoading: (isLoading: boolean) => void;
  setUIScale: (scale: number) => void;
  setDevMode: (enabled: boolean) => void;
  setEditorOpen: (isOpen: boolean) => void;
  setTransforming: (val: boolean) => void;
  setGridSnap: (val: boolean) => void;
  setEditorTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setEditorSelectedType: (type: import('../types').WorldObjectType | null) => void;
  setEditorBrushSize: (size: number) => void;
  setEditorBrushStrength: (strength: number) => void;
  setSelectedWorldObjectId: (id: string | null) => void;
  requestTeleport: (pos: [number, number, number] | null) => void;
  setContextMenu: (menu: { x: number; y: number; title: string; targetId: string } | null) => void;
  setActiveLoot: (loot: { targetId: string; items: (import('../types').InventoryItem | null)[]; gold: number } | null) => void;
}

export interface QuestSlice {
  activeDialogue: { speaker: string; text: string; quest?: Quest | null } | null;
  activeQuests: Record<string, Quest>;
  setActiveDialogue: (dialogue: { speaker: string; text: string; quest?: Quest | null } | null) => void;
  setActiveQuests: (quests: Record<string, Quest>) => void;
  addQuest: (quest: Quest) => void;
  trackKill: (entityClass: string) => void;
}

export interface PartySlice {
  party: {
    id: string;
    leaderId: string;
    members: string[];
    memberDetails: {
      id: string;
      name: string;
      hp: number;
      maxHp: number;
      mp: number;
      maxMp: number;
      class: string;
      color: string;
    }[];
  } | null;
  partyInvite: { fromId: string; fromName: string } | null;
  setParty: (party: PartySlice['party']) => void;
  setPartyInvite: (invite: PartySlice['partyInvite']) => void;
}

export interface TradeSlice {
  tradeRequest: { fromId: string; fromName: string } | null;
  activeTrade: {
    id: string;
    p1: string;
    p2: string;
    p1Name: string;
    p2Name: string;
    p1Items: (import('../types').InventoryItem | null)[];
    p2Items: (import('../types').InventoryItem | null)[];
    p1Gold: number;
    p2Gold: number;
    p1Locked: boolean;
    p2Locked: boolean;
    p1Confirmed: boolean;
    p2Confirmed: boolean;
  } | null;
  setTradeRequest: (request: TradeSlice['tradeRequest']) => void;
  setActiveTrade: (trade: TradeSlice['activeTrade']) => void;
}

export type GameState = PlayerSlice & EntitySlice & WorldSlice & CombatSlice & UISlice & QuestSlice & PartySlice & TradeSlice;
