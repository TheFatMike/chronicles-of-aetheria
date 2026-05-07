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
}

export interface WorldSlice {
  spawners: Record<string, Spawner>;
  worldObjects: Record<string, WorldObject>;
  setSpawners: (spawners: Spawner[]) => void;
  setWorldObjects: (objects: WorldObject[]) => void;
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
  isMobile: boolean;
  mobileJoystickPos: { x: number; y: number } | null;
  isEditorOpen: boolean;
  isTransforming: boolean;
  editorSelectedType: import('../types').WorldObjectType | null;
  selectedWorldObjectId: string | null;
  teleportRequest: [number, number, number] | null;
  addMessage: (message: Message) => void;
  setConnected: (connected: boolean) => void;
  setActiveMenu: (menu: 'inventory' | 'map' | 'menu' | 'spawners' | 'quests' | 'skills' | null) => void;
  setDevMode: (enabled: boolean) => void;
  setMobile: (isMobile: boolean) => void;
  setMobileJoystickPos: (pos: { x: number; y: number } | null) => void;
  setEditorOpen: (isOpen: boolean) => void;
  setTransforming: (val: boolean) => void;
  setEditorSelectedType: (type: import('../types').WorldObjectType | null) => void;
  setSelectedWorldObjectId: (id: string | null) => void;
  requestTeleport: (pos: [number, number, number] | null) => void;
}

export interface QuestSlice {
  activeDialogue: { speaker: string; text: string; quest?: Quest | null } | null;
  activeQuests: Record<string, Quest>;
  setActiveDialogue: (dialogue: { speaker: string; text: string; quest?: Quest | null } | null) => void;
  setActiveQuests: (quests: Record<string, Quest>) => void;
  addQuest: (quest: Quest) => void;
  trackKill: (entityClass: string) => void;
}

export type GameState = PlayerSlice & EntitySlice & WorldSlice & CombatSlice & UISlice & QuestSlice;
