/**
 * @file src/components/Game/WorldObjectItem.tsx
 * @description A wrapper component for individual static objects in the game world.
 * Decides whether to render a procedural object (like a tree) or an external GLB model.
 * @importance Essential: Simplifies object management by providing a uniform interface for all environmental props.
 */
import { memo, useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Tree, Rock, House, Tent, Bush, Fence, Campfire, Barrel, Dummy, Chest, Well, SignPost, Waypoint } from "./Environment";
import { GLBModel } from "./GLBModel";
import { useGameStore } from "../../store/useGameStore";

export const ProceduralModel = memo(({ type, modelProps, isSelected, editorSelectedType }: { type: string, modelProps: any, isSelected: boolean, editorSelectedType: string | null }) => {
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
    case 'waypoint': 
      if (!isSelected && editorSelectedType !== 'waypoint') return null;
      return <Waypoint {...modelProps} />;
    default: return null;
  }
});

ProceduralModel.displayName = "ProceduralModel";

const PopIn = memo(({ children, targetScale }: { children: React.ReactNode, targetScale: any }) => {
  const ref = useRef<THREE.Group>(null);
  const target = useMemo(() => {
    if (Array.isArray(targetScale)) return new THREE.Vector3(...targetScale);
    if (typeof targetScale === 'object') return new THREE.Vector3(targetScale.x || 1, targetScale.y || 1, targetScale.z || 1);
    return new THREE.Vector3(targetScale, targetScale, targetScale);
  }, [targetScale]);

  useFrame((_, delta) => {
    if (ref.current && ref.current.scale.distanceToSquared(target) > 0.001) {
      ref.current.scale.lerp(target, 1 - Math.exp(-8 * delta));
    }
  });

  return <group ref={ref} scale={[0, 0, 0]}>{children}</group>;
});

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
        useGameStore.getState().markObjectDeleted(obj.id);
      } else if (editorSelectedType === 'edit' || !editorSelectedType) {
        setSelectedWorldObjectId(obj.id);
      }
    }
  };

  const isWaypoint = obj.type === 'waypoint';
  const isWaypointActive = isWaypoint && (isSelected || editorSelectedType === 'waypoint');

  return (
    <group 
      position={obj.pos} 
      rotation={obj.rot} 
      ref={groupRef}
      userData={{ isCollidable: true }}
      {...({ isWorldObject: true } as any)}
    >
      {/* Invisible Selection Hitbox: Makes small/thin objects easier to click */}
      {isEditorOpen && (!isWaypoint || isWaypointActive) && (
        <mesh 
          position={[0, 1, 0]} 
          visible={false} 
          onClick={modelProps.onClick}
        >
          <boxGeometry args={[2, 4, 2]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Model Group - Scaled with Pop-In Animation */}
      <PopIn targetScale={obj.scale}>
        {/* Priority 1: Custom GLB Model */}
        {obj.modelUrl ? (
          <GLBModel url={obj.modelUrl} {...modelProps} />
        ) : (
          /* Priority 2: Built-in Procedural Models */
          <ProceduralModel type={obj.type} modelProps={modelProps} isSelected={isSelected} editorSelectedType={editorSelectedType} />
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
      </PopIn>

      {/* Permanent visual indicator so we know it's there even if model is missing */}
      {(!isWaypoint || isWaypointActive) && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} name="editor_helper">
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color={obj.modelUrl ? "#3b82f6" : "#ffffff"} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}

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
