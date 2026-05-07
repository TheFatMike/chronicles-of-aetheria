import { memo, useState, useEffect } from "react";
import * as THREE from "three";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { Tree, Rock, House, Tent, Bush, Fence, Campfire, Barrel, Dummy, Chest, Well, SignPost, Waypoint } from "./Environment";
import { TransformControls } from "@react-three/drei";

export const WorldObjectsRenderer = memo(({ socket }: { socket: any }) => {
  const worldObjects = useGameStore(useShallow(state => Object.values(state.worldObjects)));
  const editorSelectedType = useGameStore(state => state.editorSelectedType);
  const isEditorOpen = useGameStore(state => state.isEditorOpen);
  const selectedWorldObjectId = useGameStore(state => state.selectedWorldObjectId);
  const setSelectedWorldObjectId = useGameStore(state => state.setSelectedWorldObjectId);
  const setTransforming = useGameStore(state => state.setTransforming);

  const transformMode = useGameStore(state => state.editorTransformMode);
  const setTransformMode = useGameStore(state => state.setEditorTransformMode);
  const gridSnap = useGameStore(state => state.gridSnap);

  const [transformRef, setTransformRef] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (!selectedWorldObjectId) setTransformRef(null);
  }, [selectedWorldObjectId]);

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

  const onTransformMouseUp = (e: any) => {
    setTransforming(false);
    if (!selectedWorldObjectId || !transformRef) return;
    
    const obj = useGameStore.getState().worldObjects[selectedWorldObjectId];
    if (!obj || !socket) return;

    socket.emit("save_world_object", {
      ...obj,
      pos: [transformRef.position.x, transformRef.position.y, transformRef.position.z],
      rot: [transformRef.rotation.x, transformRef.rotation.y, transformRef.rotation.z],
      scale: transformRef.scale.x // Uniform scale
    });
  };

  return (
    <>
      {isEditorOpen && selectedWorldObjectId && (
        <TransformControls
          makeDefault
          object={transformRef || undefined}
          mode={transformMode}
          translationSnap={gridSnap ? 0.5 : null}
          rotationSnap={gridSnap ? Math.PI / 12 : null}
          scaleSnap={gridSnap ? 0.1 : null}
          onMouseDown={() => setTransforming(true)}
          onMouseUp={onTransformMouseUp}
        />
      )}

      {worldObjects.map(obj => {
        const isSelected = selectedWorldObjectId === obj.id;
        const modelProps = {
          onClick: (e: any) => {
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
            key={obj.id} 
            position={obj.pos} 
            rotation={obj.rot} 
            scale={obj.scale}
            ref={(ref) => {
              if (isSelected && transformRef !== ref) setTransformRef(ref as THREE.Group);
            }}
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
              {isEditorOpen && obj.hitboxes?.map((hb, i) => (
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
      })}
    </>
  );
});

WorldObjectsRenderer.displayName = "WorldObjectsRenderer";
