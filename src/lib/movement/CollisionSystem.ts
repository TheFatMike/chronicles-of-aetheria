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

    // Zero-GC setup
    this.tempOrigin.set(pos.x, pos.y + 1.2, pos.z);
    this.tempDir.copy(dir).normalize();
    
    this.raycaster.set(this.tempOrigin, this.tempDir);
    this.raycaster.far = rayLength;
    
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
    this.tempOrigin.set(pos.x, pos.y + 0.8, pos.z);
    
    // Check X
    this.tempDir.set(velocity.x > 0 ? 1 : -1, 0, 0);
    if (this.checkSpecificRay(this.tempOrigin, this.tempDir, collidables, playerMeshes)) {
      velocity.x = 0;
    }

    // Check Z
    this.tempDir.set(0, 0, velocity.z > 0 ? 1 : -1);
    if (this.checkSpecificRay(this.tempOrigin, this.tempDir, collidables, playerMeshes)) {
      velocity.z = 0;
    }
  }

  private checkSpecificRay(origin: THREE.Vector3, dir: THREE.Vector3, collidables: THREE.Object3D[], playerMeshes: THREE.Object3D[]): boolean {
    this.raycaster.set(origin, dir);
    this.raycaster.far = 0.4;
    
    const intersects = this.raycaster.intersectObjects(collidables, true);
    for (const hit of intersects) {
      if (this.isIgnored(hit.object, playerMeshes)) continue;
      if (hit.face) {
        this.normalMatrix.getNormalMatrix(hit.object.matrixWorld);
        this.tempNormal.copy(hit.face.normal).applyMatrix3(this.normalMatrix).normalize();
        if (this.tempNormal.y > 0.5) continue;
      }
      return true;
    }
    return false;
  }

  private isIgnored(obj: THREE.Object3D, playerMeshes: THREE.Object3D[]): boolean {
    if (playerMeshes.includes(obj)) return true;
    const name = obj.name || "";
    if ((obj as any).material?.wireframe) return true;
    if (name.includes("editor_helper")) return true;
    if (name === "floor_plane" || name === "starting_plaza") return true;
    return false;
  }
}
