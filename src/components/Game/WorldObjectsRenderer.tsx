import { memo, useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { OBJECT_TEMPLATES } from "../../data/world/templates";
import { Tree, Rock, House, Tent, Bush, Fence, Campfire, Barrel, Dummy, Chest, Well, SignPost, Waypoint } from "./Environment";
import { TransformControls } from "@react-three/drei";

// Isolated Gizmo component to prevent re-rendering when world objects change
const EditorGizmo = memo(({ 
  transformRef, 
  mode, 
  gridSnap, 
  onStart, 
  onEnd, 
  onChange 
}: { 
  transformRef: THREE.Object3D | null, 
  mode: 'translate' | 'rotate' | 'scale', 
  gridSnap: boolean,
  onStart: () => void,
  onEnd: () => void,
  onChange: () => void
}) => {
  if (!transformRef) return null;

  return (
    <TransformControls
      makeDefault
      object={transformRef}
      mode={mode}
      space="world"
      translationSnap={gridSnap ? 0.5 : null}
      rotationSnap={gridSnap ? Math.PI / 12 : null}
      scaleSnap={gridSnap ? 0.1 : null}
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onChange={onChange}
    />
  );
});

EditorGizmo.displayName = "EditorGizmo";

import { GLBModel } from "./GLBModel";

const WorldObjectItem = memo(({ 
  obj, 
  isSelected, 
  isEditorOpen, 
  editorSelectedType, 
  socket, 
  setSelectedWorldObjectId,
  setTransformRef 
}: { 
  obj: any, 
  isSelected: boolean, 
  isEditorOpen: boolean, 
  editorSelectedType: string | null, 
  socket: any,
  setSelectedWorldObjectId: (id: string | null) => void,
  setTransformRef: (node: THREE.Object3D | null) => void
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Hand off ref for gizmo
  useEffect(() => {
    if (isSelected && isEditorOpen && groupRef.current) {
      setTransformRef(groupRef.current);
    }
  }, [isSelected, isEditorOpen, obj.id, setTransformRef]);

  const modelProps = {
    onClick: (e: any) => {
      if (!isEditorOpen) return;
      
      // If we are in placement mode, let the click pass through to the floor
      const isPlacing = editorSelectedType && !['edit', 'delete'].includes(editorSelectedType);
      if (isPlacing) return;

      e.stopPropagation();
      if (e.shiftKey || editorSelectedType === 'delete') {
        if (socket) socket.emit("remove_world_object", { id: obj.id });
      } else if (editorSelectedType === 'edit' || !editorSelectedType) {
        setSelectedWorldObjectId(obj.id);
      }
    }
  };

  return (
    <group 
      position={obj.pos} 
      rotation={obj.rot} 
      ref={groupRef}
    >
      {/* Model Group - Scaled */}
      <group scale={obj.scale}>
        {/* Priority 1: Custom GLB Model */}
        {obj.modelUrl ? (
          <GLBModel url={obj.modelUrl} {...modelProps} />
        ) : (
          /* Priority 2: Built-in Procedural Models */
          <>
            {obj.type === 'tree' && <Tree {...modelProps} />}
            {obj.type === 'rock' && <Rock {...modelProps} />}
            {obj.type === 'house' && <House {...modelProps} />}
            {obj.type === 'tent' && <Tent {...modelProps} />}
            {obj.type === 'bush' && <Bush {...modelProps} />}
            {obj.type === 'fence' && <Fence {...modelProps} />}
            {obj.type === 'campfire' && <Campfire {...modelProps} />}
            {obj.type === 'barrel' && <Barrel {...modelProps} />}
            {obj.type === 'dummy' && <Dummy {...modelProps} />}
            {obj.type === 'chest' && <Chest {...modelProps} />}
            {obj.type === 'well' && <Well {...modelProps} />}
            {obj.type === 'signpost' && <SignPost {...modelProps} />}
            {obj.type === 'waypoint' && <Waypoint {...modelProps} />}
          </>
        )}

        {(obj.type.startsWith('spawner_') || obj.type.startsWith('npc_')) && isEditorOpen && (
          <mesh {...modelProps}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial 
              color={obj.type.startsWith('npc_') ? '#3b82f6' : (editorSelectedType ? '#ef4444' : '#6b21a8')} 
              wireframe 
            />
          </mesh>
        )}
      </group>

      {/* Hitboxes are now handled automatically by Mesh Collision on the client. */}

      {/* Permanent visual indicator so we know it's there even if model is missing */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} name="editor_helper">
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color={obj.modelUrl ? "#3b82f6" : "#ffffff"} transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} name="editor_helper">
          <ringGeometry args={[1.5, 1.6, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
});

WorldObjectItem.displayName = "WorldObjectItem";

const PlacementGhost = memo(({ editorSelectedType, gridSnap }: { editorSelectedType: string | null, gridSnap: boolean }) => {
  const [pos, setPos] = useState<[number, number, number]>([0, 0, 0]);
  const { scene, raycaster, mouse, camera } = useThree();

  useFrame(() => {
    if (!editorSelectedType || editorSelectedType === 'delete' || editorSelectedType === 'edit') return;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    const floor = intersects.find(i => i.object.type === 'Mesh' && (i.object as any).geometry?.type === 'PlaneGeometry');
    
    if (floor) {
      let p = floor.point;
      if (gridSnap) {
        p.set(
          Math.round(p.x * 2) / 2,
          p.y,
          Math.round(p.z * 2) / 2
        );
      }
      setPos([p.x, p.y + 0.1, p.z]);
    }
  });

  if (!editorSelectedType || editorSelectedType === 'delete' || editorSelectedType === 'edit') return null;

  // Use the same logic as WorldObjectItem but with ghost material
  const template = OBJECT_TEMPLATES[editorSelectedType];
  const ghostProps = { position: pos, scale: template?.scale || 1, rotation: [0, 0, 0] as [number, number, number] };
  
  return (
    <group position={pos} scale={1} rotation={[0, 0, 0]} raycast={() => null}>
      <group>
        {/* If the template has a modelUrl, show the GLB ghost! */}
        {template?.modelUrl ? (
          <GLBModel url={template.modelUrl} {...ghostProps} castShadow={false} />
        ) : (
          <>
            {editorSelectedType === 'tree' && <Tree {...ghostProps} />}
            {editorSelectedType === 'rock' && <Rock {...ghostProps} />}
            {editorSelectedType === 'house' && <House {...ghostProps} />}
            {editorSelectedType === 'tent' && <Tent {...ghostProps} />}
            {editorSelectedType === 'bush' && <Bush {...ghostProps} />}
            {editorSelectedType === 'fence' && <Fence {...ghostProps} />}
            {editorSelectedType === 'campfire' && <Campfire {...ghostProps} />}
            {editorSelectedType === 'barrel' && <Barrel {...ghostProps} />}
            {editorSelectedType === 'dummy' && <Dummy {...ghostProps} />}
            {editorSelectedType === 'chest' && <Chest {...ghostProps} />}
            {editorSelectedType === 'well' && <Well {...ghostProps} />}
            {editorSelectedType === 'signpost' && <SignPost {...ghostProps} />}
            {editorSelectedType === 'waypoint' && <Waypoint {...ghostProps} />}
          </>
        )}
      </group>
      {/* Visual aid for exact center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>
    </group>
  );
});

export const WorldObjectsRenderer = memo(({ socket }: { socket: any }) => {
  // Use shallow selector for objects list to avoid re-renders if content doesn't change
  const worldObjects = useGameStore(useShallow(state => Object.values(state.worldObjects)));
  
  const editorSelectedType = useGameStore(state => state.editorSelectedType);
  const isEditorOpen = useGameStore(state => state.isEditorOpen);
  const selectedWorldObjectId = useGameStore(state => state.selectedWorldObjectId);
  const setSelectedWorldObjectId = useGameStore(state => state.setSelectedWorldObjectId);
  const setTransforming = useGameStore(state => state.setTransforming);
  const isTransforming = useGameStore(state => state.isTransforming);

  const transformMode = useGameStore(state => state.editorTransformMode);
  const setTransformMode = useGameStore(state => state.setEditorTransformMode);
  const gridSnap = useGameStore(state => state.gridSnap);

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
      scale: scale.x
    });
  }, [selectedWorldObjectId, transformRef, isTransforming]);

  const onTransformMouseUp = useCallback(() => {
    setTransforming(false);
    if (!selectedWorldObjectId || !transformRef) return;
    
    const obj = useGameStore.getState().worldObjects[selectedWorldObjectId];
    if (!obj || !socket) return;

    socket.emit("save_world_object", {
      ...obj,
      pos: [transformRef.position.x, transformRef.position.y, transformRef.position.z],
      rot: [transformRef.rotation.x, transformRef.rotation.y, transformRef.rotation.z],
      scale: transformRef.scale.x
    });
  }, [selectedWorldObjectId, transformRef, socket, setTransforming]);

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

      {worldObjects.map(obj => (
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
