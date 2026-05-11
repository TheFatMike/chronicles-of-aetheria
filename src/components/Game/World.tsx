/**
 * @file src/components/Game/World.tsx
 * @description Orchestrates the 3D environment and global scene elements.
 * Manages lighting, skybox, stars, and the collection of players and objects within the scene.
 * @importance Critical: The container component that brings together all elements of the 3D game world.
 */
import { memo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { Sky, Stars, Plane, OrbitControls } from "@react-three/drei";
import { OtherPlayer } from "./OtherPlayer";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { GAME_CONFIG } from "../../config";
import { WorldObjectsRenderer } from "./WorldObjectsRenderer";
import { OBJECT_TEMPLATES } from "../../data/world/templates";
import { SpawnerBeacons } from "./SpawnerBeacons";
import { EntityRenderer } from "./EntityRenderer";
import { EditorCamera } from "./EditorCamera";
import { Terrain } from "./Terrain";

interface WorldProps {
  onAttack?: () => void;
  onLoot?: (id: string) => void;
}

const MovingShadowLight = memo(() => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();
  const brightness = useGameStore(state => state.brightness);

  useFrame(() => {
    if (lightRef.current) {
      // Keep the light centered on the camera (player)
      lightRef.current.position.set(
        camera.position.x + 20,
        50,
        camera.position.z + 10
      );
      lightRef.current.target.position.set(
        camera.position.x,
        0,
        camera.position.z
      );
      lightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <directionalLight 
      ref={lightRef}
      intensity={1.5 * brightness} 
      castShadow 
      shadow-mapSize={[128, 128]}
      shadow-camera-left={-20}
      shadow-camera-right={20}
      shadow-camera-top={20}
      shadow-camera-bottom={-20}
      shadow-camera-near={0.1}
      shadow-camera-far={40}
      shadow-bias={-0.01}
    >
      <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20, 0.1, 40]} />
    </directionalLight>
  );
});

export const World = memo(({ onAttack, onLoot, socket }: WorldProps & { socket: any }) => {
  const entities = useGameStore(useShallow(state => Object.values(state.entities)));
  const players = useGameStore(useShallow(state => Object.keys(state.players)));
  const spawners = useGameStore(useShallow(state => Object.values(state.spawners)));
  const currentPlayerId = useGameStore(state => state.id);
  const editorSelectedType = useGameStore(state => state.editorSelectedType);
  const devMode = useGameStore(state => state.devMode);
  const isEditorOpen = useGameStore(state => state.isEditorOpen);
  const gridSnap = useGameStore(state => state.gridSnap);
  const brightness = useGameStore(state => state.brightness);

  const onFloorClick = (e: any) => {
    // Only place/interact on left click (button 0)
    if (e.button !== 0) return;
    
    // Only clear target if the floor is the FIRST thing we hit (not clicking through to something else)
    if (e.intersections[0]?.object !== e.eventObject) return;

    // Don't clear target if we're hovering over something else (UI or Entity)
    const isHoveringOther = document.body.classList.contains('npc-hover') || 
                           document.body.classList.contains('enemy-hover') || 
                           document.body.classList.contains('loot-hover') ||
                           document.body.classList.contains('player-hover');
    if (isHoveringOther) return;

    // Clear target when clicking ground (if not in editor placement mode)
    if (!editorSelectedType || editorSelectedType === 'delete' || editorSelectedType === 'edit') {
      useGameStore.getState().setTarget(null);
      return;
    }

    e.stopPropagation();
    let { point } = e;
    
    // Terrain Sculpting Logic
    if (editorSelectedType.startsWith('terrain_')) {
      const { editorBrushSize, editorBrushStrength } = useGameStore.getState();
      const brushSize = editorBrushSize;
      const strength = editorBrushStrength;
      const resolution = 4; // MUST match Terrain.tsx resolution
      const points = [];
      
      const centerX = Math.round(point.x / resolution) * resolution;
      const centerZ = Math.round(point.z / resolution) * resolution;

      for (let x = centerX - brushSize; x <= centerX + brushSize; x += resolution) {
        for (let z = centerZ - brushSize; z <= centerZ + brushSize; z += resolution) {
          const dist = Math.sqrt((x - centerX)**2 + (z - centerZ)**2);
          if (dist <= brushSize) {
            const falloff = 1 - (dist / brushSize);
            const update: any = { x, z };
            
            if (editorSelectedType === 'terrain_raise') update.deltaY = strength * falloff;
            if (editorSelectedType === 'terrain_lower') update.deltaY = -strength * falloff;
            if (editorSelectedType === 'terrain_flatten') update.y = 0;
            
            if (editorSelectedType === 'terrain_paint_grass') update.type = 'grass';
            if (editorSelectedType === 'terrain_paint_dirt') update.type = 'dirt';
            if (editorSelectedType === 'terrain_paint_stone') update.type = 'stone';
            if (editorSelectedType === 'terrain_paint_sand') update.type = 'sand';

            points.push(update);
          }
        }
      }

      if (socket && points.length > 0) {
        socket.emit("update_terrain", { points });
        // Client-side prediction: Update local store immediately for instant feedback
        useGameStore.getState().updateTerrainData(points);
      }
      return;
    }

    // Apply grid snap to placement
    if (gridSnap) {
      point = new THREE.Vector3(
        Math.round(point.x * 2) / 2,
        point.y,
        Math.round(point.z * 2) / 2
      );
    }

    // Dispatch custom event for specialized placement
    const placeEvent = new CustomEvent('editor_place_object', { 
      detail: { point, type: editorSelectedType } 
    });
    window.dispatchEvent(placeEvent);

    if (socket && editorSelectedType !== 'waypoint') {
      const template = OBJECT_TEMPLATES[editorSelectedType];
      const isSpawner = editorSelectedType.startsWith('spawner_');
      const spawnerClass = isSpawner ? editorSelectedType.replace('spawner_', '') : undefined;
      
      socket.emit("save_world_object", {
        id: crypto.randomUUID(),
        type: editorSelectedType,
        pos: [point.x, point.y, point.z],
        rot: isSpawner ? [0, 0, 0] : [0, Math.random() * Math.PI * 2, 0],
        scale: isSpawner ? 1 : (template?.scale || 1) * (0.9 + Math.random() * 0.2),
        modelUrl: template?.modelUrl,
        // Spawner logic defaults
        entityClass: spawnerClass,
        level: isSpawner ? 1 : undefined,
        spawnRadius: isSpawner ? 5 : undefined,
        maxEntities: isSpawner ? 3 : undefined,
        respawnTime: isSpawner ? 10 : undefined,
        pathId: isSpawner ? '' : undefined
      });
    }
  };

  return (
    <>
      <color attach="background" args={["#111113"]} />
      <fog attach="fog" args={["#111113", 20, 90]} />
      
      <Sky sunPosition={[10, 5, 20]} turbidity={0.05} rayleigh={2} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.6 * brightness} />
      <MovingShadowLight />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#fcd34d" />
      
      <group name="collidables_root">
        <Terrain socket={socket} onClick={onFloorClick} />
        

        <WorldObjectsRenderer socket={socket} />
      </group>
      
      <EntityRenderer entities={entities} onAttack={onAttack} onLoot={onLoot} />

      {players.map(pid => pid !== currentPlayerId && (
        <OtherPlayer key={pid} id={pid} />
      ))}

      {devMode && isEditorOpen && spawners.length > 0 && (
        <SpawnerBeacons spawners={spawners} entities={entities} />
      )}
      
      {isEditorOpen && <EditorCamera />}
    </>
  );
});

World.displayName = "World";
