/**
 * @file src/lib/movement/CameraManager.ts
 * @description Manages the behavior and positioning of the 3D game camera.
 * Handles camera following, smoothing, and state transitions between different view modes.
 * @importance Essential: Vital for providing a stable and pleasant visual perspective for the player.
 */
import * as THREE from "three";
import { CameraState } from "@shared/types";
import { getFirstCollision, DEFAULT_COLLISION_CONFIG } from "../../../shared/logic/collision";

export class CameraManager {
  private targetCamPos = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();
  private tempVec = new THREE.Vector3();

  public update(
    camera: THREE.Camera,
    state: CameraState,
    playerPos: THREE.Vector3,
    delta: number,
    meshes: THREE.Object3D[],
    playerMeshes: THREE.Object3D[]
  ): void {
    const { theta, phi, radius } = state;
    
    // Calculate offsets based on standard spherical coordinates
    const offsetX = radius * Math.sin(phi) * Math.sin(theta);
    const offsetY = radius * Math.cos(phi);
    const offsetZ = radius * Math.sin(phi) * Math.cos(theta);

    // Smooth Look Target (Player Head)
    const lerpFactor = 1 - Math.exp(-20 * delta);
    this.tempVec.set(playerPos.x, playerPos.y + 1.6, playerPos.z);
    this.lookTarget.lerp(this.tempVec, lerpFactor);

    // Calculate Ideal Camera Position
    this.targetCamPos.set(
      playerPos.x + offsetX,
      playerPos.y + offsetY + 1.6,
      playerPos.z + offsetZ
    );

    // Camera Collision Detection (Spring Arm)
    const direction = this.tempVec.copy(this.targetCamPos).sub(this.lookTarget);
    const rayDist = direction.length();
    direction.normalize();
    
    const hit = getFirstCollision(this.lookTarget, direction, meshes, rayDist, {
      ...DEFAULT_COLLISION_CONFIG,
      ignoredNames: [...DEFAULT_COLLISION_CONFIG.ignoredNames, ...playerMeshes.map(m => m.name)]
    });

    if (hit) {
      // Push camera forward slightly from hit point
      this.targetCamPos.copy(hit.point).add(direction.multiplyScalar(-0.3));
    }
    
    // Butter smooth frame-rate independent lerp
    camera.position.lerp(this.targetCamPos, lerpFactor);
    camera.lookAt(this.lookTarget);
  }
}

