/**
 * @file src/store/types.ts
 * @description Defines the comprehensive state structure and types for the client-side game store.
 * Provides the central type definitions for players, entities, and world state.
 * @importance Essential: Ensures type safety and consistent state management across the entire client application.
 */
import { 
  GameTarget, 
  GameEntity, 
  Spawner, 
  WorldObject, 
  Quest, 
  Character, 
  InventoryItem, 
  WorldObjectType, 
  Message,
  DialogueOption, 
  Shop, 
  ShopItem,
  CombatText
} from '@shared/types';

export interface PlayerState {
  id: string;
  name: string;
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
  inventory?: (InventoryItem | null)[];
  discoveredTeleports: string[];
  bank?: (InventoryItem | null)[];
}

export interface Projectile {
  id: string;
  startPos: [number, number, number];
  targetId: string;
  targetPos: [number, number, number];
  speed: number;
  color: string;
  createdAt: number;
}


export interface PlayerSlice {
  id: string | null;
  players: Record<string, PlayerState>;
  localPlayer: Character | null;
  setPlayerId: (id: string | null) => void;
  setPlayers: (players: PlayerState[]) => void;
  updatePlayer: (id: string, data: Partial<PlayerState>) => void;
  removePlayer: (id: string) => void;
  setLocalPlayer: (player: Character | null) => void;
  updateLocalPlayer: (data: Partial<Character>) => void;
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
  worldEditorBuffer: Record<string, Partial<WorldObject>>;
  worldEditorDeleted: { id: string, pos?: [number, number, number] }[];
  terrainData: Record<string, { y: number; type: string }>;
  terrainDirtyPoints: { x: number; z: number; y: number; type: string }[];
  setSpawners: (spawners: Spawner[]) => void;
  setWorldObjects: (objects: WorldObject[]) => void;
  addWorldObjects: (objects: WorldObject[]) => void;
  setTerrainData: (data: { x: number; z: number; y: number; type: string }[]) => void;
  updateTerrainData: (data: { x: number; z: number; y?: number; deltaY?: number; type?: string }[]) => void;
  addWorldObject: (obj: WorldObject) => void;
  updateWorldObject: (id: string, data: Partial<WorldObject>) => void;
  removeWorldObject: (id: string) => void;
  addToEditorBuffer: (id: string, data: Partial<WorldObject>) => void;
  markObjectDeleted: (id: string) => void;
  terrainEditorBuffer: Record<string, { y: number; type: string }>;
  clearEditorBuffer: () => void;
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
  combatTexts: CombatText[];
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
  addCombatText: (text: CombatText) => void;
  removeCombatText: (id: string) => void;
}

