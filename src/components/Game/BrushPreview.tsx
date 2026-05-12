import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";

export const BrushPreview = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { editorBrushSize, editorSelectedType, isEditorOpen, mousePoint } = useGameStore(useShallow(state => ({
    editorBrushSize: state.editorBrushSize,
    editorSelectedType: state.editorSelectedType,
    isEditorOpen: state.isEditorOpen,
    mousePoint: state.editorMousePoint
  })));

  const isTerrainTool = editorSelectedType?.startsWith('terrain_');

  useFrame(() => {
    if (meshRef.current) {
      if (isEditorOpen && isTerrainTool && mousePoint) {
        meshRef.current.visible = true;
        meshRef.current.position.set(mousePoint[0], mousePoint[1] + 0.1, mousePoint[2]);
        meshRef.current.scale.set(editorBrushSize, editorBrushSize, 1);
      } else {
        meshRef.current.visible = false;
      }
    }
  });

  const geometry = useMemo(() => new THREE.RingGeometry(0.95, 1, 64), []);

  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={999}
    >
      <primitive object={geometry} attach="geometry" />
      <meshBasicMaterial 
        color={editorSelectedType?.includes('paint') ? "#3b82f6" : "#f59e0b"} 
        transparent 
        opacity={0.5} 
        depthTest={false}
      />
    </mesh>
  );
};
