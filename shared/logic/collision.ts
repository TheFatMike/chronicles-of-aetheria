/**
 * @file shared/logic/collision.ts
 * @description Shared collision detection and resolution logic for client and server.
 * Uses THREE.js raycasting to provide consistent physics across both environments.
 */

import * as THREE from 'three';

export interface CollisionResult {
  hit: boolean;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  object: THREE.Object3D;
}

export interface CollisionConfig {
  radius: number;
  heightOffset: number;
  maxSlopeY: number;
  stepHeight: number;
  ignoredNames: string[];
}

export const DEFAULT_COLLISION_CONFIG: CollisionConfig = {
  radius: 0.5,
  heightOffset: 0.5,
  maxSlopeY: 0.6,
  stepHeight: 0.5,
  ignoredNames: ["editor_helper", "trigger", "spawn_point", "helper", "wireframe", "selection_hitbox", "interaction_hitbox"]
};

// Shared reusable objects to avoid GC pressure
const _raycaster = new THREE.Raycaster();
_raycaster.params.Mesh.side = THREE.DoubleSide;
const _tempOrigin = new THREE.Vector3();
const _tempDir = new THREE.Vector3();
const _tempNormal = new THREE.Vector3();
const _normalMatrix = new THREE.Matrix3();

/**
 * Checks if a specific object should be ignored for collision.
 */
