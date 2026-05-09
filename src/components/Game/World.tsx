import { memo, useRef, useState } from "react";
import * as THREE from "three";
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

export const World = memo(({ onAttack, onLoot, socket }: WorldProps & { socket: any }) => {
  const entities = useGameStore(useShallow(state => Object.values(state.entities)));
  const players = useGameStore(useShallow(state => Object.keys(state.players)));
  const spawners = useGameStore(useShallow(state => Object.values(state.spawners)));
  const currentPlayerId = useGameStore(state => state.id);
  const editorSelectedType = useGameStore(state => state.editorSelectedType);
  const devMode = useGameStore(state => state.devMode);
  const isEditorOpen = useGameStore(state => state.isEditorOpen);
  const gridSnap = useGameStore(state => state.gridSnap);

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
      const brushSize = e.shiftKey ? 12 : 6;
      const strength = 0.5;
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
      socket.emit("save_world_object", {
        id: crypto.randomUUID(),
        type: editorSelectedType,
        pos: [point.x, point.y, point.z], // Use precise Y for placement on hills
        rot: [0, Math.random() * Math.PI * 2, 0],
        scale: (template?.scale || 1) * (0.9 + Math.random() * 0.2),
        modelUrl: template?.modelUrl
      });
    }
  };

  return (
    <>
      <Sky sunPosition={[10, 5, 20]} turbidity={0.05} rayleigh={2} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[20, 50, 10]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-camera-far={200}
      />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#fcd34d" />
      
      <Terrain socket={socket} onClick={onFloorClick} />
      
      <Plane 
        args={[GAME_CONFIG.WORLD.STARTING_PLAZA_SIZE, GAME_CONFIG.WORLD.STARTING_PLAZA_SIZE]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.02, 0]} 
        receiveShadow
        onClick={onFloorClick}
      >
        <meshStandardMaterial color="#44403c" roughness={1} />
      </Plane>
      
      <EntityRenderer entities={entities} onAttack={onAttack} onLoot={onLoot} />

      {players.map(pid => pid !== currentPlayerId && (
        <OtherPlayer key={pid} id={pid} />
      ))}

      <group position={[0, 0, -30]}>
        <mesh position={[0, 2, 0]} castShadow>
          <octahedronGeometry args={[2]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.8} emissive="#0ea5e9" emissiveIntensity={2} />
        </mesh>
        <pointLight position={[0, 2, 0]} intensity={2} color="#0ea5e9" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <circleGeometry args={[5, 32]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.3} emissive="#0ea5e9" emissiveIntensity={1} />
        </mesh>
      </group>

      <WorldObjectsRenderer socket={socket} />
      {devMode && isEditorOpen && spawners.length > 0 && (
        <SpawnerBeacons spawners={spawners} entities={entities} />
      )}
      
      {isEditorOpen && <EditorCamera />}
    </>
  );
});

World.displayName = "World";
