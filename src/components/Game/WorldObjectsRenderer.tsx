import { memo, useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
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
      scale={obj.scale}
      ref={groupRef}
    >
      <group>
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

        {/* Hitboxes */}
        {isEditorOpen && obj.hitboxes?.map((hb: any, i: number) => (
          <group key={`hb-${obj.id}-${i}`} position={[hb.x, 0.05, hb.z]}>
            {hb.type === 'circle' ? (
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[hb.r - 0.05, hb.r, 32]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.6} />
              </mesh>
            ) : (
              <mesh>
                <boxGeometry args={[hb.w, 0.1, hb.d]} />
                <meshBasicMaterial color="#ef4444" wireframe />
              </mesh>
            )}
          </group>
        ))}
      </group>

      {(obj.type.startsWith('spawner_') || obj.type.startsWith('npc_')) && isEditorOpen && (
        <mesh {...modelProps}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial 
            color={obj.type.startsWith('npc_') ? '#3b82f6' : (editorSelectedType ? '#ef4444' : '#6b21a8')} 
            wireframe 
          />
        </mesh>
      )}

      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.6, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
});

WorldObjectItem.displayName = "WorldObjectItem";

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
