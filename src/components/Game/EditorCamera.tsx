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
    isMouseDown: false,
    lastX: 0,
    lastY: 0
  });

  // Scratch objects for zero-GC frame updates
  const scratchVec1 = useRef(new THREE.Vector3());
  const scratchVec2 = useRef(new THREE.Vector3());
  const scratchEuler = useRef(new THREE.Euler());
  const scratchQuat = useRef(new THREE.Quaternion());

  // Initial setup when opening editor
  useEffect(() => {
    const state = useGameStore.getState();
    if (state.isEditorOpen) {
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
      const state = useGameStore.getState();
      if (!state.isEditorOpen) return;
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => (keys.current[e.code] = false);

    const handleMouseDown = (e: MouseEvent) => {
      const state = useGameStore.getState();
      if (!state.isEditorOpen || state.isTransforming) return;
      
      // Filter out UI interactions but allow clicking on the background/canvas
      const target = e.target as HTMLElement;
      const isInteractiveUI = target.closest('button, input, select, textarea, .pointer-events-auto');
      
      // If we hit UI that isn't the canvas itself, ignore it for camera control
      if (isInteractiveUI && e.target !== gl.domElement) return;

      if (e.button === 2) {
        mouseState.current.isMouseDown = true;
        mouseState.current.lastX = e.clientX;
        mouseState.current.lastY = e.clientY;
        
        // Request pointer lock for better experience, but rotation will work even if it fails
        if (document.pointerLockElement !== gl.domElement) {
          gl.domElement.requestPointerLock()?.catch(() => {});
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        mouseState.current.isMouseDown = false;
        if (document.pointerLockElement === gl.domElement) {
          document.exitPointerLock();
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const state = useGameStore.getState();
      if (state.isEditorOpen) e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const state = useGameStore.getState();
      if (!state.isEditorOpen || !mouseState.current.isMouseDown || state.isTransforming) return;

      // Use movementX if available (pointer lock), otherwise fallback to clientX delta
      const deltaX = e.movementX !== undefined && document.pointerLockElement === gl.domElement
        ? e.movementX 
        : (e.clientX - mouseState.current.lastX);
        
      const deltaY = e.movementY !== undefined && document.pointerLockElement === gl.domElement
        ? e.movementY 
        : (e.clientY - mouseState.current.lastY);
      
      const sens = 0.005;
      // If using movementX, the values are already deltas. If using clientX, we already calculated delta.
      // But we should use different scaling for movementX vs clientX if needed. 
      // Actually 0.005 is fine for both.
      
      mouseState.current.theta -= deltaX * sens;
      mouseState.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, mouseState.current.phi + deltaY * sens));
      
      mouseState.current.lastX = e.clientX;
      mouseState.current.lastY = e.clientY;
    };

    const handleWheel = (e: WheelEvent) => {
      const state = useGameStore.getState();
      if (!state.isEditorOpen || state.isTransforming) return;
      const zoomSpeed = keys.current["ShiftLeft"] ? 5 : 2;
      const zoomDir = scratchVec1.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
      currentPos.current.add(zoomDir.multiplyScalar(-e.deltaY * 0.01 * zoomSpeed));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("wheel", handleWheel);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gl]);

  useFrame((_state, delta) => {
    const state = useGameStore.getState();
    if (!state.isEditorOpen) return;


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

    const speed = keys.current["ShiftLeft"] ? 40 : 15;
    const moveDir = scratchVec1.current.set(0, 0, 0);
    
    // Standard WASDQE movement
    if (keys.current["KeyW"]) moveDir.z -= 1;
    if (keys.current["KeyS"]) moveDir.z += 1;
    if (keys.current["KeyA"]) moveDir.x -= 1;
    if (keys.current["KeyD"]) moveDir.x += 1;
    if (keys.current["KeyE"]) moveDir.y += 1;
    if (keys.current["KeyQ"]) moveDir.y -= 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      // Apply camera rotation to movement so W is always 'forward'
      moveDir.applyQuaternion(camera.quaternion);
      velocity.current.lerp(moveDir.multiplyScalar(speed), 1 - Math.exp(-10 * delta));
    } else {
      velocity.current.lerp(scratchVec1.current.set(0, 0, 0), 1 - Math.exp(-10 * delta));
    }

    currentPos.current.add(scratchVec2.current.copy(velocity.current).multiplyScalar(delta));
    camera.position.copy(currentPos.current);
    
    // Update lookAt target based on theta/phi
    const target = scratchVec1.current.set(
      Math.sin(mouseState.current.phi) * Math.sin(mouseState.current.theta),
      Math.cos(mouseState.current.phi),
      Math.sin(mouseState.current.phi) * Math.cos(mouseState.current.theta)
    );

    camera.lookAt(scratchVec2.current.copy(currentPos.current).add(target));
  });

  return null;
};
