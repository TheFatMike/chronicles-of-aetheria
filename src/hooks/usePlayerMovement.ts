/**
 * @file src/hooks/usePlayerMovement.ts
 * @description Implements the movement and physics logic for the local player's character.
 * Handles input processing, collision resolution, and synchronization with the server.
 * @importance Critical: Directly responsible for the responsiveness and "feel" of character movement.
 */
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
import { CameraState } from "@shared/types";
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
  const groundingObj = useRef({ current: true });
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
      // Don't fight with the EditorCamera
      if (store.isEditorOpen) return;

      const target = e.target as HTMLElement;
      if (target.tagName === "BUTTON" || target.tagName === "INPUT" || target.tagName === "SELECT" || target.closest('.pointer-events-auto')) return;

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
      if (store.isEditorOpen) return;
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

  // Full Collidables Scan (Throttled but reactive to world loading)
  const worldReady = useGameStore(s => s.worldReady);
  const assetsReady = useGameStore(s => s.assetsReady);
  const isWorldLoading = useGameStore(s => s.isWorldLoading);

  useEffect(() => {
    const update = () => {
      if (!scene) return;
      const all: THREE.Object3D[] = [];
      scene.traverse(obj => { if (obj.userData?.isCollidable) all.push(obj); });
      allCollidablesRef.current = all;
      // Trigger an immediate filter update next frame
      filteredCollidablesRef.current = [];
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [scene, worldReady, assetsReady, isWorldLoading]);

  // MAIN GAME LOOP
  useFrame((_, delta) => {
    const state = useGameStore.getState();
    if (!meshRef.current || state.isEditorOpen || state.isWorldLoading) return;

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
      filteredCollidablesRef.current = allCollidablesRef.current.filter(obj => {
        const distSq = obj.position.distanceToSquared(meshRef.current!.position);
        // Terrain chunks are large (100m), so we need a larger radius (150m) to catch them
        if (obj.userData?.isTerrain) return distSq < 150 * 150;
        return distSq < 400; // 20m for normal objects
      });
    }
    
    // 2. INPUT & ROTATION
    const { direction: inputDir, turn } = systems.input.getMovementInput(store.isEditorOpen, store.isWorldLoading);
    
    const isRMB = cameraState.current.isRightMouseDown;
    const isLMB = cameraState.current.isLeftMouseDown;
    
    // Determine movement state early for camera logic
    isMoving.current = velocity.current.lengthSq() > 0.001 || turn !== 0;

    // 2.1 Interrupt casting on movement
    if (isMoving.current && state.castState?.active && state.castState.skillName !== "Basic Attack") {
      state.cancelCast();
    }

    if (store.isEditorOpen) {
      // First Person Fly Mode
      cameraState.current.radius = 0;
      meshRef.current.rotation.y = cameraState.current.theta;
    } else if (turn !== 0) {
      const turnSpeed = 3.5;
      meshRef.current.rotation.y += turn * turnSpeed * clampedDelta;
      // In WoW, camera follows character rotation unless orbiting (LMB) or steering (RMB)
      if (!isLMB && !isRMB) {
        cameraState.current.theta += turn * turnSpeed * clampedDelta;
      }
    }

    // Steering: Character faces where camera looks when RMB is held
    if (isRMB && !store.isEditorOpen) {
      meshRef.current.rotation.y = cameraState.current.theta;
    }

    // WoW-style Auto-centering:
    // If not orbiting (LMB) or steering (RMB), and the player is moving, lerp camera behind character.
    if (!isLMB && !isRMB && !store.isEditorOpen && isMoving.current) {
      const targetTheta = meshRef.current.rotation.y;
      
      // Normalize angles to prevent 360-degree spins during lerp
      let diff = targetTheta - cameraState.current.theta;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      const snapSpeed = 5.0; // Higher = faster centering
      cameraState.current.theta += diff * snapSpeed * clampedDelta;
      
      // Keep theta within [-PI, PI] to prevent overflow over long sessions
      if (cameraState.current.theta > Math.PI) cameraState.current.theta -= Math.PI * 2;
      if (cameraState.current.theta < -Math.PI) cameraState.current.theta += Math.PI * 2;
    }

    // Zero-GC World Move Calculation
    worldMoveVec.current.copy(inputDir).applyAxisAngle(UP_AXIS, meshRef.current.rotation.y);

    // 3. PHYSICS (Fixed Timestep)
    accumulator.current += clampedDelta;
    while (accumulator.current >= PHYSICS_STEP) {
      groundingObj.current.current = isGrounded.current;
      
      systems.physics.update(
        physicsPosition.current,
        velocity.current,
        worldMoveVec.current,
        groundingObj.current,
        PHYSICS_STEP,
        { ...GAME_CONFIG.MOVEMENT, isEditorOpen: store.isEditorOpen },
        useGameStore.getState().terrainData,
        filteredCollidablesRef.current,
        playerMeshesRef.current
      );

      isGrounded.current = groundingObj.current.current;
      
      // 3.1 Horizontal Collision Resolution (Wall Sliding) - Disabled in Editor
      if (!store.isEditorOpen) {
        systems.collision.resolveSliding(
          physicsPosition.current,
          velocity.current,
          filteredCollidablesRef.current,
          playerMeshesRef.current
        );
      }

      if (systems.input.isJumpPressed() && isGrounded.current) {
        velocity.current.y = GAME_CONFIG.MOVEMENT.JUMP_FORCE;
        isGrounded.current = false;
      }

      accumulator.current -= PHYSICS_STEP;
    }

    // 4. VISUAL INTERPOLATION
    const followSpeed = store.isEditorOpen ? 60 : 40; // Snappier in editor
    if (meshRef.current.position.distanceToSquared(physicsPosition.current) > 100) {
      meshRef.current.position.copy(physicsPosition.current);
    } else {
      meshRef.current.position.lerp(physicsPosition.current, 1 - Math.exp(-followSpeed * clampedDelta));
    }

    // 5. CAMERA UPDATE - Disabled in Editor (EditorCamera takes control)
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

    if (now - lastTime.current > 66) {
      if (socket && (isMoving.current || frameCount.current % 10 === 0)) {
        socket.emit("move", {
          pos: [physicsPosition.current.x, physicsPosition.current.y, physicsPosition.current.z],
          rot: [0, meshRef.current.rotation.y, 0],
          isMoving: isMoving.current,
          isGrounded: isGrounded.current
        });
        
        // Update local store for distance checks and UI only if moved
        const state = useGameStore.getState();
        const currentPos = state.players[state.id || ""]?.pos;
        const currentRot = state.players[state.id || ""]?.rot;
        const newRot: [number, number, number] = [0, meshRef.current.rotation.y, 0];
        
        if (!currentPos || 
            Math.abs(currentPos[0] - physicsPosition.current.x) > 0.01 ||
            Math.abs(currentPos[2] - physicsPosition.current.z) > 0.01 ||
            !currentRot ||
            Math.abs(currentRot[1] - newRot[1]) > 0.01) {
          state.updatePlayer(
            state.id || "", 
            { 
              pos: [physicsPosition.current.x, physicsPosition.current.y, physicsPosition.current.z],
              rot: newRot
            }
          );
        }

        lastTime.current = now;
      }
    }

  });

  return { isGrounded, isMoving, updateCamera, setRotation, cameraState };
};
