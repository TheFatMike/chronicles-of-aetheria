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
  private _tempVec = new THREE.Vector3();
  private _rayDir = new THREE.Vector3(0, -1, 0);

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
    const clampedDelta = Math.min(delta, 0.1);
    
    // 1. Dynamic Water Detection
    let waterLevel = -Infinity;
    let isSwimming = false;

    // A. Check terrain data (localized basins)
    if (terrainData) {
      const tx = Math.round(pos.x / 2) * 2;
      const tz = Math.round(pos.z / 2) * 2;
      const point = terrainData[`${tx}_${tz}`];
      if (point && point.waterLevel !== undefined && point.waterLevel > -500) {
        if (pos.y < point.waterLevel) {
          isSwimming = true;
          waterLevel = point.waterLevel;
        }
      }
    }

    // B. Check meshes (Water Planes)
    if (!isSwimming) {
      for (const mesh of meshes) {
        if (mesh.userData?.isWater) {
          const worldPos = this._tempVec.setFromMatrixPosition(mesh.matrixWorld);
          const scale = mesh.scale;
          const dx = Math.abs(pos.x - worldPos.x);
          const dz = Math.abs(pos.z - worldPos.z);
          
          if (dx < scale.x / 2 && dz < scale.z / 2) {
            if (pos.y < worldPos.y) {
              isSwimming = true;
              waterLevel = Math.max(waterLevel, worldPos.y);
            }
          }
        }
      }
    }

    // 2. Calculate Horizontal & Vertical Velocity
    this.applyInputVelocity(velocity, moveVec, isGrounded.current, isSwimming, clampedDelta, config);
    this.applyGravity(velocity, moveVec, isSwimming, clampedDelta, config);

    // 3. Resolve Collisions & Steps (Horizontal + Climb)
    const resolution = resolveMovementCollision(pos, velocity, clampedDelta, meshes, {
      ...DEFAULT_COLLISION_CONFIG,
      ignoredNames: [...DEFAULT_COLLISION_CONFIG.ignoredNames, ...playerMeshes.map(m => m.name)]
    });

    // Sync position and horizontal velocity from resolver
    pos.copy(resolution.position);
    pos.y += velocity.y * clampedDelta; // Apply gravity separately
    velocity.x = resolution.velocity.x;
    velocity.z = resolution.velocity.z;

    // 4. Ground Detection & Snapping
    if (!config.isEditorOpen) {
      this.resolveGrounding(pos, velocity, isGrounded, isSwimming, meshes, playerMeshes, terrainData, clampedDelta);
    } else {
      isGrounded.current = false;
    }

    // 5. Void Recovery
    if (pos.y < -500) {
      logger.warn("physics", "Recovering from void", { pos });
      pos.set(0, 5, 0);
      velocity.set(0, 0, 0);
    }
  }

  private applyInputVelocity(velocity: THREE.Vector3, moveVec: THREE.Vector3, isGrounded: boolean, isSwimming: boolean, delta: number, config: MovementConfig) {
    const { MOVE_SPEED, FRICTION } = config;
    const speed = isSwimming ? MOVE_SPEED * 0.6 : MOVE_SPEED;

    if (isGrounded && !isSwimming) {
      if (moveVec.lengthSq() > 0) {
        // Snappy ground response
        velocity.x = moveVec.x * speed;
        velocity.z = moveVec.z * speed;
      } else {
        // Friction when sliding to a stop
        const stopFriction = FRICTION * 1.5;
        velocity.x -= velocity.x * stopFriction * delta;
        velocity.z -= velocity.z * stopFriction * delta;
        if (Math.abs(velocity.x) < 0.1) velocity.x = 0;
        if (Math.abs(velocity.z) < 0.1) velocity.z = 0;
      }
    } else {
      // Air or Water control
      const accel = isSwimming ? 25 : 75;
      velocity.x += moveVec.x * accel * delta;
      velocity.z += moveVec.z * accel * delta;
      
      // Apply drag in water or air
      const drag = isSwimming ? 5 : 2;
      velocity.x -= velocity.x * drag * delta;
      velocity.z -= velocity.z * drag * delta;

      const horizontalVel = new THREE.Vector2(velocity.x, velocity.z);
      if (horizontalVel.length() > speed) {
        horizontalVel.setLength(speed);
        velocity.x = horizontalVel.x;
        velocity.z = horizontalVel.y;
      }
    }
  }

  private applyGravity(velocity: THREE.Vector3, moveVec: THREE.Vector3, isSwimming: boolean, delta: number, config: MovementConfig) {
    if (config.isEditorOpen) {
      // Free-fly vertical movement in editor
      if (moveVec.y !== 0) {
        velocity.y = moveVec.y * config.MOVE_SPEED;
      } else {
        velocity.y -= velocity.y * config.FRICTION * 5 * delta;
        if (Math.abs(velocity.y) < 0.1) velocity.y = 0;
      }
    } else if (isSwimming) {
      // Buoyancy: Neutralize some gravity
      const buoyancy = config.GRAVITY * 0.9;
      velocity.y -= (config.GRAVITY - buoyancy) * delta;

      // Vertical Swimming (Up with Jump, Down with... maybe future key, for now just float up)
      if (moveVec.y > 0) {
        velocity.y += 15 * delta;
      }

      // Water Drag (Vertical)
      velocity.y -= velocity.y * 3 * delta;
      if (velocity.y < -5) velocity.y = -5;
      if (velocity.y > 8) velocity.y = 8;
    } else {
      velocity.y -= config.GRAVITY * delta;
      if (velocity.y < -50) velocity.y = -50;
    }
  }

  private resolveGrounding(
    pos: THREE.Vector3,
    velocity: THREE.Vector3,
    isGrounded: { current: boolean },
    isSwimming: boolean,
    meshes: THREE.Object3D[],
    playerMeshes: THREE.Object3D[],
    terrainData: any,
    delta: number
  ) {
    let groundHeight = -100;
    let groundNormal = new THREE.Vector3(0, 1, 0);

    // 1. Initial Terrain Height from data (as baseline)
    if (terrainData) {
      const h = getInterpolatedHeight(pos.x, pos.z, terrainData);
      if (h !== null) groundHeight = h;
    }

    // 2. Precise Object/Terrain Detection via Raycast
    const rayOrigin = this._tempVec.set(pos.x, pos.y + 0.8, pos.z);
    const hit = getFirstCollision(rayOrigin, this._rayDir, meshes, 2.0, {
      ...DEFAULT_COLLISION_CONFIG,
      ignoredNames: [...DEFAULT_COLLISION_CONFIG.ignoredNames, ...playerMeshes.map(m => m.name)]
    });

    if (hit) {
      const MAX_STEP_HEIGHT = 0.5;
      const heightDiff = hit.point.y - pos.y;
      
      // If we hit something low enough to stand on (including terrain chunks)
      if (heightDiff <= MAX_STEP_HEIGHT) {
        if (hit.point.y > groundHeight) {
          groundHeight = hit.point.y;
          groundNormal.copy(hit.normal);
        }
      }
    }

    // 3. Slope Handling & Snapping
    const isTooSteep = groundNormal.y < DEFAULT_COLLISION_CONFIG.maxSlopeY;
    const SNAP_THRESHOLD = 0.5; 
    
    if (velocity.y <= 0 && pos.y <= groundHeight + SNAP_THRESHOLD && !isTooSteep && !isSwimming) {
      // On Ground (only snap if NOT swimming deep)
      pos.y = groundHeight;
      velocity.y = 0;
      isGrounded.current = true;
    } else if (isSwimming && pos.y <= groundHeight + 0.1) {
      // Touching bottom while swimming
      pos.y = groundHeight;
      velocity.y = Math.max(0, velocity.y);
      isGrounded.current = true;
    } else {
      // In Air or Sliding
      isGrounded.current = false;
      
      if (isTooSteep && pos.y <= groundHeight + 0.1) {
        // Slide down steep slopes
        const slideStrength = 15;
        velocity.x += groundNormal.x * slideStrength * delta;
        velocity.z += groundNormal.z * slideStrength * delta;
        velocity.y -= 5 * delta; // Stay pinned to slope
      }
    }
  }
}
