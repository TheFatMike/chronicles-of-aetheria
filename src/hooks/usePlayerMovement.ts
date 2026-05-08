import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { GAME_CONFIG } from "../config";
import { useGameStore } from "../store/useGameStore";
import { Socket } from "socket.io-client";

export const usePlayerMovement = (
  meshRef: React.RefObject<THREE.Group | null>,
  socket: Socket | null,
  config = GAME_CONFIG.MOVEMENT
) => {
  const { camera, gl } = useThree();

  // Listen for Server Corrections (e.g. Collision Snapback)
  useEffect(() => {
    if (!socket) return;
    const handleSync = (data: any) => {
      if (meshRef.current && data.pos) {
        meshRef.current.position.set(data.pos[0], data.pos[1], data.pos[2]);
        velocity.current.set(0, 0, 0); // Stop movement immediately on "bonk"
      }
    };
    socket.on("session_start", handleSync);
    socket.on("move_sync", handleSync);
    return () => {
      socket.off("session_start", handleSync);
      socket.off("move_sync", handleSync);
    };
  }, [socket, meshRef]);
  const { 
    MOVE_SPEED, 
    FRICTION, 
    GRAVITY, 
    JUMP_FORCE, 
    SENSITIVITY, 
    MIN_RADIUS, 
    MAX_RADIUS 
  } = config;
  
  const keys = useRef<{ [key: string]: boolean }>({});
  const velocity = useRef(new THREE.Vector3());
  const isGrounded = useRef(true);
  const isMoving = useRef(false);
  
  const cameraState = useRef({
    theta: 0,
    phi: Math.PI / 6,
    radius: 8,
    isLeftMouseDown: false,
    isRightMouseDown: false,
  });

  const inputDir = useRef(new THREE.Vector3());
  const moveVec = useRef(new THREE.Vector3());
  const targetCamPos = useRef(new THREE.Vector3());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => (keys.current[e.code] = false);
    
    const handleMouseDown = (e: MouseEvent) => {
      if (useGameStore.getState().isEditorOpen) return;
      if (e.button === 0) cameraState.current.isLeftMouseDown = true;
      if (e.button === 2) {
        cameraState.current.isRightMouseDown = true;
        gl.domElement.requestPointerLock();
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (useGameStore.getState().isEditorOpen) {
        cameraState.current.isLeftMouseDown = false;
        cameraState.current.isRightMouseDown = false;
        return;
      }
      if (e.button === 0) cameraState.current.isLeftMouseDown = false;
      if (e.button === 2) {
        cameraState.current.isRightMouseDown = false;
        if (document.pointerLockElement === gl.domElement) {
          document.exitPointerLock();
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (useGameStore.getState().isEditorOpen) return;
      if (cameraState.current.isLeftMouseDown || cameraState.current.isRightMouseDown) {
        cameraState.current.theta -= e.movementX * SENSITIVITY;
        cameraState.current.phi = Math.max(
          0.05,
          Math.min(Math.PI / 2.1, cameraState.current.phi - e.movementY * SENSITIVITY)
        );
      }
    };

    const handleWheel = (e: WheelEvent) => {
      cameraState.current.radius = Math.max(
        MIN_RADIUS,
        Math.min(MAX_RADIUS, cameraState.current.radius + e.deltaY * 0.01)
      );
    };

    const preventDefault = (e: MouseEvent) => e.button === 2 && e.preventDefault();


    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    gl.domElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("wheel", handleWheel);
    gl.domElement.addEventListener("contextmenu", preventDefault);
    

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      gl.domElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("wheel", handleWheel);
      gl.domElement.removeEventListener("contextmenu", preventDefault);
    };
  }, [gl, SENSITIVITY, MIN_RADIUS, MAX_RADIUS]);

  const playerMeshesRef = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    if (meshRef.current) {
      const meshes: THREE.Object3D[] = [];
      meshRef.current.traverse(child => { if ((child as THREE.Mesh).isMesh) meshes.push(child); });
      playerMeshesRef.current = meshes;
    }
  }, [meshRef]);

  const updateCamera = (pos: [number, number, number] | THREE.Vector3) => {
    const { theta, phi, radius } = cameraState.current;
    const p = Array.isArray(pos) ? pos : [pos.x, pos.y, pos.z];
    
    camera.position.set(
      p[0] + radius * Math.sin(phi) * Math.sin(theta),
      p[1] + radius * Math.cos(phi) + 1.5,
      p[2] + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(p[0], p[1] + 1, p[2]);
  };

  const setRotation = (y: number) => {
    cameraState.current.theta = y;
  };

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const isEditorOpen = useGameStore.getState().isEditorOpen;

    const isTyping = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
    let forwardInput = 0;
    let sideInput = 0;

    if (!isTyping && !isEditorOpen) {
      forwardInput = (keys.current["KeyS"] ? 1 : 0) - (keys.current["KeyW"] ? 1 : 0);
      sideInput = (keys.current["KeyD"] ? 1 : 0) - (keys.current["KeyA"] ? 1 : 0);
    }
    
    if (isEditorOpen) {
      forwardInput = 0;
      sideInput = 0;
      velocity.current.set(0, velocity.current.y, 0); // Stop horizontal movement immediately
    }

    inputDir.current.set(sideInput, 0, forwardInput);
    if (inputDir.current.lengthSq() > 1) inputDir.current.normalize();
    
    isMoving.current = inputDir.current.lengthSq() > 0.01;

    if (cameraState.current.isRightMouseDown && !isEditorOpen) {
      meshRef.current.rotation.y = cameraState.current.theta;
    }

    moveVec.current.copy(inputDir.current).applyEuler(meshRef.current.rotation);

    // Clamp delta to prevent "teleporting" through floors after lag or tabbing out
    const clampedDelta = Math.min(delta, 0.1);

    if (moveVec.current.lengthSq() > 0) {
      velocity.current.x += moveVec.current.x * MOVE_SPEED * clampedDelta;
      velocity.current.z += moveVec.current.z * MOVE_SPEED * clampedDelta;
    }

    velocity.current.x -= velocity.current.x * FRICTION * clampedDelta;
    velocity.current.z -= velocity.current.z * FRICTION * clampedDelta;

    if (isGrounded.current && !isTyping && !isEditorOpen && keys.current["Space"]) {
      velocity.current.y = JUMP_FORCE;
      isGrounded.current = false;
    }
    if (!isGrounded.current) {
      velocity.current.y -= GRAVITY * clampedDelta;
    }

      // --- 3D WALL COLLISION (HORIZONTAL RAYCASTING) ---
    const horizontalVel = new THREE.Vector3(velocity.current.x, 0, velocity.current.z);
    if (horizontalVel.lengthSq() > 0.001) {
      const dir = horizontalVel.clone().normalize();
      
      const rayOrigin = new THREE.Vector3(meshRef.current.position.x, meshRef.current.position.y + 0.8, meshRef.current.position.z);
      const wallRay = new THREE.Raycaster(rayOrigin, dir, 0, 0.4);
      const wallIntersects = wallRay.intersectObjects(_state.scene.children, true);
      
      let wallHit = false;
      for (const hit of wallIntersects) {
        const name = hit.object.name || "";
        if (
          playerMeshesRef.current.includes(hit.object) || 
          (hit.object as any).material?.wireframe ||
          name.includes("editor_helper") ||
          name.includes("hb-")
        ) continue;
        
        wallHit = true;
        break;
      }

      if (wallHit) {
        // --- SLIDING LOGIC ---
        // Try X only
        const xDir = new THREE.Vector3(velocity.current.x > 0 ? 1 : -1, 0, 0);
        const xRay = new THREE.Raycaster(rayOrigin, xDir, 0, 0.4);
        const xHit = xRay.intersectObjects(_state.scene.children, true).some(h => {
          const n = h.object.name || "";
          return !playerMeshesRef.current.includes(h.object) && !(h.object as any).material?.wireframe && !n.includes("editor_helper") && !n.includes("hb-");
        });

        // Try Z only
        const zDir = new THREE.Vector3(0, 0, velocity.current.z > 0 ? 1 : -1);
        const zRay = new THREE.Raycaster(rayOrigin, zDir, 0, 0.4);
        const zHit = zRay.intersectObjects(_state.scene.children, true).some(h => {
          const n = h.object.name || "";
          return !playerMeshesRef.current.includes(h.object) && !(h.object as any).material?.wireframe && !n.includes("editor_helper") && !n.includes("hb-");
        });

        if (xHit && zHit) {
          velocity.current.x = 0;
          velocity.current.z = 0;
        } else if (xHit) {
          velocity.current.x = 0;
        } else if (zHit) {
          velocity.current.z = 0;
        }
      }
    }

    meshRef.current.position.x += velocity.current.x * clampedDelta;
    meshRef.current.position.y += velocity.current.y * clampedDelta;
    meshRef.current.position.z += velocity.current.z * clampedDelta;

    // --- 3D GROUND DETECTION (RAYCASTING) ---
    const groundRayOrigin = new THREE.Vector3(meshRef.current.position.x, meshRef.current.position.y + 0.5, meshRef.current.position.z);
    const rayDir = new THREE.Vector3(0, -1, 0);
    const raycaster = new THREE.Raycaster(groundRayOrigin, rayDir, 0, 50);
    
    // We want to hit the floor and world objects, but not ourselves or hitboxes
    const intersects = raycaster.intersectObjects(_state.scene.children, true);
    
    let groundY = 0;
    let hitSomething = false;

    for (const intersect of intersects) {
      const name = intersect.object.name || "";
      // IMPROVEMENT: Ignore invisible meshes (like collision hulls) and player/helpers
      if (
        !intersect.object.visible ||
        playerMeshesRef.current.includes(intersect.object) || 
        (intersect.object as any).material?.wireframe ||
        name.includes("editor_helper") ||
        name.includes("hb-")
      ) continue;
      
      groundY = intersect.point.y;
      hitSomething = true;
      break;
    }

    if (meshRef.current.position.y <= groundY + 0.01) {
      if (velocity.current.y <= 0) {
        meshRef.current.position.y = groundY;
        velocity.current.y = 0;
        isGrounded.current = true;
      }
    } else {
      isGrounded.current = false;
    }

    // Void Safety: If player falls out of the map, teleport to start
    if (meshRef.current.position.y < -50) {
      meshRef.current.position.set(0, 5, 0);
      velocity.current.set(0, 0, 0);
    }



    if (!isEditorOpen) {
      const { theta, phi, radius } = cameraState.current;
      const offsetX = radius * Math.sin(phi) * Math.sin(theta);
      const offsetY = radius * Math.cos(phi);
      const offsetZ = radius * Math.sin(phi) * Math.cos(theta);

      const lookTarget = new THREE.Vector3(
        meshRef.current.position.x,
        meshRef.current.position.y + 1.5, // Look at head
        meshRef.current.position.z
      );

      targetCamPos.current.set(
        meshRef.current.position.x + offsetX,
        meshRef.current.position.y + offsetY + 1.5,
        meshRef.current.position.z + offsetZ
      );

      // --- CAMERA COLLISION ---
      const camRayDir = targetCamPos.current.clone().sub(lookTarget).normalize();
      const camRayDist = targetCamPos.current.distanceTo(lookTarget);
      const camRaycaster = new THREE.Raycaster(lookTarget, camRayDir, 0, camRayDist);
      
      const camIntersects = camRaycaster.intersectObjects(_state.scene.children, true);
      let bestCamPos = targetCamPos.current.clone();

      for (const hit of camIntersects) {
        const name = hit.object.name || "";
        if (
          playerMeshesRef.current.includes(hit.object) || 
          (hit.object as any).material?.wireframe ||
          name.includes("editor_helper") ||
          name.includes("hb-")
        ) continue;
        
        // We hit a wall/roof! Zoom in to hit point (with 0.2m padding)
        bestCamPos.copy(hit.point).add(camRayDir.clone().multiplyScalar(-0.2));
        break;
      }
      
      // Frame-rate independent lerp for camera position
      camera.position.lerp(bestCamPos, 1 - Math.exp(-15 * delta));
      camera.lookAt(lookTarget);
    }
  });

  return {
    velocity,
    isGrounded: isGrounded,
    isMoving: isMoving,
    updateCamera,
    setRotation,
  };
};
