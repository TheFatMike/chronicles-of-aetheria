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
import { Humanoid } from "./Humanoid";
import { NPC } from "./NPC";
import { GLBModel } from "./GLBModel";
import { useGameStore } from "../../store/useGameStore";
import { SHARED_FRUSTUM } from "./WorldObjectsRenderer";
import { SAMPLE_QUESTS } from "../../data/quests";
import { OBJECT_TEMPLATES } from "../../data/world/templates";
import { getNPCDialogue } from "../../data/npcDialogues";

export const ProceduralModel = memo(({ 
  type, 
  modelProps, 
  isSelected, 
  editorSelectedType,
  isEditorOpen,
  obj
}: { 
  type: string, 
  modelProps: any, 
  isSelected?: boolean, 
  editorSelectedType?: string | null,
  isEditorOpen: boolean,
  obj?: any
}) => {
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
    default: 
      // Handle NPCs as generic humanoids in the editor if no model
      if (type.startsWith('npc_')) {
        if (isEditorOpen) {
          return (
            <group {...modelProps} position={[0, 0, 0]}>
              <Humanoid 
                color={modelProps.isGhost ? '#3b82f6' : (obj?.color || '#facc15')} 
                isMoving={false} 
                isGrounded={true} 
                isAttacking={false}
                opacity={modelProps.isGhost ? 0.4 : 1.0}
              />
            </group>
          );
        } else {
          // NPCs are handled by EntityRenderer in game mode to allow for movement and better sync.
          // In the editor, we still render the static preview above.
          return null;
        }
      }
      return null;
  }
});

ProceduralModel.displayName = "ProceduralModel";


interface WorldObjectItemProps {
  obj: any;
  isSelected: boolean;
  isEditorOpen: boolean;
  editorSelectedType: string | null;
  socket: any;
  setSelectedWorldObjectId: (id: string | null) => void;
  setTransformRef: (node: THREE.Object3D | null) => void;
}

export const WorldObjectItem = memo(({ 
  obj, 
  isSelected, 
  isEditorOpen, 
  editorSelectedType, 
  socket, 
  setSelectedWorldObjectId,
  setTransformRef
}: WorldObjectItemProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const _point = useRef(new THREE.Vector3());
  const _sphere = useRef(new THREE.Sphere());
  
  const isSpawner = obj.type.startsWith('spawner_');
  const isNPC = obj.type.startsWith('npc_');

  // High-performance visibility check
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Spawners are only visible in editor
    if (isSpawner && !isEditorOpen) {
      groupRef.current.visible = false;
      return;
    }

    // Always show if selected
    if (isSelected) {
      groupRef.current.visible = true;
      return;
    }

    _point.current.set(obj.pos[0], obj.pos[1], obj.pos[2]);
    const distSq = _point.current.distanceToSquared(state.camera.position);

    // 1. "Proximity Shield": If object is close, ALWAYS show it.
    // This prevents any popping when spinning the camera quickly.
    if (distSq < 10000) { // 100 meters
      if (!groupRef.current.visible) groupRef.current.visible = true;
      return;
    }

    // 2. "Aggressive Frustum Bleed": Use a large 20m radius for the frustum check.
    // This ensures objects are rendered long before they actually hit the screen edges.
    _sphere.current.set(_point.current, 50); 
    const isVisible = SHARED_FRUSTUM.intersectsSphere(_sphere.current);
    
    if (groupRef.current.visible !== isVisible) {
      groupRef.current.visible = isVisible;
    }
  });

  // Hand off ref for gizmo
  useEffect(() => {
    if (isSelected && isEditorOpen && groupRef.current) {
      setTransformRef(groupRef.current);
    }
  }, [isSelected, isEditorOpen, obj.id, setTransformRef]);

  const modelProps = {
    onInteract: () => {
      if (isEditorOpen) return;
      
      // Distance Check
      const state = useGameStore.getState();
      const localPlayer = state.players[state.id || ""];
      if (!localPlayer) return;

      const dx = localPlayer.pos[0] - obj.pos[0];
      const dz = localPlayer.pos[2] - obj.pos[2];
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      const INTERACT_RANGE = 5;
      if (distance > INTERACT_RANGE) {
        state.addMessage({
          id: "sys-" + Date.now(),
          sender: "SYSTEM",
          text: `You are too far away to interact with ${obj.name || "this NPC"}.`,
          timestamp: Date.now(),
          color: "#ff4444"
        });
        return;
      }

      const npcType = obj.type.replace('npc_', '');
      const speakerName = obj.name || OBJECT_TEMPLATES[obj.type]?.label || "Villager";
      
      const dialogue = getNPCDialogue(obj.id, npcType, speakerName, {
        activeQuests: state.activeQuests,
        quests: SAMPLE_QUESTS
      });

      state.setActiveDialogue({
        speaker: speakerName,
        text: dialogue.text,
        npcId: obj.id,
        npcType: npcType,
        quest: dialogue.quest,
        options: dialogue.options
      });
    },
    onClick: (e: any) => {
      if (!isEditorOpen) {
        if (isNPC) modelProps.onInteract();
        return;
      }
      
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
      scale={obj.scale}
      ref={groupRef}
      userData={{ isCollidable: !isSpawner }}
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

        {/* Priority 1: Custom GLB Model */}
        {obj.modelUrl ? (
          <GLBModel url={obj.modelUrl} {...modelProps} isCollidable={true} />
        ) : (
          /* Priority 2: Built-in Procedural Models */
          <ProceduralModel 
            type={obj.type} 
            modelProps={modelProps} 
            isSelected={isSelected} 
            editorSelectedType={editorSelectedType} 
            isEditorOpen={isEditorOpen}
            obj={obj}
          />
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

      {/* Permanent visual indicator so we know it's there even if model is missing (Editor Only) */}
      {isEditorOpen && (!isWaypoint || isWaypointActive) && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} name="editor_helper">
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color={obj.modelUrl ? "#3b82f6" : "#ffffff"} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}

      {isSelected && (
        <>
          {/* Pulsing Floor Ring (Inner Magic) */}
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} name="editor_helper">
            <ringGeometry args={[1.4, 1.5, 64]} />
            <meshBasicMaterial color="#0ea5e9" transparent opacity={0.9} depthWrite={false} />
          </mesh>
          
          {/* Pulsing Floor Ring (Outer Glow) */}
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} name="editor_helper">
            <ringGeometry args={[1.3, 1.6, 64]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} depthWrite={false} />
          </mesh>

          {/* Vertical Focus Beam (Magical Energy) */}
          <mesh position={[0, 10, 0]} name="editor_helper">
            <cylinderGeometry args={[0.02, 0.2, 20, 16]} />
            <meshBasicMaterial color="#0ea5e9" transparent opacity={0.4} depthWrite={false} />
          </mesh>

          <mesh position={[0, 10, 0]} name="editor_helper">
            <cylinderGeometry args={[0.01, 0.05, 20, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthWrite={false} />
          </mesh>

          {/* Glow Point */}
          <pointLight color="#0ea5e9" intensity={5} distance={8} />
        </>
      )}
    </group>
  );
});

WorldObjectItem.displayName = "WorldObjectItem";
