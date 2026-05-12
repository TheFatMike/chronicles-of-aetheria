/**
 * @file src/hooks/useEntitySync.ts
 * @description Synchronizes the positions and states of non-player entities in the 3D scene.
 * Implements interpolation to ensure smooth movement and visual consistency across network updates.
 * @importance Essential: Crucial for a smooth visual experience, preventing entities from "teleporting" during updates.
 */
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GAME_CONFIG } from "../config";
import { useGameStore } from "../store/useGameStore";
import { getInterpolatedHeight } from "../lib/terrainUtils";

interface SyncProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  lerpSpeed?: number;
}

export const useEntitySync = (
  groupRef: React.RefObject<THREE.Group | null>,
  { 
    position, 
    rotation = [0, 0, 0], 
    lerpSpeed = GAME_CONFIG.NETWORK.INTERPOLATION_SPEED 
  }: SyncProps
) => {
  const targetPos = useRef(new THREE.Vector3(...position));
  const targetRot = useRef(new THREE.Euler(...rotation));

  useEffect(() => {
    targetPos.current.set(...position);
    targetRot.current.set(...rotation);

    // Snap to target immediately on first mount to prevent "sliding from 0,0,0"
    if (groupRef.current && groupRef.current.position.lengthSq() === 0) {
      groupRef.current.position.set(...position);
      groupRef.current.rotation.set(...rotation);
    }
  }, [position, rotation, groupRef]);

  const lastGroundPos = useRef<[number, number]>([-999, -999]);
  const cachedGroundY = useRef<number>(position[1]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    // Smooth Bilinear Terrain Height Lookup for Entities
    // OPTIMIZATION: Only recalculate height if target position has moved significantly
    if (Math.abs(lastGroundPos.current[0] - targetPos.current.x) > 0.05 || 
        Math.abs(lastGroundPos.current[1] - targetPos.current.z) > 0.05) {
      
      const terrainData = useGameStore.getState().terrainData;
      const resolution = 2; // Updated to match 2m terrain
      
      cachedGroundY.current = getInterpolatedHeight(
        targetPos.current.x,
        targetPos.current.z,
        terrainData,
        resolution
      );
      lastGroundPos.current = [targetPos.current.x, targetPos.current.z];
    }
    
    targetPos.current.y = cachedGroundY.current;

    // Frame-independent lerp
    const lerpFactor = 1 - Math.exp(-lerpSpeed * delta);

    groupRef.current.position.lerp(targetPos.current, lerpFactor);
    
    // Smoothly interpolate rotation
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRot.current.y,
      lerpFactor
    );
  });


  return { targetPos, targetRot };
};