export interface UISlice {
  messages: Message[];
  connected: boolean;
  activeMenu: 'inventory' | 'map' | 'menu' | 'spawners' | 'quests' | 'skills' | 'passives' | null;
  devMode: boolean;
  isEditorOpen: boolean;
  isTransforming: boolean;
  editorShowOutliner: boolean;
  gridSnap: boolean;
  editorTransformMode: 'translate' | 'rotate' | 'scale';
  editorSelectedType: WorldObjectType | null;
  editorBrushSize: number;
  editorBrushStrength: number;
  selectedWorldObjectId: string | null;
  teleportRequest: [number, number, number] | null;
  isInventoryOpen: boolean;
  isCharacterOpen: boolean;
  isQuestsOpen: boolean;
  isSkillsOpen: boolean;
  isPassiveTreeOpen: boolean;
  isWorldLoading: boolean;
  uiScale: number;
  brightness: number;
  editorStartPosition: [number, number, number] | null;
  editorMousePoint: [number, number, number] | null;
  contextMenu: { 
    x: number; 
    y: number; 
    title: string; 
    targetId: string;
    targetType?: 'player' | 'npc' | 'enemy';
    targetRole?: string;
  } | null;
  activeLoot: { targetId: string; items: (InventoryItem | null)[]; gold: number } | null;
  worldReady: boolean;
  isShopOpen: boolean;
  activeShop: Shop | null;
  activeShopNPCId: string | null;
  isBankOpen: boolean;
  activeBankNPCId: string | null;
  assetsReady: boolean;
  showAllNames: boolean;
  addMessage: (message: Message) => void;
  setConnected: (connected: boolean) => void;
  setActiveMenu: (menu: 'inventory' | 'map' | 'menu' | 'spawners' | 'quests' | 'skills' | 'passives' | null) => void;
  setInventoryOpen: (isOpen: boolean) => void;
  setCharacterOpen: (isOpen: boolean) => void;
  setQuestsOpen: (isOpen: boolean) => void;
  setSkillsOpen: (isOpen: boolean) => void;
  setPassiveTreeOpen: (isOpen: boolean) => void;
  setWorldLoading: (isLoading: boolean) => void;
  setWorldReady: (isReady: boolean) => void;
  setAssetsReady: (isReady: boolean) => void;
  setUIScale: (scale: number) => void;
  setBrightness: (brightness: number) => void;
  setDevMode: (enabled: boolean) => void;
  setEditorOpen: (isOpen: boolean) => void;
  setTransforming: (val: boolean) => void;
  setGridSnap: (val: boolean) => void;
  setEditorTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setEditorSelectedType: (type: WorldObjectType | null) => void;
  setEditorBrushSize: (size: number) => void;
  setEditorBrushStrength: (strength: number) => void;
  setEditorShowOutliner: (val: boolean) => void;
  setEditorStartPosition: (pos: [number, number, number] | null) => void;
  setEditorMousePoint: (pos: [number, number, number] | null) => void;
  setSelectedWorldObjectId: (id: string | null) => void;
  requestTeleport: (pos: [number, number, number] | null) => void;
  setContextMenu: (menu: { 
    x: number; 
    y: number; 
    title: string; 
    targetId: string;
    targetType?: 'player' | 'npc' | 'enemy';
    targetRole?: string;
  } | null) => void;
  setActiveLoot: (loot: { targetId: string; items: (InventoryItem | null)[]; gold: number } | null) => void;
  setShopOpen: (isOpen: boolean, npcId?: string) => void;
  setActiveShop: (shop: Shop | null) => void;
  setBankOpen: (isOpen: boolean, npcId?: string) => void;
  setShowAllNames: (show: boolean) => void;
}


export interface QuestSlice {
  activeDialogue: { 
    speaker: string; 
    text: string; 
    npcId: string;
    npcType: string;
    quest?: Quest | null;
    options?: DialogueOption[];
  } | null;
  activeQuestOffer: Quest | null;
  activeQuestNPCId: string | null;
  activeQuests: Record<string, Quest>;
  trackedQuestIds: string[];
  setActiveDialogue: (dialogue: { speaker: string; text: string; npcId: string; npcType: string; quest?: Quest | null; options?: DialogueOption[] } | null) => void;
  setQuestOffer: (quest: Quest | null, npcId?: string) => void;
  setActiveQuests: (quests: Record<string, Quest>) => void;
  addQuest: (quest: Quest) => void;
  abandonQuest: (questId: string) => void;
  toggleQuestTracking: (questId: string) => void;
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
      level?: number;
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
    p1Items: (InventoryItem | null)[];
    p2Items: (InventoryItem | null)[];
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

export interface TeleportSlice {
  discoveredTeleports: string[];
  isTeleportMenuOpen: boolean;
  activeTeleportCrystalId: string | null;
  discoverTeleport: (id: string) => void;
  setTeleportMenuOpen: (open: boolean, crystalId?: string | null) => void;
  setDiscoveredTeleports: (ids: string[]) => void;
}

export type GameState = PlayerSlice & EntitySlice & WorldSlice & CombatSlice & UISlice & QuestSlice & PartySlice & TradeSlice & TeleportSlice;
