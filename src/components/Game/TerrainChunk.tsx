import React, { useRef, useEffect, useMemo, memo } from "react";
import * as THREE from "three";
import { useGameStore } from "../../store/useGameStore";

const TERRAIN_COLORS = {
  grass: new THREE.Color(1, 0, 0),
  dirt: new THREE.Color(0, 0, 1),
  stone: new THREE.Color(0, 1, 0),
  sand: new THREE.Color(0, 0, 0),
};

interface ChunkProps {
  x: number;
  z: number;
  size: number;
  segments: number;
  resolution: number;
  textures: any;
  onClick?: (e: any) => void;
  onPointerMove?: (e: any) => void;
  onPointerOut?: () => void;
}

export const TerrainChunk = memo(({ x, z, size, segments, resolution, textures, onClick, onPointerMove, onPointerOut }: ChunkProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { grassTexture, stoneTexture, dirtTexture, sandTexture } = textures;

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

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.setAttribute('color', new THREE.BufferAttribute(initialColors, 3));
    return g;
  }, [size, segments, initialColors]);

  useEffect(() => {
    const updateGeometry = (dirtyPoints: any[]) => {
      if (!meshRef.current) return;
      const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const colorAttr = meshRef.current.geometry.attributes.color as THREE.BufferAttribute;
      let hasChanges = false;

      const halfSize = size / 2;
      const chunkLeft = x - halfSize;
      const chunkRight = x + halfSize;
      const chunkTop = z - halfSize;
      const chunkBottom = z + halfSize;

      for (const p of dirtyPoints) {
        if (p.x >= chunkLeft - 1 && p.x <= chunkRight + 1 && p.z >= chunkTop - 1 && p.z <= chunkBottom + 1) {
          const localX = p.x - chunkLeft;
          const localZ = p.z - chunkTop;
          const col = Math.round(localX / resolution);
          const row = Math.round(localZ / resolution);
          
          if (col >= 0 && col <= segments && row >= 0 && row <= segments) {
            const idx = row * (segments + 1) + col;
            posAttr.setZ(idx, p.y);
            const color = TERRAIN_COLORS[p.type as keyof typeof TERRAIN_COLORS] || TERRAIN_COLORS.grass;
            colorAttr.setXYZ(idx, color.r, color.g, color.b);
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        meshRef.current.geometry.computeVertexNormals();
        meshRef.current.geometry.computeBoundingBox();
        meshRef.current.geometry.computeBoundingSphere();
      }
    };

    const allData = useGameStore.getState().terrainData;
    const chunkData = Object.entries(allData).map(([key, val]) => {
      const [px, pz] = key.split('_').map(Number);
      return { x: px, z: pz, ...val };
    }).filter(p => p.x >= x - size/2 - 1 && p.x <= x + size/2 + 1 && p.z >= z - size/2 - 1 && p.z <= z + size/2 + 1);
    
    if (chunkData.length > 0) updateGeometry(chunkData);

    const unsubscribe = useGameStore.subscribe(
      (state) => state.terrainDirtyPoints,
      (points) => updateGeometry(points)
    );

    return () => unsubscribe();
  }, [x, z, size, segments, resolution]);

  // Use a TRULY simplified ShaderMaterial to avoid ALL Three.js internal include errors
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uGrassMap: { value: grassTexture },
        uStoneMap: { value: stoneTexture },
        uDirtMap: { value: dirtTexture },
        uSandMap: { value: sandTexture },
        uLightDir: { value: new THREE.Vector3(0.5, 1.0, 0.7).normalize() },
        uTiling: { value: size / 4.0 }
      },
      vertexColors: true,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vColor = color;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uGrassMap;
        uniform sampler2D uStoneMap;
        uniform sampler2D uDirtMap;
        uniform sampler2D uSandMap;
        uniform vec3 uLightDir;
        uniform float uTiling;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vNormal;
        
        void main() {
          vec2 tiledUv = vUv * uTiling;
          vec4 grassCol = texture2D(uGrassMap, tiledUv);
          vec4 stoneCol = texture2D(uStoneMap, tiledUv);
          vec4 dirtCol = texture2D(uDirtMap, tiledUv);
          vec4 sandCol = texture2D(uSandMap, tiledUv);
          
          float sandWeight = clamp(1.0 - (vColor.r + vColor.g + vColor.b), 0.0, 1.0);
          vec3 mixedRGB = grassCol.rgb * vColor.r + 
                          stoneCol.rgb * vColor.g + 
                          dirtCol.rgb * vColor.b + 
                          sandCol.rgb * sandWeight;

          float diff = max(dot(normalize(vNormal), uLightDir), 0.3);
          gl_FragColor = vec4(mixedRGB * diff, 1.0);
        }
      `
    });
  }, [size, grassTexture, stoneTexture, dirtTexture, sandTexture]);

  return (
    <mesh 
      ref={meshRef} 
      name="terrain_chunk"
      position={[x, 0, z]} 
      rotation={[-Math.PI / 2, 0, 0]} 
      receiveShadow 
      geometry={geometry}
      material={material}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
      userData={{ isCollidable: true, isTerrain: true }}
    />
  );
});

TerrainChunk.displayName = "TerrainChunk";
