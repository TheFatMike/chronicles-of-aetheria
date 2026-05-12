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

export class PhysicsEngine {
  private raycaster = new THREE.Raycaster();
  private rayOrigin = new THREE.Vector3();
  private rayDir = new THREE.Vector3(0, -1, 0);

  public update(
    pos: THREE.Vector3,
    velocity: THREE.Vector3,
    moveVec: THREE.Vector3,
    isGrounded: { current: boolean },
    delta: number,
    config: MovementConfig,
    terrainData: any,
    collidables: THREE.Object3D[],
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
    const nextX = pos.x + velocity.x * delta;
    const nextZ = pos.z + velocity.z * delta;
    const nextY = pos.y + velocity.y * delta;

    pos.x = nextX;
    pos.z = nextZ;
    pos.y = nextY;

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
    
    // B. Object & Terrain Height (Nearby Only)
    this.rayOrigin.set(pos.x, pos.y + 1.5, pos.z); // Start ray higher to catch steep terrain
    this.raycaster.set(this.rayOrigin, this.rayDir);
    this.raycaster.far = 3.0;

    const intersects = this.raycaster.intersectObjects(collidables, true);
    for (const hit of intersects) {
      if (!hit.object.visible || playerMeshes.includes(hit.object)) continue;
      
      const isTerrain = hit.object.userData?.isTerrain;
      const MAX_STEP_HEIGHT = isTerrain ? 1.5 : 0.5;
      const heightDiff = hit.point.y - pos.y;
      
      if (heightDiff > MAX_STEP_HEIGHT) continue;

      if (hit.point.y > groundHeight) {
        groundHeight = hit.point.y;
        if (hit.face) {
          // Calculate world normal
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
          groundNormal.copy(hit.face.normal).applyMatrix3(normalMatrix).normalize();
        }
      }
    }
    
    // 5. Slope Handling & Sliding
    const SLOPE_LIMIT = 0.7; // Approx 45 degrees. Higher = stricter.
    const isTooSteep = groundNormal.y < SLOPE_LIMIT;

    // 6. Resolution
    const SNAP_THRESHOLD = 0.5; 
    
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
