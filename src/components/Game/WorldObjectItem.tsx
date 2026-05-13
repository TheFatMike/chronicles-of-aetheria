/**
 * @file src/components/Game/WorldObjectItem.tsx
 * @description A wrapper component for individual static objects in the game world.
 * Decides whether to render a procedural object (like a tree) or an external GLB model.
 * @importance Essential: Simplifies object management by providing a uniform interface for all environmental props.
 */
import { memo, useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Tree, Rock, House, Tent, Bush, Fence, Campfire, Barrel, Dummy, Chest, Well, SignPost, Waypoint, TeleportCrystal } from "./Environment";
import { Humanoid } from "./Humanoid";
import { NPC } from "./NPC";
import { GLBModel } from "./GLBModel";
import { SelectionCircle } from "./SelectionCircle";
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
    case 'tree': return <Tree {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'rock': return <Rock {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'house': return <House {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'tent': return <Tent {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'bush': return <Bush {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'fence': return <Fence {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'campfire': return <Campfire {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'barrel': return <Barrel {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'dummy': return <Dummy {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'chest': return <Chest {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'well': return <Well {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'signpost': return <SignPost {...modelProps} modelUrl={obj?.modelUrl} />;
    case 'teleport_crystal': return <TeleportCrystal {...modelProps} modelUrl={obj?.modelUrl} />;
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
        }
        return null;
      }
      
      // FALLBACK: If no custom procedural component, use the modelUrl if provided
      if (obj?.modelUrl) {
        return <GLBModel url={obj.modelUrl} {...modelProps} isCollidable={true} />;
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
          id: `sys-dist-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          sender: "SYSTEM",
          text: `You are too far away to interact with ${obj.name || "this NPC"}.`,
          timestamp: Date.now(),
          color: "#ff4444"
        });
        return;
      }

      const npcType = obj.type.replace('npc_', '');
      const template = OBJECT_TEMPLATES[obj.type];
      const speakerName = obj.name || template?.label || "Villager";
      
      // Special Interaction: Teleport Crystal
      if (obj.type === 'teleport_crystal') {
        const isDiscovered = state.discoveredTeleports.includes(obj.id);
        
        if (isDiscovered) {
          state.setTeleportMenuOpen(true, obj.id);
        } else {
          // Check if already attuning
          if (state.castState?.name === "Attuning Crystal") return;
          
          state.addMessage({
            id: "sys-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
            sender: "SYSTEM",
            text: `Establishing magical link with ${speakerName}...`,
            timestamp: Date.now(),
            color: "#a855f7"
          });
          
          state.startCast("Attuning Crystal", 5000);
          
          // Wait 5 seconds and then discover
          setTimeout(() => {
            // Re-fetch state to check if cast was cancelled
            const latestState = useGameStore.getState();
            if (latestState.castState?.name === "Attuning Crystal") {
              latestState.discoverTeleport(obj.id);
              latestState.completeCast();
              latestState.setTeleportMenuOpen(true, obj.id);
              
              // Refresh Target UI color immediately
              if (latestState.currentTarget?.id === obj.id) {
                latestState.setTarget({
                  id: obj.id,
                  name: "Teleport Crystal ●",
                  type: "teleport_crystal",
                  level: 0,
                  color: "#22c55e",
                  hp: 100,
                  maxHp: 100
                });
              }

              latestState.addMessage({
                id: "sys-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
                sender: "SYSTEM",
                text: `Successfully attuned to ${speakerName}!`,
                timestamp: Date.now(),
                color: "#22c55e"
              });
            }
          }, 5000);
        }
        return;
      }
      
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
      e.stopPropagation();
      
      // Strict Guard: If not in editor and not an interactable type, ignore completely
      if (!isEditorOpen && !isNPC && obj.type !== 'teleport_crystal') {
        return;
      }

      if (!isEditorOpen) {
        const state = useGameStore.getState();
        const isTargeted = state.currentTarget?.id === obj.id;

        if (!isTargeted) {
          const isCrystal = obj.type === 'teleport_crystal';

          if (isCrystal) {
            const isDiscovered = state.discoveredTeleports.includes(obj.id);
            const dotColor = isDiscovered ? "#22c55e" : "#ef4444";
            
            state.setTarget({
              id: obj.id,
              name: "Teleport Crystal ●",
              type: "teleport_crystal",
              level: 0,
              color: dotColor,
              hp: 100,
              maxHp: 100
            });
          } else {
            // Target it first (NPC)
            state.setTarget({
              id: obj.id,
              name: obj.name || "Villager",
              type: "npc",
              level: 0,
              color: "#facc15",
              hp: 100,
              maxHp: 100
            });
          }
        } else {
          // Already targeted, interact!
          modelProps.onInteract();
        }
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

  const isTargetedInGame = useGameStore(s => s.currentTarget?.id === obj.id);
  const isSelectedFinal = isSelected || (isTargetedInGame && !isEditorOpen);

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
      onClick={(isEditorOpen || isNPC || obj.type === 'teleport_crystal') ? modelProps.onClick : undefined}
    >
      {/* Selection Circle - Unified with BaseEntity */}
      <SelectionCircle 
        visible={isSelectedFinal} 
        color={isNPC ? "#facc15" : (obj.type === 'teleport_crystal' ? (useGameStore.getState().discoveredTeleports.includes(obj.id) ? "#22c55e" : "#ef4444") : "#3b82f6")} 
        scale={obj.scale * 1.5} 
      />

      {/* Invisible Selection Hitbox: Makes small/thin objects easier to click */}
      {(!isWaypoint || isWaypointActive) && (
        <mesh 
          position={[0, 1, 0]} 
          visible={false} 
        >
          <boxGeometry args={[2, 4, 2]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

        {/* Unified Model Selection: Checks procedural components first, then falls back to GLBModel */}
        <ProceduralModel 
          type={obj.type} 
          modelProps={modelProps} 
          isSelected={isSelectedFinal} 
          editorSelectedType={editorSelectedType} 
          isEditorOpen={isEditorOpen}
          obj={obj}
        />

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

      {isSelectedFinal && isEditorOpen && (
        <>
          {/* Vertical Focus Beam (Magical Energy) - Editor Only */}
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
