/**
 * @file server/state.ts
 * @description Defines and exports the in-memory state containers for the game server.
 * Tracks players, entities, parties, trades, and terrain data in real-time.
 * @importance Critical: Serves as the authoritative source of truth for the game world's current state on the server.
 */
export const players = new Map<string, any>();
export const entities = new Map<string, any>();
export const spawners = new Map<string, any>();
export const worldObjects = new Map<string, any>();
export const logoutTimers = new Map<string, NodeJS.Timeout>();
export const lastSkillUse = new Map<string, Record<string, number>>(); // socketId -> { skillId: timestamp }
export const lastChatMessage = new Map<string, number>(); // socketId -> timestamp
export const parties = new Map<string, any>(); // partyId -> { id, leaderId, members: string[] }
export const activeTrades = new Map<string, any>(); // tradeId -> { id, p1, p2, p1Items, p2Items, p1Gold, p2Gold, p1Locked, p2Locked }
export const dirtyEntities = new Set<string>();
export const dirtyPlayers = new Map<string, Set<string>>(); // socketId -> Set of dirty field names
export const playerLastGridCell = new Map<string, string>(); // socketId -> "x,z"
export const playerKnownEntities = new Map<string, Set<string>>(); // socketId -> Set<entityId>
export const terrainData = new Map<string, { y: number, type: string }>(); // "x,z" -> { y, type }
export const spawnerEntityCounts = new Map<string, number>(); // spawnerId -> count
