/**
 * @file src/components/Game/WorldObjectsRenderer.tsx
 * @description Efficiently renders large numbers of static world objects.
 * Utilizes spatial partitioning and filtering to only render objects within the player's vicinity.
 * @importance Essential: Crucial for maintaining high frame rates in complex environments with many objects.
 */
import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { EditorGizmo } from "./EditorGizmo";
import { WorldObjectItem } from "./WorldObjectItem";
import { PlacementGhost } from "./PlacementGhost";

// Shared frustum for zero-allocation culling across all items
export const SHARED_FRUSTUM = new THREE.Frustum();
const PROJ_SCREEN_MATRIX = new THREE.Matrix4();

export const WorldObjectsRenderer = memo(({ socket }: { socket: any }) => {
  // Use shallow selector for objects list to avoid re-renders if content doesn't change
  const editorSelectedType = useGameStore(state => state.editorSelectedType);
  const isEditorOpen = useGameStore(state => state.isEditorOpen);
  const selectedWorldObjectId = useGameStore(state => state.selectedWorldObjectId);
  const setSelectedWorldObjectId = useGameStore(state => state.setSelectedWorldObjectId);
  const setTransforming = useGameStore(state => state.setTransforming);
  const isTransforming = useGameStore(state => state.isTransforming);

  const transformMode = useGameStore(state => state.editorTransformMode);
  const setTransformMode = useGameStore(state => state.setEditorTransformMode);
  const gridSnap = useGameStore(state => state.gridSnap);

  const [nearbyObjects, setNearbyObjects] = useState<any[]>([]);
  const { camera } = useThree();
  const lastCullPos = useRef(new THREE.Vector3());

  // 1. Spatial Culling (Reactive): Only update when player moves > 5m or objects change
  useEffect(() => {
    const updateNearby = () => {
      const state = useGameStore.getState();
      const localPlayer = state.players[state.id || ""];
      if (!localPlayer) return;

      const playerPos = new THREE.Vector3(localPlayer.pos[0], localPlayer.pos[1], localPlayer.pos[2]);
      
      const currentObjects = Object.values(state.worldObjects);
      const distMoved = playerPos.distanceTo(lastCullPos.current);
      
      // Optimization: Only re-filter if we moved significantly OR if the object count changed
      // However, we MUST allow updates if the selected object is being edited
      if (distMoved < 5 && currentObjects.length === nearbyObjects.length && nearbyObjects.length > 0) {
        // Even if we don't re-filter the whole list, we need to ensure the objects themselves are fresh
        // The most robust way is to re-filter if any object in the current nearby list has changed
        let anyChanged = false;
        for (const obj of nearbyObjects) {
          if (state.worldObjects[obj.id] !== obj) {
            anyChanged = true;
            break;
          }
        }
        if (!anyChanged) return;
      }

      lastCullPos.current.copy(playerPos);
      
      const CULL_DISTANCE_SQ = 300 * 300;
      const filtered = currentObjects.filter(obj => {
        if (selectedWorldObjectId === obj.id) return true;
        const dx = obj.pos[0] - localPlayer.pos[0];
        const dz = obj.pos[2] - localPlayer.pos[2];
        return (dx*dx + dz*dz) < CULL_DISTANCE_SQ;
      });
      
      setNearbyObjects(filtered);
    };

    // Subscribing to worldObjects changes OR moving enough
    const unsubscribe = useGameStore.subscribe(
      (state) => state.worldObjects,
      () => updateNearby()
    );

    // Also check on camera/player movement via interval (but with a move threshold)
    const interval = setInterval(updateNearby, 500);
    
    updateNearby();
    return () => {
      unsubscribe();
      clearInterval(interval);
    }
  }, [selectedWorldObjectId, camera]); 

  // 2. High-Speed Frustum Update (Every Frame): Updates shared frustum for children
  useFrame(() => {
    PROJ_SCREEN_MATRIX.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    SHARED_FRUSTUM.setFromProjectionMatrix(PROJ_SCREEN_MATRIX);
  });

  const [transformRef, setTransformRef] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    if (!selectedWorldObjectId || !isEditorOpen) setTransformRef(null);
  }, [selectedWorldObjectId, isEditorOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditorOpen) return;
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      const key = e.key.toLowerCase();
      if (key === 'g') setTransformMode('translate');
      if (key === 'r') setTransformMode('rotate');
      if (key === 'k') setTransformMode('scale');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen, setTransformMode]);

  const onTransformChange = useCallback(() => {
    if (!selectedWorldObjectId || !transformRef || !isTransforming) return;
    const { position, rotation, scale } = transformRef;
    
    useGameStore.getState().updateWorldObject(selectedWorldObjectId, {
      pos: [position.x, position.y, position.z],
      rot: [rotation.x, rotation.y, rotation.z],
      scale: [scale.x, scale.y, scale.z]
    });
  }, [selectedWorldObjectId, transformRef, isTransforming]);

  const onTransformMouseUp = useCallback(() => {
    setTransforming(false);
    
    // If we just finished moving a water source, trigger a re-flood at the new height
    if (selectedWorldObjectId) {
      const obj = useGameStore.getState().worldObjects[selectedWorldObjectId];
      if (obj?.type === 'water_source') {
        useGameStore.getState().floodFillWater(
          Math.round(obj.pos[0] / 2) * 2,
          Math.round(obj.pos[2] / 2) * 2,
          obj.pos[1]
        );
      }
    }
  }, [setTransforming, selectedWorldObjectId]);

  const onTransformStart = useCallback(() => {
    setTransforming(true);
  }, [setTransforming]);

  return (
    <>
      <EditorGizmo 
        transformRef={transformRef}
        mode={transformMode}
        gridSnap={gridSnap}
        onStart={onTransformStart}
        onEnd={onTransformMouseUp}
        onChange={onTransformChange}
      />

      {isEditorOpen && editorSelectedType && (
        <PlacementGhost editorSelectedType={editorSelectedType} gridSnap={gridSnap} />
      )}

      {nearbyObjects.map(obj => (
        <WorldObjectItem 
          key={obj.id} 
          obj={obj}
          isSelected={selectedWorldObjectId === obj.id}
          isEditorOpen={isEditorOpen}
          editorSelectedType={editorSelectedType}
          socket={socket}
          setSelectedWorldObjectId={setSelectedWorldObjectId}
          setTransformRef={setTransformRef}
        />
      ))}
    </>
  );
});

WorldObjectsRenderer.displayName = "WorldObjectsRenderer";
