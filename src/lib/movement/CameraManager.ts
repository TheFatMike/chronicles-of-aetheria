import * as THREE from "three";
import { CameraState } from "./types";

export class CameraManager {
  private targetCamPos = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();
  private tempVec = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();

  public update(
    camera: THREE.Camera,
    state: CameraState,
    playerPos: THREE.Vector3,
    delta: number,
    collidables: THREE.Object3D[],
    playerMeshes: THREE.Object3D[]
  ): void {
    const { theta, phi, radius } = state;
    
    // Calculate offsets based on standard spherical coordinates
    // Phi = Angle from Y-axis (top)
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
    this.tempVec.copy(this.targetCamPos).sub(this.lookTarget);
    const rayDist = this.tempVec.length();
    this.tempVec.normalize();
    
    this.raycaster.set(this.lookTarget, this.tempVec);
    this.raycaster.far = rayDist;
    
    const intersects = this.raycaster.intersectObjects(collidables, true);
    let finalPos = this.targetCamPos;

    for (const hit of intersects) {
      if (this.isIgnored(hit.object, playerMeshes)) continue;
      // Push camera forward slightly from hit point
      this.targetCamPos.copy(hit.point).add(this.tempVec.multiplyScalar(-0.3));
      break;
    }
    
    // Butter smooth frame-rate independent lerp
    camera.position.lerp(this.targetCamPos, lerpFactor);
    camera.lookAt(this.lookTarget);
  }

  private isIgnored(obj: THREE.Object3D, playerMeshes: THREE.Object3D[]): boolean {
    const name = obj.name || "";
    // Ignore players, helpers, and wireframes for camera collision
    return (
      playerMeshes.includes(obj) || 
      (obj as any).material?.wireframe ||
      name.includes("editor_helper") ||
      name.includes("spawn_point")
    );
  }
}
