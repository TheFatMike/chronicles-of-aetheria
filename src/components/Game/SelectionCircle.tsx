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
    >
      <ringGeometry args={[0.6 * scale, 0.7 * scale, 32]} />
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
