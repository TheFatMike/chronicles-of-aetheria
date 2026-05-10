import { useRef, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { GAME_CONFIG } from "../config";
import { useGameStore } from "../store/useGameStore";
import { Socket } from "socket.io-client";
import { isDebugEnabled } from "../debug.config";

// Modular Imports
import { InputHandler } from "../lib/movement/InputHandler";
import { PhysicsEngine } from "../lib/movement/PhysicsEngine";
import { CollisionSystem } from "../lib/movement/CollisionSystem";
import { CameraManager } from "../lib/movement/CameraManager";
import { CameraState } from "../lib/movement/types";
import { logger } from "../lib/logger";

const PHYSICS_STEP = 1/60;
const UP_AXIS = new THREE.Vector3(0, 1, 0);

export const usePlayerMovement = (
  meshRef: React.RefObject<THREE.Group | null>,
  socket: Socket | null,
  config = GAME_CONFIG.MOVEMENT
) => {
  const { camera, scene, gl } = useThree();
  const store = useGameStore();

  // 1. Initialize Modular Systems
  const systems = useMemo(() => ({
    input: new InputHandler(),
    physics: new PhysicsEngine(),
    collision: new CollisionSystem(),
    camera: new CameraManager()
  }), []);

  // 2. Refs for high-performance state (Zero-GC)
  const velocity = useRef(new THREE.Vector3());
  const physicsPosition = useRef(new THREE.Vector3());
  const worldMoveVec = useRef(new THREE.Vector3());
  const isGrounded = useRef(true);
  const isMoving = useRef(false);
  const accumulator = useRef(0);
  const lastTime = useRef(performance.now());
  const frameCount = useRef(0);
  const allCollidablesRef = useRef<THREE.Object3D[]>([]);
  const filteredCollidablesRef = useRef<THREE.Object3D[]>([]);
  const playerMeshesRef = useRef<THREE.Object3D[]>([]);
  
  const cameraState = useRef<CameraState>({
    theta: 0,
    phi: Math.PI / 6,
    radius: 8,
    isLeftMouseDown: false,
    isRightMouseDown: false,
    lastX: 0,
    lastY: 0
  });

  // Public Interface helpers for Player.tsx
  const updateCamera = useCallback((pos: [number, number, number]) => {
    physicsPosition.current.set(...pos);
    if (meshRef.current) meshRef.current.position.set(...pos);
  }, [meshRef]);

  const setRotation = useCallback((y: number) => {
    if (meshRef.current) meshRef.current.rotation.y = y;
  }, [meshRef]);

  // Sync player meshes for ignore list
  useEffect(() => {
    if (meshRef.current) {
      const meshes: THREE.Object3D[] = [];
      meshRef.current.traverse(obj => { if ((obj as any).isMesh) meshes.push(obj); });
      playerMeshesRef.current = meshes;
    }
  }, [meshRef]);

  // Sync Input Listeners
  useEffect(() => {
    systems.input.setup();

    const onMouseDown = (e: MouseEvent) => {
      // Ignore if clicking on UI
      if (e.target !== gl.domElement) return;

      if (e.button === 0) cameraState.current.isLeftMouseDown = true;
      if (e.button === 2) cameraState.current.isRightMouseDown = true;
      cameraState.current.lastX = e.clientX;
      cameraState.current.lastY = e.clientY;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) cameraState.current.isLeftMouseDown = false;
      if (e.button === 2) cameraState.current.isRightMouseDown = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      const { isLeftMouseDown, isRightMouseDown, lastX, lastY } = cameraState.current;
      if (!isLeftMouseDown && !isRightMouseDown) return;
      
      // If we are dragging something over the window, e.target might change, 
      // but the initial mousedown already filtered it. 
      // However, to be extra safe during active drag-and-drop:
      if (e.buttons === 0) { // Safety: buttons is 0 if no button is held
        cameraState.current.isLeftMouseDown = false;
        cameraState.current.isRightMouseDown = false;
        return;
      }

      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      
      const sensitivity = 0.005;
      cameraState.current.theta -= deltaX * sensitivity;
      cameraState.current.phi -= deltaY * sensitivity;

      // Clamp Phi to prevent flipping (0 to PI)
      const minPhi = 0.1;
      const maxPhi = Math.PI - 0.1;
      cameraState.current.phi = Math.max(minPhi, Math.min(maxPhi, cameraState.current.phi));

      cameraState.current.lastX = e.clientX;
      cameraState.current.lastY = e.clientY;
    };

    const onWheel = (e: WheelEvent) => {
      const zoomSpeed = 0.005;
      cameraState.current.radius += e.deltaY * zoomSpeed;
      cameraState.current.radius = Math.max(2, Math.min(20, cameraState.current.radius));
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      systems.input.destroy();
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("wheel", onWheel);
    };
  }, [systems]);

  // Full Collidables Scan (Throttled)
  useEffect(() => {
    const update = () => {
      const all: THREE.Object3D[] = [];
      scene.traverse(obj => { if (obj.userData?.isCollidable) all.push(obj); });
      allCollidablesRef.current = all;
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [scene]);

  // MAIN GAME LOOP
  useFrame((_, delta) => {
    if (!meshRef.current) return;

    // Handle Teleportation
    if (store.teleportRequest) {
      const [tx, ty, tz] = store.teleportRequest;
      physicsPosition.current.set(tx, ty, tz);
      meshRef.current.position.set(tx, ty, tz);
      velocity.current.set(0, 0, 0);
      store.requestTeleport(null);
      return;
    }

    const clampedDelta = Math.min(delta, 0.1);
    
    // 1. Spatial Filtering (Every 10 frames)
    frameCount.current++;
    if (frameCount.current % 10 === 0 || filteredCollidablesRef.current.length === 0) {
      filteredCollidablesRef.current = allCollidablesRef.current.filter(obj => 
        obj.position.distanceToSquared(meshRef.current!.position) < 400 // 20m radius
      );
    }
    
    // 2. INPUT & ROTATION
    const { direction: inputDir, turn } = systems.input.getMovementInput(store.isEditorOpen, store.isWorldLoading);
    
    // Sync mouse states from InputHandler
    cameraState.current.isLeftMouseDown = systems.input.isLeftMouseDown;
    cameraState.current.isRightMouseDown = systems.input.isRightMouseDown;
    
    const isRMB = cameraState.current.isRightMouseDown;
    const isLMB = cameraState.current.isLeftMouseDown;

    if (turn !== 0) {
      const turnSpeed = 3.5;
      meshRef.current.rotation.y += turn * turnSpeed * clampedDelta;
      // In WoW, camera follows character rotation unless orbiting (LMB) or steering (RMB)
      if (!isLMB && !isRMB) {
        cameraState.current.theta += turn * turnSpeed * clampedDelta;
      }
    }

    // Steering: Character faces where camera looks when RMB is held
    if (isRMB) {
      meshRef.current.rotation.y = cameraState.current.theta;
    }

    // Zero-GC World Move Calculation
    worldMoveVec.current.copy(inputDir).applyAxisAngle(UP_AXIS, meshRef.current.rotation.y);

    // 3. PHYSICS (Fixed Timestep)
    accumulator.current += clampedDelta;
    while (accumulator.current >= PHYSICS_STEP) {
      const groundingObj = { current: isGrounded.current };
      
      systems.physics.update(
        physicsPosition.current,
        velocity.current,
        worldMoveVec.current,
        groundingObj,
        PHYSICS_STEP,
        GAME_CONFIG.MOVEMENT,
        store.terrainData,
        filteredCollidablesRef.current,
        playerMeshesRef.current
      );

      isGrounded.current = groundingObj.current;
      
      // 3.1 Horizontal Collision Resolution (Wall Sliding)
      systems.collision.resolveSliding(
        physicsPosition.current,
        velocity.current,
        filteredCollidablesRef.current,
        playerMeshesRef.current
      );

      if (systems.input.isJumpPressed() && isGrounded.current) {
        velocity.current.y = GAME_CONFIG.MOVEMENT.JUMP_FORCE;
        isGrounded.current = false;
      }

      accumulator.current -= PHYSICS_STEP;
    }

    // 4. VISUAL INTERPOLATION
    const followSpeed = 40;
    if (meshRef.current.position.distanceToSquared(physicsPosition.current) > 100) {
      meshRef.current.position.copy(physicsPosition.current);
    } else {
      meshRef.current.position.lerp(physicsPosition.current, 1 - Math.exp(-followSpeed * clampedDelta));
    }

    // 5. CAMERA UPDATE (Disabled in Editor Mode)
    if (!store.isEditorOpen) {
      systems.camera.update(
        camera,
        cameraState.current,
        meshRef.current.position,
        clampedDelta,
        filteredCollidablesRef.current,
        playerMeshesRef.current
      );
    }

    // 6. NETWORK SYNC (15Hz)
    const now = performance.now();
    isMoving.current = velocity.current.lengthSq() > 0.001 || turn !== 0;

    if (now - lastTime.current > 66) {
      if (socket && (isMoving.current || frameCount.current % 10 === 0)) {
        socket.emit("move", {
          pos: [physicsPosition.current.x, physicsPosition.current.y, physicsPosition.current.z],
          rot: [0, meshRef.current.rotation.y, 0],
          vel: [velocity.current.x, velocity.current.y, velocity.current.z],
          ground: isGrounded.current
        });
        
        // Update local store for distance checks and UI
        useGameStore.getState().updatePlayer(
          useGameStore.getState().id || "", 
          { pos: [physicsPosition.current.x, physicsPosition.current.y, physicsPosition.current.z] }
        );

        lastTime.current = now;
      }
    }

  });

  return { isGrounded, isMoving, updateCamera, setRotation, cameraState };
};
