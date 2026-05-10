import React, { useRef, useEffect, useMemo, memo } from "react";
import * as THREE from "three";
import { GAME_CONFIG } from "../../config";
import { useGameStore } from "../../store/useGameStore";
 
const TERRAIN_COLORS = {
  grass: new THREE.Color("#14532d"),
  dirt: new THREE.Color("#78350f"),
  stone: new THREE.Color("#4b5563"),
  sand: new THREE.Color("#fde047"),
};

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
    const defaultColor = TERRAIN_COLORS.grass;
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

  // Optimization: Fast lookup map for vertex indices by coordinate
  const vertexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let row = 0; row <= segments; row++) {
      for (let col = 0; col <= segments; col++) {
        const x = (col * resolution) - size / 2;
        const z = (row * resolution) - size / 2;
        const idx = row * (segments + 1) + col;
        map.set(`${x}_${z}`, idx);
      }
    }
    return map;
  }, [segments, size, resolution]);

  useEffect(() => {
    const updateGeometry = (dirtyPoints: { x: number, z: number, y: number, type: string }[]) => {
      if (!meshRef.current || !dirtyPoints || dirtyPoints.length === 0) return;
      
      const geom = meshRef.current.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      const colorAttr = geom.attributes.color as THREE.BufferAttribute;
      let hasChanges = false;

      for (let i = 0; i < dirtyPoints.length; i++) {
        const p = dirtyPoints[i];
        const key = `${p.x}_${p.z}`;
        const idx = vertexMap.get(key);
        
        if (idx !== undefined) {
          posAttr.setZ(idx, p.y);
          const color = TERRAIN_COLORS[p.type as keyof typeof TERRAIN_COLORS] || TERRAIN_COLORS.grass;
          colorAttr.setXYZ(idx, color.r, color.g, color.b);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        
        const now = performance.now();
        if (now - lastNormalCompute.current > 100) {
          meshRef.current.geometry.computeVertexNormals();
          lastNormalCompute.current = now;
        } else if (!pendingUpdates.current) {
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
    };

    // 1. Initial Full Apply from terrainData
    const initialData = useGameStore.getState().terrainData;
    const initialDirty = Object.entries(initialData).map(([key, val]) => {
      const [x, z] = key.split('_').map(Number);
      return { x, z, ...val };
    });
    if (initialDirty.length > 0) updateGeometry(initialDirty);

    // 2. Subscribe to granular updates (Dirty Points)
    const unsubscribe = useGameStore.subscribe(
      (state) => state.terrainDirtyPoints,
      (dirtyPoints) => {
        updateGeometry(dirtyPoints);
      }
    );

    return () => unsubscribe();
  }, [vertexMap]);

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
        <meshStandardMaterial 
          vertexColors 
          roughness={1} 
          metalness={0} 
          side={THREE.DoubleSide}
        />
    </mesh>
  );
});

Terrain.displayName = "Terrain";
