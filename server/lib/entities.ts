/**
 * @file server/lib/entities.ts
 * @description Utility functions for managing and initializing game entities on the server.
 * Handles the creation of NPC and enemy instances based on world object data and templates.
 * @importance Essential: Orchestrates the instantiation and initial configuration of all world actors.
 */
import { ENTITY_TEMPLATES } from "../data/entityTemplates";
import { calculateMaxHP, calculateMaxMP } from "../../shared/logic/gameRules";

export function createNPCEntity(id: string, worldObjectId: string | null, type: string, pos: [number, number, number], rot: [number, number, number], metadata?: any) {
  const npcKey = type.replace('npc_', '');
  const template = ENTITY_TEMPLATES[npcKey] || Object.values(ENTITY_TEMPLATES)[0];
  const stats = template.baseStats || { strength: 5, dexterity: 5, wisdom: 5, intelligence: 5, stamina: 10 };
  const maxHp = calculateMaxHP(stats);
  const maxMp = calculateMaxMP(stats);

  return {
    ...template,
    id,
    worldObjectId,
    entityClass: template.id,
    name: metadata?.name || template.name,
    type: template.type || 'npc',
    class: metadata?.role || template.class,
    color: metadata?.color || template.color,
    level: metadata?.level || template.level || (template.id === 'instructor_kael' ? 100 : 1),
    expReward: template.expReward || 0,
    pos: [...pos],
    homePos: [...pos],
    rot: [...rot],
    hp: maxHp,
    maxHp: maxHp,
    mp: maxMp,
    maxMp: maxMp,
    stats: stats,
    isMoving: false,
    aiState: 'IDLE',
    behaviorType: template.behaviorType || (template.type === 'enemy' ? 'aggressive' : 'neutral'),
    agroRange: template.aggroRadius || 15,
    chaseDistance: template.leashRadius || 40,
    minDamage: template.minDamage || 1,
    maxDamage: template.maxDamage || 2,
    attackSpeed: template.attackSpeed || 2.0,
    lastUpdate: Date.now()
  };
}
