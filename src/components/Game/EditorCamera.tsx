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

  // Initial setup when opening editor
  useEffect(() => {
    if (isEditorOpen) {
      currentPos.current.copy(camera.position);
      // Try to find a reasonable look-at point (ground in front of player)
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      lookAtTarget.current.copy(camera.position).add(forward.multiplyScalar(10));
      
      // Calculate initial theta/phi from current rotation
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    gl.domElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      gl.domElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gl]);

  useFrame((_state, delta) => {
    if (!isEditorOpen || isTransforming) return;

    const speed = keys.current["ShiftLeft"] ? 40 : 15;
    const moveDir = new THREE.Vector3();
    
    if (keys.current["KeyW"]) moveDir.z += 1; // Forward
    if (keys.current["KeyS"]) moveDir.z -= 1; // Backward
    if (keys.current["KeyA"]) moveDir.x += 1; // Left
    if (keys.current["KeyD"]) moveDir.x -= 1; // Right
    if (keys.current["KeyE"]) moveDir.y += 1;
    if (keys.current["KeyQ"]) moveDir.y -= 1;

    // Move relative to camera orientation
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, mouseState.current.theta, 0));
    moveDir.applyQuaternion(q);
    
    velocity.current.lerp(moveDir.multiplyScalar(speed), 1 - Math.exp(-10 * delta));
    currentPos.current.add(velocity.current.clone().multiplyScalar(delta));

    camera.position.copy(currentPos.current);
    
    const target = new THREE.Vector3(
      Math.sin(mouseState.current.phi) * Math.sin(mouseState.current.theta),
      Math.cos(mouseState.current.phi),
      Math.sin(mouseState.current.phi) * Math.cos(mouseState.current.theta)
    );
    
    camera.lookAt(currentPos.current.clone().add(target));
  });

  return null;
};
