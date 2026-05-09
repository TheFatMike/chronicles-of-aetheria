import React, { useRef, useEffect, useMemo, memo } from "react";
import * as THREE from "three";
import { GAME_CONFIG } from "../../config";
import { useGameStore } from "../../store/useGameStore";

interface TerrainProps {
  socket: any;
  onClick?: (e: any) => void;
}

export const Terrain = memo(({ socket, onClick }: TerrainProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const size = GAME_CONFIG.WORLD.SIZE;
  const resolution = 4; // 4 meters per vertex
  const segments = Math.floor(size / resolution);
  
  // Local track of applied points to avoid redundant updates
  const appliedData = useRef<Record<string, { y: number, type: string }>>({});

  // Initialize vertex colors
  const initialColors = useMemo(() => {
    const count = (segments + 1) * (segments + 1);
    const colors = new Float32Array(count * 3);
    const defaultColor = new THREE.Color("#14532d"); // Grass green
    for (let i = 0; i < count; i++) {
      colors[i * 3] = defaultColor.r;
      colors[i * 3 + 1] = defaultColor.g;
      colors[i * 3 + 2] = defaultColor.b;
    }
    return colors;
  }, [segments]);

  // Batch updates and debounce normal computation
  const pendingUpdates = useRef<boolean>(false);
  const lastNormalCompute = useRef<number>(0);

  useEffect(() => {
    const updateGeometry = (data: Record<string, { y: number, type: string }>) => {
      if (!meshRef.current) return;
      const posAttr = meshRef.current.geometry.attributes.position;
      const colorAttr = meshRef.current.geometry.attributes.color;
      let hasChanges = false;

      // Use a more efficient loop for large datasets
      const keys = Object.keys(data);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = data[key];
        
        const prev = appliedData.current[key];
        if (prev?.y === val.y && prev?.type === val.type) continue;
        
        appliedData.current[key] = { ...val };
        hasChanges = true;

        const [xStr, zStr] = key.split('_');
        const x = Number(xStr);
        const z = Number(zStr);

        const col = Math.round((x + size / 2) / resolution);
        const row = Math.round((z + size / 2) / resolution);
        const idx = (row * (segments + 1)) + col;
        
        if (idx >= 0 && idx < posAttr.count) {
          if (val.y !== undefined && !isNaN(val.y)) {
             posAttr.setZ(idx, val.y);
          }
          if (val.type !== undefined) {
            const color = new THREE.Color(
              val.type === 'dirt' ? '#78350f' : 
              val.type === 'stone' ? '#4b5563' : 
              val.type === 'sand' ? '#fde047' : 
              '#14532d'
            );
            colorAttr.setXYZ(idx, color.r, color.g, color.b);
          }
        }
      }

      if (hasChanges) {
        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        
        // Debounce normal computation (max once per 100ms)
        const now = performance.now();
        if (now - lastNormalCompute.current > 100) {
          meshRef.current.geometry.computeVertexNormals();
          lastNormalCompute.current = now;
        } else {
          // Schedule a delayed normal computation if one isn't already pending
          if (!pendingUpdates.current) {
            pendingUpdates.current = true;
            setTimeout(() => {
              if (meshRef.current) {
                meshRef.current.geometry.computeVertexNormals();
                lastNormalCompute.current = performance.now();
              }
              pendingUpdates.current = false;
            }, 100);
          }
        }
      }
    };

    // 1. Apply initial data from store immediately on mount
    updateGeometry(useGameStore.getState().terrainData);

    // 2. Subscribe to future updates from the store
    const unsubscribe = useGameStore.subscribe(
      (state) => state.terrainData,
      (terrainData) => {
        updateGeometry(terrainData);
      }
    );

    return () => unsubscribe();
  }, [segments, size, resolution]);

  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      receiveShadow 
      position={[0, 0, 0]}
      name="terrain_mesh"
      onClick={onClick}
    >
      <planeGeometry args={[size, size, segments, segments]}>
        <bufferAttribute
          attach="attributes-color"
          args={[initialColors, 3]}
        />
      </planeGeometry>
      <meshLambertMaterial 
        vertexColors 
        reflectivity={0}
      />
    </mesh>
  );
});

Terrain.displayName = "Terrain";