export function isIgnored(obj: THREE.Object3D | null, ignoredNames: string[] = DEFAULT_COLLISION_CONFIG.ignoredNames): boolean {
  let current = obj;
  while (current) {
    if (current.userData?.isTrigger || current.userData?.isGhost) return true;
    if (current.userData?.isSolid === false || current.userData?.isCollidable === false) return true;
    
    // Ignore objects with wireframe materials (often debug/helpers)
    if ((current as any).material?.wireframe) return true;

    const name = (current.name || "").toLowerCase();
    for (const ignored of ignoredNames) {
      if (!ignored || ignored.trim() === "") continue;
      if (name.includes(ignored.toLowerCase())) return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Utility to collect all meshes from a set of groups/objects.
 */
export function collectMeshes(objects: THREE.Object3D[]): THREE.Object3D[] {
  const meshes: THREE.Object3D[] = [];
  objects.forEach(obj => {
    // If we have cached meshes on the object (provided by usePlayerMovement scan), use them
    if ((obj as any)._cachedMeshes) {
      for (const m of (obj as any)._cachedMeshes) {
        meshes.push(m);
      }
    } else if ((obj as any).isMesh) {
      meshes.push(obj);
    } else {
      // Fallback to traversal if no cache
      obj.traverse(child => {
        if ((child as any).isMesh) {
          meshes.push(child);
        }
      });
    }
  });
  return meshes;
}

/**
 * Perform a single raycast check against a pre-collected set of meshes.
 */
export function getFirstCollision(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  meshes: THREE.Object3D[],
  range: number,
  config: CollisionConfig = DEFAULT_COLLISION_CONFIG
): CollisionResult | null {
  _raycaster.set(origin, direction);
  _raycaster.far = range;

  const intersects = _raycaster.intersectObjects(meshes, true);

  for (const hit of intersects) {
    if (isIgnored(hit.object, config.ignoredNames)) {
      continue;
    }

    // Check face normal to get a robust normal
    if (hit.face) {
      _normalMatrix.getNormalMatrix(hit.object.matrixWorld);
      _tempNormal.copy(hit.face.normal).applyMatrix3(_normalMatrix).normalize();
    } else {
      _tempNormal.set(0, 0, 1);
    }

    return {
      hit: true,
      point: hit.point.clone(),
      normal: _tempNormal.clone(),
      distance: hit.distance,
      object: hit.object
    };
  }

  return null;
}

/**
 * Resolves sliding collision and step climbing for a moving entity.
 * This is the central source of truth for movement physics.
 */
export function resolveMovementCollision(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  delta: number,
  collidables: THREE.Object3D[],
  config: CollisionConfig = DEFAULT_COLLISION_CONFIG
): { position: THREE.Vector3; velocity: THREE.Vector3; hit: boolean; stepped: boolean } {
  const resultPos = position.clone();
  const resultVel = velocity.clone();
  let hasHit = false;
  let hasStepped = false;

  // Only check horizontal movement for collision resolution (y is handled by gravity/snapping)
  const horizontalMove = new THREE.Vector3(resultVel.x * delta, 0, resultVel.z * delta);
  const moveDist = horizontalMove.length();
  
  if (moveDist < 0.001) {
    return { position: resultPos, velocity: resultVel, hit: false, stepped: false };
  }

  const moveDir = horizontalMove.clone().normalize();
  const meshes = collectMeshes(collidables);

  // 1. Step Climbing Logic
  // Check if there is an obstacle at leg height (waist height is too high for stepping)
  const STEP_CHECK_HEIGHT = config.stepHeight + 0.1;
  const WAIST_HEIGHT = 0.7; // Lowered from 1.0 to catch short props like wells and barrels
  
  // Cast at waist height to see if we hit a WALL
  _tempOrigin.set(position.x, position.y + WAIST_HEIGHT, position.z);
  const wallHit = getFirstCollision(_tempOrigin, moveDir, meshes, moveDist + config.radius, config);

  // Cast at lower height to see if we hit a STEP
  _tempOrigin.set(position.x, position.y + 0.1, position.z);
  const stepHit = getFirstCollision(_tempOrigin, moveDir, meshes, moveDist + config.radius, config);

  if (stepHit && !wallHit) {
    // We hit something low but NOT something high -> Possible step!
    // Try to "teleport" up and move forward
    _tempOrigin.set(position.x, position.y + config.stepHeight + 0.05, position.z);
    const clearHit = getFirstCollision(_tempOrigin, moveDir, meshes, moveDist + config.radius, config);
    
    if (!clearHit) {
      // Space is clear above the step!
      resultPos.y += config.stepHeight * 0.5; // Lift up slightly to help the snap logic
      hasStepped = true;
      // We don't modify horizontal resultPos yet, let it move naturally below
    }
  }

  // 2. Wall Collision & Sliding
  // Re-check collision at waist height with updated position (potentially lifted by step)
  _tempOrigin.set(resultPos.x, resultPos.y + WAIST_HEIGHT, resultPos.z);
  let finalHit = getFirstCollision(_tempOrigin, moveDir, meshes, moveDist + config.radius, config);

  // If we didn't hit at waist height, but we DID hit at step height and couldn't climb it,
  // then it's still a wall! (e.g. a short fence or low rock)
  if (!finalHit && stepHit && !hasStepped) {
    finalHit = stepHit;
  }

  if (finalHit) {
    hasHit = true;
    
    // Slide velocity along the wall normal
    const dot = resultVel.x * finalHit.normal.x + resultVel.z * finalHit.normal.z;
    resultVel.x -= finalHit.normal.x * dot;
    resultVel.z -= finalHit.normal.z * dot;

    // Adjust movement based on slide
    resultPos.x += resultVel.x * delta;
    resultPos.z += resultVel.z * delta;

    // Push out slightly to prevent tunneling
    const pushOut = (moveDist + config.radius) - finalHit.distance;
    resultPos.x += finalHit.normal.x * pushOut * 0.5;
    resultPos.z += finalHit.normal.z * pushOut * 0.5;
  } else {
    // Free movement
    resultPos.x += resultVel.x * delta;
    resultPos.z += resultVel.z * delta;
  }

  return { position: resultPos, velocity: resultVel, hit: hasHit, stepped: hasStepped };
}

/**
 * Performs a soft pushback from nearby static objects.
 * Refactored to be less "teleporty" and more stable.
 */
export function resolveOverlap(
  position: THREE.Vector3,
  radius: number,
  collidables: THREE.Object3D[],
  config: CollisionConfig = DEFAULT_COLLISION_CONFIG
): THREE.Vector3 {
  const resolved = position.clone();
  const meshes = collectMeshes(collidables);
  if (meshes.length === 0) return resolved;

  const OVERLAP_HEIGHT = 1.0;
  _tempOrigin.set(resolved.x, resolved.y + OVERLAP_HEIGHT, resolved.z);

  // Check 4 cardinal directions and 4 diagonals
  const directions = [
    [1,0,0], [-1,0,0], [0,0,1], [0,0,-1],
    [0.7,0,0.7], [-0.7,0,0.7], [0.7,0,-0.7], [-0.7,0,-0.7]
  ];

  for (const [dx, dy, dz] of directions) {
    _tempDir.set(dx, dy, dz);
    const hit = getFirstCollision(_tempOrigin, _tempDir, meshes, radius, config);
    if (hit) {
      const overlap = radius - hit.distance;
      // Gently push back (using a factor to avoid jitter in corners)
      resolved.x -= dx * overlap * 0.3;
      resolved.z -= dz * overlap * 0.3;
      
      // Update origin for next direction check
      _tempOrigin.set(resolved.x, resolved.y + OVERLAP_HEIGHT, resolved.z);
    }
  }

  return resolved;
}

