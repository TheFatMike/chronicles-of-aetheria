import * as THREE from "three";
import { logger } from "../logger";

export class CollisionSystem {
  private normalMatrix = new THREE.Matrix3();
  private raycaster = new THREE.Raycaster();
  private tempOrigin = new THREE.Vector3();
  private tempDir = new THREE.Vector3();
  private tempNormal = new THREE.Vector3();

  public checkWallCollision(
    pos: THREE.Vector3,
    dir: THREE.Vector3,
    collidables: THREE.Object3D[],
    playerMeshes: THREE.Object3D[],
    rayLength: number = 0.4
  ): boolean {
    if (dir.lengthSq() < 0.001) return false;

    // Chest height for wall detection
    this.tempOrigin.set(pos.x, pos.y + 1.0, pos.z);
    this.tempDir.copy(dir).normalize();
    
    this.raycaster.set(this.tempOrigin, this.tempDir);
    this.raycaster.far = rayLength; // 0.6 is safer for pillars
    
    const intersects = this.raycaster.intersectObjects(collidables, true);

    for (const hit of intersects) {
      if (this.isIgnored(hit.object, playerMeshes)) continue;

      if (hit.face) {
        this.normalMatrix.getNormalMatrix(hit.object.matrixWorld);
        this.tempNormal.copy(hit.face.normal).applyMatrix3(this.normalMatrix).normalize();
        if (this.tempNormal.y > 0.3) continue; // Walkable slope
      }

      logger.debug("physics", `Wall collision: ${hit.object.name || 'unnamed'}`, { point: hit.point });
      return true;
    }
    return false;
  }

  public resolveSliding(
    pos: THREE.Vector3,
    velocity: THREE.Vector3,
    collidables: THREE.Object3D[],
    playerMeshes: THREE.Object3D[]
  ): void {
    if (velocity.lengthSq() < 0.001) return;

    // 1. Predictive Check: Where are we going?
    const checkHeights = [0.4, 1.2];
    const collisionMargin = 0.5; // Distance to keep away from walls

    for (const h of checkHeights) {
      this.tempOrigin.set(pos.x, pos.y + h, pos.z);
      
      // Predict X Collision
      if (Math.abs(velocity.x) > 0) {
        this.tempDir.set(velocity.x > 0 ? 1 : -1, 0, 0);
        const hit = this.getHit(this.tempOrigin, this.tempDir, collidables, playerMeshes, collisionMargin);
        if (hit) {
          // Push back slightly from the hit point to prevent jitter
          pos.x = hit.point.x - (this.tempDir.x * collisionMargin);
          velocity.x = 0;
        }
      }

      // Predict Z Collision
      if (Math.abs(velocity.z) > 0) {
        this.tempDir.set(0, 0, velocity.z > 0 ? 1 : -1);
        const hit = this.getHit(this.tempOrigin, this.tempDir, collidables, playerMeshes, collisionMargin);
        if (hit) {
          pos.z = hit.point.z - (this.tempDir.z * collisionMargin);
          velocity.z = 0;
        }
      }
    }
  }

  private getHit(origin: THREE.Vector3, dir: THREE.Vector3, collidables: THREE.Object3D[], playerMeshes: THREE.Object3D[], range: number) {
    this.raycaster.set(origin, dir);
    this.raycaster.far = range;
    
    const intersects = this.raycaster.intersectObjects(collidables, true);
    for (const hit of intersects) {
      if (this.isIgnored(hit.object, playerMeshes)) continue;
      
      // If we hit a floor/slope, only block if it's steep
      if (hit.face) {
        this.normalMatrix.getNormalMatrix(hit.object.matrixWorld);
        this.tempNormal.copy(hit.face.normal).applyMatrix3(this.normalMatrix).normalize();
        if (this.tempNormal.y > 0.6) continue; // It's a floor/slope we can walk on
      }
      
      return hit;
    }
    return null;
  }

  private isIgnored(obj: THREE.Object3D, playerMeshes: THREE.Object3D[]): boolean {
    if (playerMeshes.includes(obj)) return true;
    const name = obj.name || "";
    if (name.includes("editor_helper")) return true;
    if (name === "starting_plaza" || name === "terrain_mesh") return true;
    // Don't collide with triggers or transparent ghost placement items
    if (obj.userData?.isTrigger) return true;
    return false;
  }
}
