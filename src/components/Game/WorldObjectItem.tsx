import { memo, useRef, useEffect } from "react";
import * as THREE from "three";
import { Tree, Rock, House, Tent, Bush, Fence, Campfire, Barrel, Dummy, Chest, Well, SignPost, Waypoint } from "./Environment";
import { GLBModel } from "./GLBModel";

export const ProceduralModel = memo(({ type, modelProps }: { type: string, modelProps: any }) => {
  switch (type) {
    case 'tree': return <Tree {...modelProps} />;
    case 'rock': return <Rock {...modelProps} />;
    case 'house': return <House {...modelProps} />;
    case 'tent': return <Tent {...modelProps} />;
    case 'bush': return <Bush {...modelProps} />;
    case 'fence': return <Fence {...modelProps} />;
    case 'campfire': return <Campfire {...modelProps} />;
    case 'barrel': return <Barrel {...modelProps} />;
    case 'dummy': return <Dummy {...modelProps} />;
    case 'chest': return <Chest {...modelProps} />;
    case 'well': return <Well {...modelProps} />;
    case 'signpost': return <SignPost {...modelProps} />;
    case 'waypoint': return <Waypoint {...modelProps} />;
    default: return null;
  }
});

ProceduralModel.displayName = "ProceduralModel";

export const WorldObjectItem = memo(({ 
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
      userData={{ isCollidable: true }}
      {...({ isWorldObject: true } as any)}
    >
      {/* Model Group - Scaled */}
      <group scale={obj.scale}>
        {/* Priority 1: Custom GLB Model */}
        {obj.modelUrl ? (
          <GLBModel url={obj.modelUrl} {...modelProps} />
        ) : (
          /* Priority 2: Built-in Procedural Models */
          <ProceduralModel type={obj.type} modelProps={modelProps} />
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

      {/* Permanent visual indicator so we know it's there even if model is missing */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} name="editor_helper">
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color={obj.modelUrl ? "#3b82f6" : "#ffffff"} transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {isSelected && (
        <group>
          {/* Pulsing Floor Ring */}
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} name="editor_helper">
            <ringGeometry args={[1.5, 1.6, 32]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.8} depthWrite={false} />
          </mesh>
          
          {/* Vertical Focus Beam */}
          <mesh position={[0, 10, 0]} name="editor_helper">
            <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} depthWrite={false} />
          </mesh>

          {/* Glow Point */}
          <pointLight color="#f59e0b" intensity={2} distance={5} />
        </group>
      )}
    </group>
  );
});

WorldObjectItem.displayName = "WorldObjectItem";
