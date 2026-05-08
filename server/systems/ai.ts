import { entities, worldObjects } from "../state";
import { checkWorldCollision } from "./spatial";

export const updateEntityAI = (tickTime: number) => {
  for (const entity of entities.values()) {
    const speed = entity.stats.moveSpeed * (tickTime / 1000);
    
    const moveWithCollision = (dx: number, dz: number, s: number) => {
      const mag = Math.sqrt(dx*dx + dz*dz);
      if (mag < 0.01) return;
      const nx = (dx/mag) * s;
      const nz = (dz/mag) * s;
      const nextPos: [number, number, number] = [entity.pos[0] + nx, 0, entity.pos[2] + nz];
      
      if (!checkWorldCollision(nextPos, 0.5)) {
        entity.pos = nextPos;
      } else {
         // Basic sliding for AI
         const tryX: [number, number, number] = [entity.pos[0] + nx, 0, entity.pos[2]];
         const tryZ: [number, number, number] = [entity.pos[0], 0, entity.pos[2] + nz];
         if (!checkWorldCollision(tryX, 0.5)) entity.pos = tryX;
         else if (!checkWorldCollision(tryZ, 0.5)) entity.pos = tryZ;
      }
    };

    switch (entity.aiState) {
      case 'IDLE':
        if (Math.random() < 0.05) {
          entity.rot[1] += (Math.random() - 0.5) * 2;
        }
        break;
      case 'CHASE':
        // Logic for chasing target (can be expanded later)
        break;
      case 'RETURN':
        const rdx = entity.homePos[0] - entity.pos[0];
        const rdz = entity.homePos[2] - entity.pos[2];
        const rdSq = rdx*rdx + rdz*rdz;
        if (rdSq < 0.25) { 
          entity.aiState = entity.pathId ? 'PATROL' : 'IDLE';
          entity.isMoving = false;
        } else {
          entity.isMoving = true;
          moveWithCollision(rdx, rdz, speed * 1.5);
        }
        break;
      case 'PATROL': {
        if (!entity.pathId) {
          entity.aiState = 'IDLE';
          break;
        }

        // 1. Get all waypoints for this path
        const waypoints = Array.from(worldObjects.values())
          .filter(obj => obj.type === 'waypoint' && obj.pathId === entity.pathId)
          .sort((a, b) => (Number(a.waypointId) || 0) - (Number(b.waypointId) || 0));

        if (waypoints.length === 0) {
          entity.aiState = 'RETURN';
          break;
        }

        // 2. Target current waypoint
        const targetWP = waypoints[entity.currentWaypointIndex % waypoints.length];
        if (!targetWP) {
          entity.currentWaypointIndex = 0;
          break;
        }

        const wdx = targetWP.pos[0] - entity.pos[0];
        const wdz = targetWP.pos[2] - entity.pos[2];
        const wdSq = wdx*wdx + wdz*wdz;

        if (wdSq < 0.25) {
          // Reached waypoint, move to next
          entity.currentWaypointIndex = (entity.currentWaypointIndex + 1) % waypoints.length;
          entity.isMoving = false;
        } else {
          entity.isMoving = true;
          // Rotate towards target
          entity.rot[1] = Math.atan2(wdx, wdz);
          moveWithCollision(wdx, wdz, speed);
        }
        break;
      }
    }
  }
};
