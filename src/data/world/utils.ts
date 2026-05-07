import { WorldObject, WorldObjectType } from "../../types";
import { OBJECT_TEMPLATES } from "./templates";

let idCounter = 0;

/**
 * Creates a world object with sensible defaults from templates
 */
export function createObject(
  type: WorldObjectType, 
  pos: [number, number, number], 
  rot: [number, number, number] = [0, 0, 0], 
  scale?: number,
  customId?: string
): WorldObject {
  const template = OBJECT_TEMPLATES[type] || { scale: 1 };
  
  return {
    id: customId || `${type}-${Date.now()}-${idCounter++}`,
    type,
    pos,
    rot,
    scale: scale ?? template.scale,
  };
}

/**
 * Creates a cluster of objects around a central point
 */
export function createCluster(
  type: WorldObjectType,
  count: number,
  center: [number, number, number],
  radius: number,
  scaleRange: [number, number] = [0.8, 1.2]
): WorldObject[] {
  const objects: WorldObject[] = [];
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const x = center[0] + Math.cos(angle) * dist;
    const z = center[2] + Math.sin(angle) * dist;
    
    const scale = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
    const rot: [number, number, number] = [0, Math.random() * Math.PI * 2, 0];
    
    objects.push(createObject(type, [x, center[1], z], rot, scale));
  }
  
  return objects;
}
