/**
 * @file src/components/Game/Player.tsx
 * @description The local player's character component in the 3D scene.
 * Manages the player's visuals, camera following, and integrates with the movement system.
 * @importance Critical: The primary point of interaction and visual representation for the user in the game world.
 */
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, memo } from "react";
import * as THREE from "three";
import { Humanoid } from "./Humanoid";
import { useGameStore } from "../../store/useGameStore";
import { usePlayerMovement } from "../../hooks/usePlayerMovement";

interface PlayerProps {
  onMove: (pos: [number, number, number], rot: [number, number, number], moving: boolean, grounded: boolean) => void;
  color: string;
  socket: any;
  initialPos?: [number, number, number];
  initialRot?: [number, number, number];
}

export const Player = memo(({ onMove, color, socket, initialPos, initialRot }: PlayerProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const isEditorOpen = useGameStore(state => state.isEditorOpen);
  const teleportRequest = useGameStore(state => state.teleportRequest);
  const requestTeleport = useGameStore(state => state.requestTeleport);
  const isAttacking = useGameStore(state => state.isAttacking);

  const { isGrounded, isMoving, updateCamera, setRotation } = usePlayerMovement(meshRef, socket);
  
  // Set initial position and rotation once on mount
  useEffect(() => {
    if (meshRef.current) {
      if (initialPos) {
        meshRef.current.position.set(...initialPos);
        updateCamera(initialPos);
      }
      if (initialRot) {
        setRotation(initialRot[1]); // Assuming Y rotation
        meshRef.current.rotation.set(...initialRot);
      }
    }
  }, []); // Only run once on mount

  const lastUpdate = useRef(0);

  // Handle outside teleport requests (Commands)
  useEffect(() => {
    if (teleportRequest && meshRef.current) {
      meshRef.current.position.set(...teleportRequest);
      requestTeleport(null); // Clear request
      
      // Update camera immediately
      updateCamera(teleportRequest);
    }
  }, [teleportRequest, requestTeleport, updateCamera]);



  return (
    <group ref={meshRef} raycast={() => null}>
      {!isEditorOpen && (
        <Humanoid color={color} isMoving={isMoving.current} isGrounded={isGrounded.current} isAttacking={isAttacking} />
      )}
    </group>
  );
});

Player.displayName = "Player";
