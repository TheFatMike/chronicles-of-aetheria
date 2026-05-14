/**
 * @file src/lib/movement/PhysicsEngine.ts
 * @description The core engine for calculating entity movement and physics on the client.
 * Handles velocity updates, friction, gravity, and terrain snapping for smooth motion.
 * @importance Critical: Directly responsible for the responsiveness and "feel" of character movement in the world.
 */
import * as THREE from "three";
import { MovementConfig } from "./types";
import { getInterpolatedHeight } from "../terrainUtils";
import { logger } from "../logger";
import { getFirstCollision, DEFAULT_COLLISION_CONFIG, resolveMovementCollision } from "../../../shared/logic/collision";

export class PhysicsEngine {

  public update(
    pos: THREE.Vector3,
    velocity: THREE.Vector3,
    moveVec: THREE.Vector3,
    isGrounded: { current: boolean },
    delta: number,
    config: MovementConfig,
    terrainData: any,
    meshes: THREE.Object3D[],
    playerMeshes: THREE.Object3D[]
  ): void {
    const { MOVE_SPEED, FRICTION, GRAVITY } = config;

    // 1. Horizontal Movement
    if (isGrounded.current) {
      if (moveVec.lengthSq() > 0) {
        // Snappy ground response
        velocity.x = moveVec.x * MOVE_SPEED;
        velocity.z = moveVec.z * MOVE_SPEED;
      } else {
        // Friction when sliding to a stop
        const stopFriction = FRICTION * 1.5;
        velocity.x -= velocity.x * stopFriction * delta;
        velocity.z -= velocity.z * stopFriction * delta;
        if (Math.abs(velocity.x) < 0.1) velocity.x = 0;
        if (Math.abs(velocity.z) < 0.1) velocity.z = 0;
      }
    } else {
      // Air control (Increased for WoW-like responsiveness)
      const airAccel = 75;
      velocity.x += moveVec.x * airAccel * delta;
      velocity.z += moveVec.z * airAccel * delta;
      
      const horizontalVel = new THREE.Vector2(velocity.x, velocity.z);
      if (horizontalVel.length() > MOVE_SPEED) {
        horizontalVel.setLength(MOVE_SPEED);
        velocity.x = horizontalVel.x;
        velocity.z = horizontalVel.y;
      }
    }

    // 2. Gravity (Disabled in Editor for "Fly" mode)
    if (!config.isEditorOpen) {
      velocity.y -= GRAVITY * delta;
      if (velocity.y < -50) velocity.y = -50;
    } else {
      // Vertical Movement in Editor
      if (moveVec.y !== 0) {
        velocity.y = moveVec.y * MOVE_SPEED;
      } else {
        velocity.y -= velocity.y * FRICTION * 5 * delta;
        if (Math.abs(velocity.y) < 0.1) velocity.y = 0;
      }
    }

    // 3. Move Position with Collision Check
    // We use the centralized shared logic for horizontal movement and wall sliding
    const resolution = resolveMovementCollision(pos, velocity, delta, meshes, {
      ...DEFAULT_COLLISION_CONFIG,
      ignoredNames: [...DEFAULT_COLLISION_CONFIG.ignoredNames, ...playerMeshes.map(m => m.name)]
    });

    // Update position from resolution (handles horizontal + steps)
    pos.copy(resolution.position);
    
    // Apply vertical movement (Gravity/Jump) which isn't handled by the horizontal resolver
    pos.y += velocity.y * delta;
    
    // Update velocity (might have been modified by sliding)
    velocity.x = resolution.velocity.x;
    velocity.z = resolution.velocity.z;

    // 4. Ground Detection
    if (config.isEditorOpen) {
      isGrounded.current = false;
      return;
    }

    let groundHeight = -100;
    
    // A. Terrain Height
    if (terrainData) {
      const h = getInterpolatedHeight(pos.x, pos.z, terrainData);
      if (h !== null) groundHeight = h;
    }

    let groundNormal = new THREE.Vector3(0, 1, 0);
    
    // B. Object Height (Nearby Only)
    // We start the ray at waist height (0.8m) to avoid hitting ceilings in interiors
    const rayOrigin = new THREE.Vector3(pos.x, pos.y + 0.8, pos.z);
    const rayDir = new THREE.Vector3(0, -1, 0);
    const hit = getFirstCollision(rayOrigin, rayDir, meshes, 2.0, {
      ...DEFAULT_COLLISION_CONFIG,
      ignoredNames: [...DEFAULT_COLLISION_CONFIG.ignoredNames, "terrain_chunk", ...playerMeshes.map(m => m.name)]
    });

    if (hit) {
      // Only use the object height if it's actually higher than the terrain
      const isTerrain = hit.object.name.includes("terrain");
      if (!isTerrain) {
        const MAX_STEP_HEIGHT = 0.5;
        const heightDiff = hit.point.y - pos.y;
        
        if (heightDiff <= MAX_STEP_HEIGHT) {
          if (hit.point.y > groundHeight) {
            groundHeight = hit.point.y;
            groundNormal.copy(hit.normal);
          }
        }
      }
    }
    
    // 5. Slope Handling & Sliding
    const SLOPE_LIMIT = 0.7; // Approx 45 degrees. Higher = stricter.
    const isTooSteep = groundNormal.y < SLOPE_LIMIT;

    // 6. Resolution
    const SNAP_THRESHOLD = 0.5; 
    
    // Snap to ground if close enough. 
    // We only snap if we are falling or standing still (velocity.y <= 0)
    if (velocity.y <= 0 && pos.y <= groundHeight + SNAP_THRESHOLD && !isTooSteep) {
      pos.y = groundHeight;
      velocity.y = 0;
      isGrounded.current = true;
    } else {
      isGrounded.current = false;
      
      // Apply sliding force if on a steep slope
      if (isTooSteep && pos.y <= groundHeight + 0.1) {
        const slideStrength = 15;
        velocity.x += groundNormal.x * slideStrength * delta;
        velocity.z += groundNormal.z * slideStrength * delta;
        // Also push down slightly to ensure we stay 'on' the slope while sliding
        velocity.y -= 5 * delta; 
      }
    }

    // Void Recovery
    if (pos.y < -500) {
      logger.warn("physics", "Recovering from void", { pos });
      pos.set(0, 5, 0);
      velocity.set(0, 0, 0);
    }
  }
}
