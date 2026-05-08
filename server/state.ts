export const players = new Map<string, any>();
export const entities = new Map<string, any>();
export const spawners = new Map<string, any>();
export const worldObjects = new Map<string, any>();
export const logoutTimers = new Map<string, NodeJS.Timeout>();
export const lastSkillUse = new Map<string, Record<string, number>>(); // socketId -> { skillId: timestamp }
export const lastChatMessage = new Map<string, number>(); // socketId -> timestamp
export const parties = new Map<string, any>(); // partyId -> { id, leaderId, members: string[] }
