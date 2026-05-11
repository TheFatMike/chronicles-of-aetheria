/**
 * @file src/components/Game/EditorCamera.tsx
 * @description Custom camera controller designed specifically for the world editor mode.
 * Allows for free movement, rotation, and zooming to facilitate easy world building.
 * @importance Essential: Provides the necessary perspective and control for efficient environment editing.
 */
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../../store/useGameStore";

export const EditorCamera = () => {
  const { camera, gl } = useThree();
  const isEditorOpen = useGameStore(state => state.isEditorOpen);
  const isTransforming = useGameStore(state => state.isTransforming);
  
  const velocity = useRef(new THREE.Vector3());
  const keys = useRef<{ [key: string]: boolean }>({});
  
  const lookAtTarget = useRef(new THREE.Vector3());
  const currentPos = useRef(new THREE.Vector3());
  
  const mouseState = useRef({
    theta: 0,
    phi: Math.PI / 3,
    isMouseDown: false
  });

  // Scratch objects for zero-GC frame updates
  const scratchVec1 = useRef(new THREE.Vector3());
  const scratchVec2 = useRef(new THREE.Vector3());
  const scratchEuler = useRef(new THREE.Euler());
  const scratchQuat = useRef(new THREE.Quaternion());

  // Initial setup when opening editor
  useEffect(() => {
    if (isEditorOpen) {
      currentPos.current.copy(camera.position);
      // Try to find a reasonable look-at point (ground in front of player)
      const forward = scratchVec1.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
      lookAtTarget.current.copy(camera.position).add(forward.multiplyScalar(10));
      
      // Calculate initial theta/phi from current rotation
      const euler = scratchEuler.current.setFromQuaternion(camera.quaternion, 'YXZ');
      mouseState.current.theta = euler.y;
      mouseState.current.phi = Math.PI/2 - euler.x;
    }
  }, [isEditorOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => (keys.current[e.code] = false);
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        mouseState.current.isMouseDown = true;
        gl.domElement.requestPointerLock();
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        mouseState.current.isMouseDown = false;
        document.exitPointerLock();
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === gl.domElement) {
        mouseState.current.theta -= e.movementX * 0.003;
        // Flip look direction (mouse down = look down)
        mouseState.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, mouseState.current.phi + e.movementY * 0.003));
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const zoomSpeed = keys.current["ShiftLeft"] ? 5 : 2;
      const zoomDir = scratchVec1.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
      currentPos.current.add(zoomDir.multiplyScalar(-e.deltaY * 0.01 * zoomSpeed));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    gl.domElement.addEventListener("mousedown", handleMouseDown);
    gl.domElement.addEventListener("wheel", handleWheel);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      gl.domElement.removeEventListener("mousedown", handleMouseDown);
      gl.domElement.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gl]);

  useFrame((_state, delta) => {
    if (!isEditorOpen) return;

    const speed = keys.current["ShiftLeft"] ? 40 : 15;
    const moveDir = scratchVec1.current.set(0, 0, 0);
    
    if (keys.current["KeyW"]) moveDir.z += 1;
    if (keys.current["KeyS"]) moveDir.z -= 1;
    if (keys.current["KeyA"]) moveDir.x += 1;
    if (keys.current["KeyD"]) moveDir.x -= 1;
    if (keys.current["KeyE"]) moveDir.y += 1;
    if (keys.current["KeyQ"]) moveDir.y -= 1;

    // Focus feature: Press 'F' to snap camera to selected object
    if (keys.current["KeyF"]) {
      const selectedId = useGameStore.getState().selectedWorldObjectId;
      const worldObjects = useGameStore.getState().worldObjects;
      if (selectedId && worldObjects[selectedId]) {
        const obj = worldObjects[selectedId];
        const targetPos = scratchVec2.current.set(...obj.pos);
        const offset = scratchVec1.current.set(5, 5, 5);
        currentPos.current.copy(targetPos).add(offset);
        camera.position.copy(currentPos.current);
        camera.lookAt(targetPos);
        
        const lookDir = targetPos.sub(currentPos.current).normalize();
        mouseState.current.theta = Math.atan2(lookDir.x, lookDir.z);
        mouseState.current.phi = Math.acos(lookDir.y);
        
        keys.current["KeyF"] = false;
        return; // Skip rest of frame to avoid double movement
      }
    }

    // Move relative to camera orientation
    const q = scratchQuat.current.setFromEuler(scratchEuler.current.set(0, mouseState.current.theta, 0));
    moveDir.applyQuaternion(q);
    
    velocity.current.lerp(moveDir.multiplyScalar(speed), 1 - Math.exp(-10 * delta));
    currentPos.current.add(scratchVec2.current.copy(velocity.current).multiplyScalar(delta));

    camera.position.copy(currentPos.current);
    
    const target = scratchVec2.current.set(
      Math.sin(mouseState.current.phi) * Math.sin(mouseState.current.theta),
      Math.cos(mouseState.current.phi),
      Math.sin(mouseState.current.phi) * Math.cos(mouseState.current.theta)
    );
    
    camera.lookAt(scratchVec1.current.copy(currentPos.current).add(target));
  });

  return null;
};
