/**
 * @file src/components/Game/World.tsx
 * @description Orchestrates the 3D environment and global scene elements.
 * Manages lighting, skybox, stars, and the collection of players and objects within the scene.
 * @importance Critical: The container component that brings together all elements of the 3D game world.
 */
import { memo, useRef, useCallback } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { WorldObjectsRenderer } from "./WorldObjectsRenderer";
import { OBJECT_TEMPLATES } from "../../data/world/templates";
import { EntityRenderer } from "./EntityRenderer";
import { EditorCamera } from "./EditorCamera";
import { Terrain } from "./Terrain";
import { BrushPreview } from "./BrushPreview";
import { OtherPlayers } from "./OtherPlayers";
import { SpawnerRenderer } from "./SpawnerRenderer";

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

const DialogueAutoCloser = memo(() => {
  const { camera } = useThree();
  const activeDialogue = useGameStore(state => state.activeDialogue);
  const setActiveDialogue = useGameStore(state => state.setActiveDialogue);
  const entities = useGameStore(state => state.entities);
  const worldObjects = useGameStore(state => state.worldObjects);

  useFrame(() => {
    if (!activeDialogue) return;

    // Find the speaker's position
    let speakerPos: [number, number, number] | null = null;
    
    // Check dynamic entities first
    if (entities[activeDialogue.npcId]) {
      speakerPos = entities[activeDialogue.npcId].pos;
    } 
    // Check static world objects next
    else if (worldObjects[activeDialogue.npcId]) {
      speakerPos = worldObjects[activeDialogue.npcId].pos;
    }

    if (speakerPos) {
      const state = useGameStore.getState();
      const localPlayer = state.players[state.id || ""];
      if (!localPlayer) return;

      const distSq = (localPlayer.pos[0] - speakerPos[0])**2 + 
                     (localPlayer.pos[2] - speakerPos[2])**2;
      
      // Auto-close if distance > 10 meters (100 square)
      if (distSq > 100) {
        setActiveDialogue(null);
      }
    }
  });

  return null;
});

export const World = memo(({ onAttack, onLoot, socket }: WorldProps & { socket: any }) => {
  const setEditorMousePoint = useGameStore(state => state.setEditorMousePoint);
  const editorSelectedType = useGameStore(state => state.editorSelectedType);
  const isEditorOpen = useGameStore(state => state.isEditorOpen);
  const gridSnap = useGameStore(state => state.gridSnap);
  const brightness = useGameStore(state => state.brightness);

    const lastClickTime = useRef<number>(0);
    const onFloorClick = useCallback((e: any) => {
      const now = Date.now();
      
      // Prevent double-firing from rapid clicks or overlapping meshes
      if (now - lastClickTime.current < 100) return;
      lastClickTime.current = now;

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
    if (!isEditorOpen || !editorSelectedType || editorSelectedType === 'delete' || editorSelectedType === 'edit') {
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
      const resolution = 2; // MUST match Terrain.tsx resolution
      const points = [];
      
      const centerX = Math.round(point.x / resolution) * resolution;
      const centerZ = Math.round(point.z / resolution) * resolution;

      // Capture height for flattening if not already set
      let targetY = 0;
      if (editorSelectedType === 'terrain_flatten') {
        const key = `${Math.round(point.x / resolution) * resolution}_${Math.round(point.z / resolution) * resolution}`;
        targetY = useGameStore.getState().terrainData[key]?.y || 0;
      }

      for (let x = centerX - brushSize; x <= centerX + brushSize; x += resolution) {
        for (let z = centerZ - brushSize; z <= centerZ + brushSize; z += resolution) {
          const dist = Math.sqrt((x - centerX)**2 + (z - centerZ)**2);
          if (dist <= brushSize) {
            const falloff = 1 - (dist / brushSize);
            const update: any = { x, z };
            
            if (editorSelectedType === 'terrain_raise') update.deltaY = strength * falloff;
            if (editorSelectedType === 'terrain_lower') update.deltaY = -strength * falloff;
            if (editorSelectedType === 'terrain_flatten') update.y = targetY;
            
            if (editorSelectedType === 'terrain_paint_grass') update.type = 'grass';
            if (editorSelectedType === 'terrain_paint_dirt') update.type = 'dirt';
            if (editorSelectedType === 'terrain_paint_stone') update.type = 'stone';
            if (editorSelectedType === 'terrain_paint_sand') update.type = 'sand';

            points.push(update);
          }
        }
      }

      if (points.length > 0) {
        // Client-side prediction & Local Buffer: Update local store immediately for instant feedback
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

    const template = OBJECT_TEMPLATES[editorSelectedType];

    // Dispatch custom event for specialized placement (handled by WorldEditor)
    const placeEvent = new CustomEvent('editor_place_object', { 
      detail: { 
        point, 
        type: editorSelectedType,
        modelUrl: template?.modelUrl,
        scale: template?.scale || 1
      } 
    });
    window.dispatchEvent(placeEvent);
  }, [editorSelectedType, gridSnap, isEditorOpen, socket]);

  const handlePointerMove = useCallback((e: any) => {
    if (!isEditorOpen) return;
    
    const { x, y, z } = e.point;
    const lastPoint = useGameStore.getState().editorMousePoint;
    
    // Only update if the mouse has moved more than 0.1m to prevent render-loops
    if (!lastPoint || 
        Math.abs(lastPoint[0] - x) > 0.1 || 
        Math.abs(lastPoint[2] - z) > 0.1) {
      setEditorMousePoint([x, y, z]);
    }
  }, [isEditorOpen, setEditorMousePoint]);

  const handlePointerOut = useCallback(() => {
    setEditorMousePoint(null);
  }, [setEditorMousePoint]);

  return (
    <>
      <color attach="background" args={["#111113"]} />
      <fog attach="fog" args={["#111113", 20, 90]} />
      
      <Sky sunPosition={[10, 5, 20]} turbidity={0.05} rayleigh={2} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.6 * brightness} />
      <MovingShadowLight />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#fcd34d" />
      
      <DialogueAutoCloser />
      <group name="collidables_root">
        <Terrain 
          socket={socket} 
          onClick={onFloorClick} 
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
        />
        
        <BrushPreview />
        <WorldObjectsRenderer socket={socket} />
      </group>
      
      <EntityRenderer onAttack={onAttack} onLoot={onLoot} />
      <OtherPlayers />
      <SpawnerRenderer />
      
      {isEditorOpen && <EditorCamera />}
    </>
  );
});

World.displayName = "World";
