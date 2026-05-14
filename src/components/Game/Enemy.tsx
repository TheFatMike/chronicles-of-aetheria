/**
 * @file src/components/Game/Enemy.tsx
 * @description Specialized components for rendering various enemy types.
 * Manages unique meshes, animations, and visual effects for different mobs.
 * @importance Essential: Populates the world with visual variety and distinct threats for the player to face.
 */
import { memo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BaseEntity } from "./BaseEntity";

interface EnemyProps {
  id: string;
  name: string;
  level: number;
  position: [number, number, number];
  color?: string;
  hp?: number;
  maxHp?: number;
  isDead?: boolean;
  onAttack?: () => void;
  onLoot?: (id: string) => void;
  scale?: number;
  behaviorType?: 'aggressive' | 'neutral' | 'passive';
  aiState?: string;
}

export const SlimeEnemy = memo(({ id, name, level, position, color = "#22c55e", hp, maxHp, isDead, scale = 1, behaviorType, aiState, onAttack, onLoot }: EnemyProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (!meshRef.current || isDead) return;
    const time = state.clock.getElapsedTime();

    // Slime bounce animation
    const bounceHeight = 0.2;
    const bounceSpeed = 3;
    const bounce = Math.abs(Math.sin(time * bounceSpeed));
    
    meshRef.current.position.y = bounce * bounceHeight + 0.4;
    meshRef.current.scale.y = 1 - bounce * 0.2;
    meshRef.current.scale.x = 1 + bounce * 0.1;
    meshRef.current.scale.z = 1 + bounce * 0.1;
  });

  return (
    <BaseEntity
      id={id}
      name={name}
      type="enemy"
      level={level}
      position={position}
      color={color}
      hp={hp}
      maxHp={maxHp}
      nameOffset={1.2}
      isDead={isDead}
      scale={scale}
      behaviorType={behaviorType}
      aiState={aiState}
      onInteract={isDead ? () => onLoot?.(id) : undefined}
      onAttack={onAttack}
    >
      <mesh 
        ref={meshRef} 
        position={[0, isDead ? 0.1 : 0.4, 0]}
        scale={isDead ? [1.5, 0.1, 1.5] : [1, 1, 1]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial 
          color={hovered ? "#fb7185" : color} 
          transparent 
          opacity={0.8} 
          roughness={0.2}
          emissive={hovered ? "#e11d48" : color}
          emissiveIntensity={0.2}
        />
        
        {/* Core */}
        <mesh scale={0.5}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
        </mesh>
      </mesh>
    </BaseEntity>
  );
});

export const SkeletonEnemy = memo(({ id, name, level, position, color = "#d1d5db", hp, maxHp, isDead, scale = 1, behaviorType, aiState, onAttack, onLoot }: EnemyProps) => {
  return (
    <BaseEntity
      id={id}
      name={name}
      type="enemy"
      level={level}
      position={position}
      color={color}
      hp={hp}
      maxHp={maxHp}
      isDead={isDead}
      scale={scale}
      behaviorType={behaviorType}
      aiState={aiState}
      nameOffset={isDead ? 0.5 : 2.2}
      selectionColor={isDead ? "#ffd700" : undefined}
      onInteract={isDead ? () => onLoot?.(id) : undefined}
      onAttack={onAttack}
    >
      <group position={[0, isDead ? 0.2 : 1, 0]} rotation={isDead ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
        {/* Ribcage */}
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.8, 0.3]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Limbs */}
        <mesh position={[-0.4, -0.4, 0]} castShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.4, -0.4, 0]} castShadow>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    </BaseEntity>
  );
});

export const GoblinEnemy = memo(({ id, name, level, position, color = "#166534", hp, maxHp, isDead, scale = 1, behaviorType, aiState, onAttack, onLoot }: EnemyProps) => {
  return (
    <BaseEntity
      id={id}
      name={name}
      type="enemy"
      level={level}
      position={position}
      color={color}
      hp={hp}
      maxHp={maxHp}
      isDead={isDead}
      scale={scale}
      behaviorType={behaviorType}
      aiState={aiState}
      nameOffset={isDead ? 0.5 : 1.5}
      selectionColor={isDead ? "#ffd700" : undefined}
      onInteract={isDead ? () => onLoot?.(id) : undefined}
      onAttack={onAttack}
    >
      <group position={[0, isDead ? 0.2 : 0.6, 0]} rotation={isDead ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
        {/* Body */}
        <mesh castShadow>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.3, 0.6, 0]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.1, 0.3, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.3, 0.6, 0]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.1, 0.3, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    </BaseEntity>
  );
});

export const WolfEnemy = memo(({ id, name, level, position, color = "#4b5563", hp, maxHp, isDead, scale = 1, behaviorType, aiState, onAttack, onLoot }: EnemyProps) => {
  return (
    <BaseEntity
      id={id}
      name={name}
      type="enemy"
      level={level}
      position={position}
      color={color}
      hp={hp}
      maxHp={maxHp}
      isDead={isDead}
      scale={scale}
      behaviorType={behaviorType}
      aiState={aiState}
      nameOffset={isDead ? 0.5 : 1.8}
      selectionColor={isDead ? "#ffd700" : undefined}
      onInteract={isDead ? () => onLoot?.(id) : undefined}
      onAttack={onAttack}
    >
      <group position={[0, isDead ? 0.2 : 0.6, 0]} rotation={isDead ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
        {/* Body */}
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.7, 1.2]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 0.5, 0.6]} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Snout */}
        <mesh position={[0, 0.45, 1.0]} castShadow>
          <boxGeometry args={[0.25, 0.25, 0.4]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.15, 0.8, 0.5]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.1, 0.3, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0.15, 0.8, 0.5]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.1, 0.3, 0.1]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Tail */}
        {!isDead && (
          <mesh position={[0, 0.1, -0.7]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[0.15, 0.15, 0.6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )}
      </group>
    </BaseEntity>
  );
});

SlimeEnemy.displayName = "SlimeEnemy";
SkeletonEnemy.displayName = "SkeletonEnemy";
GoblinEnemy.displayName = "GoblinEnemy";
WolfEnemy.displayName = "WolfEnemy";
