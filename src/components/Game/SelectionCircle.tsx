/**
 * @file src/components/Game/SelectionCircle.tsx
 * @description Renders a visual ring on the ground beneath a selected or targeted entity.
 * Provides clear visual feedback on the currently active target.
 * @importance Essential: Key for target identification and clarity during combat and interaction.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SelectionCircleProps {
  visible: boolean;
  color?: string;
  scale?: number;
}

export const SelectionCircle = ({ visible, color = "#fbbf24", scale = 1 }: SelectionCircleProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !visible) return;
    meshRef.current.rotation.z = state.clock.getElapsedTime() * 0.5;
  });

  if (!visible) return null;

  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0.05, 0]}
      raycast={() => null}
    >
      <ringGeometry args={[0.8 * scale, 1.0 * scale, 32]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={1} 
        transparent 
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
