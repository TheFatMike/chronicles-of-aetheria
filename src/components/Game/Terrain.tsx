/**
 * @file src/components/Game/Terrain.tsx
 * @description Generates and renders the procedural terrain mesh.
 * Dynamically updates vertex positions and colors based on heightmap data and sculpting actions.
 * @importance Critical: Provides the physical and visual ground for the entire game world.
 */
import React, { useRef, useEffect, useMemo, memo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { GAME_CONFIG } from "../../config";
import { useGameStore } from "../../store/useGameStore";

// Use vertex colors as weights for texture blending (Splatting)
// R = Grass, G = Stone, B = Dirt/Sand tint
// Use vertex colors as weights for texture blending (Splatting)
// R = Grass, G = Stone, B = Dirt, (0,0,0) = Sand
const TERRAIN_COLORS = {
  grass: new THREE.Color(1, 0, 0),
  dirt: new THREE.Color(0, 0, 1),
  stone: new THREE.Color(0, 1, 0),
  sand: new THREE.Color(0, 0, 0),
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

  // Load and configure textures
  const grassTexture = useTexture("/assets/textures/grass.png");
  const stoneTexture = useTexture("/assets/textures/stone.png");
  const dirtTexture = useTexture("/assets/textures/dirt.png");
  const sandTexture = useTexture("/assets/textures/sand.png");

  useMemo(() => {
    [grassTexture, stoneTexture, dirtTexture, sandTexture].forEach(tex => {
      if (tex) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        const textureRepeat = size / 4; 
        tex.repeat.set(textureRepeat, textureRepeat);
        tex.anisotropy = 16;
      }
    });
  }, [grassTexture, stoneTexture, dirtTexture, sandTexture, size]);
  
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

  // Custom shader for texture splatting
  const onBeforeCompile = (shader: any) => {
    shader.uniforms.uGrassMap = { value: grassTexture };
    shader.uniforms.uStoneMap = { value: stoneTexture };
    shader.uniforms.uDirtMap = { value: dirtTexture };
    shader.uniforms.uSandMap = { value: sandTexture };
    
    shader.fragmentShader = `
      uniform sampler2D uGrassMap;
      uniform sampler2D uStoneMap;
      uniform sampler2D uDirtMap;
      uniform sampler2D uSandMap;
    ` + shader.fragmentShader;

    // 1. Remove the automatic vertex color multiplication
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      ''
    );

    // 2. Implement our own texture blending logic
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      vec4 grassCol = texture2D(uGrassMap, vMapUv);
      vec4 stoneCol = texture2D(uStoneMap, vMapUv);
      vec4 dirtCol = texture2D(uDirtMap, vMapUv);
      vec4 sandCol = texture2D(uSandMap, vMapUv);
      
      // Calculate sand weight as the "leftover" weight from the RGB channels
      float sandWeight = clamp(1.0 - (vColor.r + vColor.g + vColor.b), 0.0, 1.0);
      
      // Blend all 4 textures based on weights
      vec3 mixedRGB = grassCol.rgb * vColor.r + 
                      stoneCol.rgb * vColor.g + 
                      dirtCol.rgb * vColor.b + 
                      sandCol.rgb * sandWeight;
      
      diffuseColor.rgb *= mixedRGB;
      `
    );
  };

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
          map={grassTexture}
          onBeforeCompile={onBeforeCompile}
          vertexColors 
          roughness={1} 
          metalness={0} 
          side={THREE.DoubleSide}
        />
    </mesh>
  );
});

Terrain.displayName = "Terrain";
