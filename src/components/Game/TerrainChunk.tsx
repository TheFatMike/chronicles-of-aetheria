import React, { useRef, useEffect, useMemo, memo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
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

  const initialWater = useMemo(() => {
    const count = (segments + 1) * (segments + 1);
    return new Float32Array(count); // 1 for water, 0 for none
  }, [segments]);

  const initialWaterLevel = useMemo(() => {
    const count = (segments + 1) * (segments + 1);
    return new Float32Array(count).fill(-1000); // Default far below ground
  }, [segments]);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.setAttribute('color', new THREE.BufferAttribute(initialColors, 3));
    g.setAttribute('aWater', new THREE.BufferAttribute(initialWater, 1));
    g.setAttribute('aWaterLevel', new THREE.BufferAttribute(initialWaterLevel, 1));
    return g;
  }, [size, segments, initialColors, initialWater, initialWaterLevel]);

  useEffect(() => {
    const updateGeometry = (dirtyPoints: any[]) => {
      if (!meshRef.current) return;
      const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const colorAttr = meshRef.current.geometry.attributes.color as THREE.BufferAttribute;
      const waterAttr = meshRef.current.geometry.attributes.aWater as THREE.BufferAttribute;
      const waterLevelAttr = meshRef.current.geometry.attributes.aWaterLevel as THREE.BufferAttribute;
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
            
            if (p.waterLevel !== undefined) {
              waterLevelAttr.setX(idx, p.waterLevel);
            }

            if (p.type === 'water') {
              waterAttr.setX(idx, 1.0);
            } else {
              waterAttr.setX(idx, 0.0);
              const color = TERRAIN_COLORS[p.type as keyof typeof TERRAIN_COLORS] || TERRAIN_COLORS.grass;
              colorAttr.setXYZ(idx, color.r, color.g, color.b);
            }
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        posAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        waterAttr.needsUpdate = true;
        waterLevelAttr.needsUpdate = true;
        meshRef.current.geometry.computeVertexNormals();
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

  const terrainMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uGrassMap: { value: grassTexture },
        uStoneMap: { value: stoneTexture },
        uDirtMap: { value: dirtTexture },
        uSandMap: { value: sandTexture },
        uTime: { value: 0 },
        uLightDir: { value: new THREE.Vector3(0.5, 1.0, 0.7).normalize() },
        uTiling: { value: size / 4.0 }
      },
      vertexColors: true,
      vertexShader: `
        attribute float aWater;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying float vWater;

        void main() {
          vUv = uv;
          vColor = color;
          vWater = aWater;
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
        uniform float uTime;
        uniform float uTiling;
        varying vec2 vUv;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying float vWater;
        
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        
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

          if (vWater > 0.5) {
            float n = noise(tiledUv * 5.0 + uTime * 1.5);
            n += noise(tiledUv * 10.0 - uTime * 0.8) * 0.5;
            vec3 waterCol = mix(vec3(0.03, 0.35, 0.52), vec3(0.4, 0.8, 1.0), n);
            mixedRGB = mix(mixedRGB, waterCol, 0.85);
          }

          float diff = max(dot(normalize(vNormal), uLightDir), 0.3);
          gl_FragColor = vec4(mixedRGB * diff, 1.0);
        }
      `
    });
  }, [size, grassTexture, stoneTexture, dirtTexture, sandTexture]);

  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#0ea5e9") },
        uDeepColor: { value: new THREE.Color("#075985") },
      },
      transparent: true,
      opacity: 0.6,
      vertexShader: `
        attribute float aWaterLevel;
        varying vec2 vUv;
        varying float vElevation;
        varying float vIsWater;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 pos = position;
          if (aWaterLevel > position.z + 0.01) {
            pos.z = aWaterLevel;
            vIsWater = 1.0;
          } else {
            pos.z = -1000.0;
            vIsWater = 0.0;
          }
          
          float elevation = sin(pos.x * 0.2 + uTime) * sin(pos.y * 0.2 + uTime) * 0.1;
          pos.z += elevation;
          vElevation = elevation;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uDeepColor;
        varying vec2 vUv;
        varying float vElevation;
        varying float vIsWater;

        void main() {
          if (vIsWater < 0.5) discard;
          float mixStrength = (vElevation + 0.1) * 5.0;
          vec3 color = mix(uDeepColor, uColor, mixStrength);
          gl_FragColor = vec4(color, 0.7);
        }
      `
    });
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (terrainMaterial.uniforms.uTime) terrainMaterial.uniforms.uTime.value = time;
    if (waterMaterial.uniforms.uTime) waterMaterial.uniforms.uTime.value = time;
  });

  return (
    <group position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh 
        ref={meshRef} 
        name="terrain_chunk"
        receiveShadow 
        geometry={geometry}
        material={terrainMaterial}
        onClick={onClick}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
        userData={{ isCollidable: true, isTerrain: true }}
      />
      <mesh 
        geometry={geometry}
        material={waterMaterial}
        frustumCulled={false}
        userData={{ isWater: true, isCollidable: false }}
      />
    </group>
  );
});

TerrainChunk.displayName = "TerrainChunk";
