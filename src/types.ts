export interface Stats {
  strength: number;
  dexterity: number;
  wisdom: number;
  intelligence: number;
  stamina: number;
}

export type SkillType = 'active' | 'passive';
export type SkillTarget = 'self' | 'target' | 'area';

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon name
  type: SkillType;
  cooldown: number; // in seconds
  manaCost: number;
  damageMultiplier?: number;
  healingMultiplier?: number;
  range?: number;
  castTime?: number; // in milliseconds
  targetType: SkillTarget;
  animation?: string;
}

export interface Character {
  id: string;
  name: string;
  class: string;
  color: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  role?: string;
  stats: Stats;
  inventory: (InventoryItem | null)[];
  hotbar: (HotbarSlot | null)[];
  equipment?: EquipmentSlots;
  quests: Record<string, Quest>;
  skills: string[]; // IDs of learned skills
  pos?: [number, number, number];
  rot?: [number, number, number];
}

export type HotbarSlot = { type: 'item', data: InventoryItem } | { type: 'skill', data: Skill };

export type QuestObjectiveType = 'kill' | 'talk' | 'collect' | 'equip';

export interface QuestObjective {
  id: string;
  type: QuestObjectiveType;
  targetId: string; // Enemy type ID, NPC name/ID, or Item ID
  targetName: string;
  count: number;
  currentCount: number;
  completed: boolean;
}

export interface QuestReward {
  exp?: number;
  gold?: number;
  items?: string[]; // Array of itemId
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  giverName: string;
  giverId: string;
  level: number;
  objectives: QuestObjective[];
  reward: QuestReward;
  status: 'available' | 'active' | 'completed';
}

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ItemType = "weapon" | "head" | "chest" | "legs" | "boots" | "offhand" | "accessory" | "consumable" | "misc" | "armor";

export interface EquipmentSlots {
  [key: string]: InventoryItem | null;
  head: InventoryItem | null;
  chest: InventoryItem | null;
  legs: InventoryItem | null;
  boots: InventoryItem | null;
  weapon: InventoryItem | null;
  offhand: InventoryItem | null;
  accessory: InventoryItem | null;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  icon: string; // Lucide icon name or emoji
  stats?: Partial<Stats>;
  quantity?: number;
  stackable?: boolean;
  maxStack?: number;
  twoHanded?: boolean;
}

export interface PlayerData {
  id: string;
  displayName: string;
  characterName: string;
  class: string;
  pos: [number, number, number];
  rot: [number, number, number];
  color: string;
  isMoving?: boolean;
  isGrounded?: boolean;
  role?: string;
  hp?: number;
  mp?: number;
  maxHp?: number;
  maxMp?: number;
}

export type WorldObjectType = 'tree' | 'rock' | 'house' | 'tent' | 'bush' | 'fence' | 'campfire' | 'barrel' | 'dummy' | 'chest' | 'well' | 'signpost' | 'waypoint' | 'spawner_slime' | 'spawner_wolf' | 'spawner_guard' | 'spawner_instructor_kael' | 'npc_guard_captain' | 'npc_instructor_kael' | 'delete' | 'edit';

export interface WorldObject {
  id: string;
  type: WorldObjectType;
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
  hitboxes?: any[]; // Server-synced collision data
  waypointId?: string; // For pathing
  nextWaypointId?: string; // For linking
  pathId?: string; // For categorizing paths
}

export type TargetType = "player" | "npc" | "enemy";

export interface GameTarget {
  id: string;
  name: string;
  type: TargetType;
  level: number;
  hp?: number;
  maxHp?: number;
  color?: string;
  class?: string;
  role?: string;
  isDead?: boolean;
}

export interface Spawner {
  id: string;
  name: string;
  type: "npc" | "enemy";
  entityClass: string;
  level: number;
  pos: [number, number, number];
  spawnRadius: number;
  maxEntities: number;
  respawnTime: number; // in seconds
  pathId?: string; // For assigned guard paths
}

export interface GameEntity extends GameTarget {
  pos: [number, number, number];
  rot: [number, number, number];
  spawnerId?: string;
  entityClass?: string;
  lastUpdate: number;
  isMoving?: boolean;
  isDead?: boolean;
  loot?: string[]; // Array of Item IDs
  pathId?: string;
  currentWaypointIndex?: number;
  aiState?: string;
  homePos?: [number, number, number];
  targetId?: string | null;
  lastAttackTime?: number;
}

