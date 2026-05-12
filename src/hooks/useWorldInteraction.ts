import { useThree } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../store/useGameStore";
import { OBJECT_TEMPLATES } from "../data/world/templates";

export const useWorldInteraction = (socket: any) => {
  const setEditorMousePoint = useGameStore(state => state.setEditorMousePoint);
  const editorSelectedType = useGameStore(state => state.editorSelectedType);
  const isEditorOpen = useGameStore(state => state.isEditorOpen);
  const gridSnap = useGameStore(state => state.gridSnap);

  const lastClickTime = useRef<number>(0);

  const { raycaster, mouse, camera, scene } = useThree();

  const onFloorClick = useCallback((e: any) => {
    const now = Date.now();
    
    // Prevent double-firing from rapid clicks or overlapping meshes
    if (now - lastClickTime.current < 100) return;
    lastClickTime.current = now;

    // Only place/interact on left click (button 0)
    if (e.button !== 0) return;
    
    // In Editor mode, we allow clicking on anything to place on top of it.
    // In normal play mode, we check if we hit the floor first.
    if (!isEditorOpen && e.intersections[0]?.object !== e.eventObject) return;

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

    // EXPLICIT RAYCAST: Find the highest collidable surface
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    const collidableHits = intersects.filter(hit => {
      if (hit.object.name === 'placement_ghost' || hit.object.userData?.isGhost || hit.object.name.includes('editor_helper')) return false;
      return hit.object.userData?.isCollidable || hit.object.parent?.userData?.isCollidable || (hit.object.parent as any)?.isWorldObject;
    });

    if (collidableHits.length === 0) return;

    // Pick the HIGHEST surface
    const highestHit = collidableHits.reduce((highest, current) => {
      return (current.point.y > highest.point.y) ? current : highest;
    }, collidableHits[0]);

    let point = highestHit.point.clone();
    
    // Terrain Sculpting Logic
    if (editorSelectedType.startsWith('terrain_')) {
      const { editorBrushSize, editorBrushStrength } = useGameStore.getState();
      const brushSize = editorBrushSize;
      const strength = editorBrushStrength;
      const resolution = 2; 
      const points = [];
      
      const centerX = Math.round(point.x / resolution) * resolution;
      const centerZ = Math.round(point.z / resolution) * resolution;

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
        useGameStore.getState().updateTerrainData(points);
      }
      return;
    }

    // Apply grid snap to placement
    if (gridSnap) {
      point.set(
        Math.round(point.x * 2) / 2,
        point.y,
        Math.round(point.z * 2) / 2
      );
    }

    const template = OBJECT_TEMPLATES[editorSelectedType as keyof typeof OBJECT_TEMPLATES];

    const placeEvent = new CustomEvent('editor_place_object', { 
      detail: { 
        point: [point.x, point.y, point.z], 
        type: editorSelectedType,
        modelUrl: template?.modelUrl,
        scale: template?.scale || 1
      } 
    });
    window.dispatchEvent(placeEvent);
  }, [editorSelectedType, gridSnap, isEditorOpen, socket, raycaster, mouse, camera, scene]);

  const handlePointerMove = useCallback((e: any) => {
    if (!isEditorOpen) return;
    
    const { x, y, z } = e.point;
    const lastPoint = useGameStore.getState().editorMousePoint;
    
    if (!lastPoint || 
        Math.abs(lastPoint[0] - x) > 0.1 || 
        Math.abs(lastPoint[2] - z) > 0.1) {
      setEditorMousePoint([x, y, z]);
    }
  }, [isEditorOpen, setEditorMousePoint]);

  const handlePointerOut = useCallback(() => {
    setEditorMousePoint(null);
  }, [setEditorMousePoint]);

  return { onFloorClick, handlePointerMove, handlePointerOut };
};
