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
  }, [position, rotation]);

  useFrame((_state, delta) => {
    if (!groupRef.current) return;

    // Smooth Bilinear Terrain Height Lookup for Entities
    const terrainData = useGameStore.getState().terrainData;
    const resolution = 4;
    
    const groundY = getInterpolatedHeight(
      targetPos.current.x,
      targetPos.current.z,
      terrainData,
      resolution
    );
    targetPos.current.y = groundY;

    // Frame-independent lerp
    const lerpFactor = 1 - Math.exp(-lerpSpeed * delta);

    groupRef.current.position.lerp(targetPos.current, lerpFactor);
    
    // Smoothly interpolate rotation (usually only Y is needed for humanoids)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRot.current.y,
      lerpFactor
    );
  });

  return { targetPos, targetRot };
};
