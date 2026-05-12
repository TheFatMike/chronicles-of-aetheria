/**
 * @file src/components/Game/Terrain.tsx
 * @description Generates and renders the procedural terrain mesh.
 * Dynamically updates vertex positions and colors based on heightmap data and sculpting actions.
 * @importance Critical: Provides the physical and visual ground for the entire game world.
 */
import React, { useRef, useEffect, useMemo, memo, useCallback } from "react";
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

import { TerrainChunk } from "./TerrainChunk";

interface TerrainProps {
  socket: any;
  onClick?: (e: any) => void;
  onPointerMove?: (e: any) => void;
  onPointerOut?: () => void;
}

export const Terrain = memo(({ socket, onClick, onPointerMove, onPointerOut }: TerrainProps) => {
  const size = GAME_CONFIG.WORLD.SIZE;
  const resolution = 2; 
  const CHUNK_SIZE = 100;
  const chunksAcross = Math.ceil(size / CHUNK_SIZE);
  
  const grassTexture = useTexture("/assets/textures/grass.png");
  const stoneTexture = useTexture("/assets/textures/stone.png");
  const dirtTexture = useTexture("/assets/textures/dirt.png");
  const sandTexture = useTexture("/assets/textures/sand.png");

  const textures = useMemo(() => {
    [grassTexture, stoneTexture, dirtTexture, sandTexture].forEach(tex => {
      if (tex) {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(CHUNK_SIZE / 4, CHUNK_SIZE / 4);
        tex.anisotropy = 4;
      }
    });
    return { grassTexture, stoneTexture, dirtTexture, sandTexture };
  }, [grassTexture, stoneTexture, dirtTexture, sandTexture]);

  const chunkList = useMemo(() => {
    const list = [];
    const halfSize = size / 2;
    const halfChunk = CHUNK_SIZE / 2;
    
    for (let x = -halfSize + halfChunk; x < halfSize; x += CHUNK_SIZE) {
      for (let z = -halfSize + halfChunk; z < halfSize; z += CHUNK_SIZE) {
        list.push({ x, z, id: `${x}_${z}` });
      }
    }
    return list;
  }, [size]);

  return (
    <group name="terrain_root">
      {/* Visual Terrain in chunks for Frustum Culling */}
      {chunkList.map(c => (
        <TerrainChunk 
          key={c.id}
          x={c.x}
          z={c.z}
          size={CHUNK_SIZE}
          segments={Math.floor(CHUNK_SIZE / resolution)}
          resolution={resolution}
          textures={textures}
          onClick={onClick}
          onPointerMove={onPointerMove}
          onPointerOut={onPointerOut}
        />
      ))}
    </group>
  );
});

Terrain.displayName = "Terrain";
