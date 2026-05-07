import { memo, useRef, useState } from "react";
import * as THREE from "three";
import { Sky, Stars, Plane, OrbitControls } from "@react-three/drei";
import { OtherPlayer } from "./OtherPlayer";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { GAME_CONFIG } from "../../config";
import { WorldObjectsRenderer } from "./WorldObjectsRenderer";
import { SpawnerBeacons } from "./SpawnerBeacons";
import { EntityRenderer } from "./EntityRenderer";
import { EditorCamera } from "./EditorCamera";
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
    // Only place on left click (button 0)
    if (e.button !== 0) return;
    if (!editorSelectedType || editorSelectedType === 'delete' || editorSelectedType === 'edit') return;
    e.stopPropagation();
    
    let { point } = e;
    
    // Apply grid snap to placement
    if (gridSnap) {
      point = new THREE.Vector3(
        Math.round(point.x * 2) / 2,
        point.y,
        Math.round(point.z * 2) / 2
      );
    }

    // Dispatch custom event for specialized placement (like waypoints with auto-increment)
    const placeEvent = new CustomEvent('editor_place_object', { 
      detail: { point, type: editorSelectedType } 
    });
    window.dispatchEvent(placeEvent);

    if (socket && editorSelectedType !== 'waypoint') {
      // Standard placement for everything else
      const jitter = e.shiftKey ? 0.2 : 0;
      const rx = (Math.random() - 0.5) * jitter;
      const rz = (Math.random() - 0.5) * jitter;

      socket.emit("save_world_object", {
        id: crypto.randomUUID(),
        type: editorSelectedType,
        pos: [point.x + rx, 0, point.z + rz],
        rot: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.8 + Math.random() * 0.4
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
      />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#fcd34d" />
      
      <Plane 
        args={[GAME_CONFIG.WORLD.SIZE, GAME_CONFIG.WORLD.SIZE]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
        onClick={onFloorClick}
      >
        <meshStandardMaterial color="#14532d" roughness={0.9} metalness={0.05} />
      </Plane>
      
      <Plane args={[GAME_CONFIG.WORLD.STARTING_PLAZA_SIZE, GAME_CONFIG.WORLD.STARTING_PLAZA_SIZE]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <meshStandardMaterial color="#44403c" roughness={1} />
      </Plane>
      
      {/* Entities */}
      <EntityRenderer entities={entities} onAttack={onAttack} onLoot={onLoot} />


      {/* Other Players */}
      {players.map(pid => pid !== currentPlayerId && (
        <OtherPlayer key={pid} id={pid} />
      ))}

      {/* Portal */}
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
