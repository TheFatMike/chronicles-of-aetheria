import { ENTITY_TEMPLATES } from "../data/entityTemplates";
import { calculateMaxHP, calculateMaxMP } from "../../src/lib/gameUtils";

export function createNPCEntity(id: string, worldObjectId: string | null, type: string, pos: [number, number, number], rot: [number, number, number]) {
  const npcKey = type.replace('npc_', '');
  const template = ENTITY_TEMPLATES[npcKey] || ENTITY_TEMPLATES['guard'];
  const stats = template.baseStats;
  const maxHp = calculateMaxHP(stats);
  const maxMp = calculateMaxMP(stats);

  return {
    ...template,
    id,
    worldObjectId,
    name: template.name,
    type: template.type || 'npc',
    class: template.class,
    level: template.id === 'instructor_kael' ? 100 : (template.level || 25),
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
    lastUpdate: Date.now()
  };
}
