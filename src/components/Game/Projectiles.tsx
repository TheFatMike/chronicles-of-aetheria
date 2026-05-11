/**
 * @file src/components/Game/Projectiles.tsx
 * @description Renders and manages all active projectiles (arrows, spells, etc.) in the scene.
 * Uses efficient rendering techniques to handle multiple simultaneous projectiles with low overhead.
 * @importance Essential: Crucial for visual feedback during combat and representing ranged abilities.
 */
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../../store/useGameStore";
import { Projectile } from "../../store/types";

const ProjectileMesh = ({ data }: { data: Projectile }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  // Initialize with the static target pos so it never defaults to 0,0,0
  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3(data.targetPos[0], data.targetPos[1] + 1, data.targetPos[2]));
  const removeProjectile = useGameStore(state => state.removeProjectile);
  
  // Create a start position vector once
  const startVec = useMemo(() => new THREE.Vector3(...data.startPos), [data.startPos]);
  
  const tempVec = useRef(new THREE.Vector3());
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Safety: Remove if too old (leak prevention)
    if (Date.now() - data.createdAt > 5000) {
      removeProjectile(data.id);
      return;
    }

    // Get latest target position if it's still alive/moving
    const gameStore = useGameStore.getState();
    const targetEntity = gameStore.entities[data.targetId] || (gameStore.players[data.targetId] as any);
    
    if (targetEntity && targetEntity.pos) {
      targetPos.current.set(targetEntity.pos[0], targetEntity.pos[1] + 1, targetEntity.pos[2]);
    }

    // Move towards target
    const currentPos = meshRef.current.position;
    // Reuse tempVec instead of creating new Vector3 every frame
    const dir = tempVec.current.subVectors(targetPos.current, currentPos);
    const dist = dir.length();
    
    if (dist < 0.5) {
      // Reached target
      removeProjectile(data.id);
      return;
    }
    
    dir.normalize();
    currentPos.addScaledVector(dir, data.speed * delta);
    meshRef.current.lookAt(targetPos.current);
  });

  return (
    <mesh ref={meshRef} position={startVec}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshBasicMaterial color={data.color} />
      <pointLight color={data.color} distance={5} intensity={2} />
    </mesh>
  );
};

export const Projectiles = () => {
  const projectiles = useGameStore(state => state.projectiles);
  return (
    <>
      {projectiles.map(p => (
        <ProjectileMesh key={p.id} data={p} />
      ))}
    </>
  );
};
