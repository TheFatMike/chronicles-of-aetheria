/**
 * @file src/components/Game/BaseEntity.tsx
 * @description An abstract base component for all interactable entities in the game.
 * Provides common UI elements like health bars, nameplates, and selection indicators.
 * @importance Essential: Ensures visual and functional consistency across all NPCs, players, and enemies.
 */
import { memo, ReactNode, useRef, useState, useEffect } from "react";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { SelectionCircle } from "./SelectionCircle";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from 'zustand/react/shallow';
import { useEntitySync } from "../../hooks/useEntitySync";
import { GameTarget } from "../../types";
import { useFrame } from "@react-three/fiber";
import { SHARED_FRUSTUM } from "./WorldObjectsRenderer";

interface BaseEntityProps {
  id: string;
  name: string;
  type: "player" | "npc" | "enemy";
  level: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  role?: string;
  selectionColor?: string;
  children?: ReactNode;
  nameOffset?: number;
  hp?: number;
  maxHp?: number;
  onInteract?: () => void;
  onAttack?: () => void;
  entityClass?: string;
  className?: string; // For display in target UI
  isDead?: boolean;
}

export const BaseEntity = memo(({
  id,
  name,
  type,
  level,
  position,
  rotation = [0, 0, 0],
  color,
  role,
  entityClass,
  selectionColor,
  children,
  nameOffset = 2.2,
  hp = 100,
  maxHp = 100,
  onInteract,
  onAttack,
  isDead
}: BaseEntityProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const _point = useRef(new THREE.Vector3());
  const _sphere = useRef(new THREE.Sphere());
  
  const [hovered, setHovered] = useState(false);
  const { setTarget, currentTargetId, showAllNames } = useGameStore(useShallow((state) => ({
    setTarget: state.setTarget,
    currentTargetId: state.currentTarget?.id,
    showAllNames: state.showAllNames
  })));
  const isTargeted = currentTargetId === id;

  // Handle network sync/smoothing
  useEntitySync(groupRef, { position, rotation });

  // Zero-latency visibility management
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Always show if targeted
    if (isTargeted) {
      groupRef.current.visible = true;
      return;
    }

    _point.current.copy(groupRef.current.position);
    const distSq = _point.current.distanceToSquared(state.camera.position);

    // 1. Proximity Shield: Entities within 150m are always visible
    // We disable frustum culling for entities to prevent flickering when close or at screen edges
    if (distSq < 22500) { 
      groupRef.current.visible = true;
      return;
    }

    // 2. Fallback: Hide if very far away
    groupRef.current.visible = false;
  });

  // Cleanup cursor classes on unmount (prevents stuck cursors when entity despawns)
  useEffect(() => {
    return () => {
      document.body.classList.remove('npc-hover', 'enemy-hover', 'loot-hover');
    };
  }, []);

  const handleClick = (e: any) => {
    e.stopPropagation();
    
    // 1. If not targeted, target it first
    if (!isTargeted) {
      const target: GameTarget = {
        id,
        name,
        type,
        level,
        color,
        hp,
        maxHp,
        role,
        isDead
      };
      setTarget(target);
      return;
    }

    // 2. If already targeted, check distance for interaction/attack
    const state = useGameStore.getState();
    const localPlayer = state.players[state.id || ""];
    
    if (!localPlayer) return;

    const dx = localPlayer.pos[0] - position[0];
    const dz = localPlayer.pos[2] - position[2];
    const distance = Math.sqrt(dx * dx + dz * dz);

    const INTERACT_RANGE = 5;

    if (distance > INTERACT_RANGE) {
      state.addMessage({
        id: "sys-" + Date.now(),
        sender: "SYSTEM",
        text: `You are too far away to interact with ${name}.`,
        timestamp: Date.now(),
        color: "#ff4444"
      });
      return;
    }

    // 3. Within range and targeted: Trigger action
    if (isDead) {
      // If dead, we always want to loot (interact)
      if (onInteract) onInteract();
    } else if (type === 'npc' || !onAttack) {
      if (onInteract) onInteract();
    } else if (onAttack) {
      onAttack();
      if (type === 'enemy') {
        state.setAutoAttackTarget(id);
      }
    }
  };

  // Explicit Double Click support for immediate interaction
  const handleDoubleClick = (e: any) => {
    e.stopPropagation();
    
    const state = useGameStore.getState();
    const localPlayer = state.players[state.id || ""];
    if (!localPlayer) return;

    // Target first
    const targetData: GameTarget = { id, name, type, level, color, hp, maxHp, role, isDead };
    setTarget(targetData);

    const dx = localPlayer.pos[0] - position[0];
    const dz = localPlayer.pos[2] - position[2];
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= 5) {
      if (isDead && onInteract) onInteract();
      else if (type === 'npc' && onInteract) onInteract();
    }
  };

  // Determine selection circle color if not provided
  const getSelectionColor = () => {
    if (selectionColor) return selectionColor;
    if (isDead) return "#ffd700"; // Gold for loot
    switch (type) {
      case "player": return "#3b82f6"; // Blue
      case "npc": return "#facc15";    // Yellow
      case "enemy": return "#ef4444";  // Red
      default: return "#ffffff";
    }
  };

  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const mouseDownTime = useRef<number>(0);

  const handlePointerDown = (e: any) => {
    if (useGameStore.getState().isEditorOpen) return;
    if (e.button === 2 || e.button === 0) {
      e.stopPropagation();
      mouseDownPos.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
      mouseDownTime.current = Date.now();
    }
  };

  const handlePointerUp = (e: any) => {
    if (!mouseDownPos.current) return;

    const dx = Math.abs(e.nativeEvent.clientX - mouseDownPos.current.x);
    const dy = Math.abs(e.nativeEvent.clientY - mouseDownPos.current.y);
    const dt = Date.now() - mouseDownTime.current;

    // Threshold for a "click" vs a "drag"
    if (dx < 20 && dy < 20 && dt < 500) {
      e.stopPropagation();
      
      const targetData: GameTarget = { id, name, type, level, color, hp, maxHp, role, isDead };

      if (e.button === 2 && (type === "player" || type === "npc" || type === "enemy")) {
        // Target first if not targeted
        if (!isTargeted) {
          setTarget(targetData);
        }
        
        // Open menu
        useGameStore.getState().setContextMenu({
          x: e.nativeEvent.clientX,
          y: e.nativeEvent.clientY,
          title: name,
          targetId: id,
          targetType: type,
          targetRole: entityClass || role
        });
      } else if (e.button === 0) {
        const state = useGameStore.getState();
        const localPlayer = state.players[state.id || ""];
        
        // Always target on left click
        if (!isTargeted) {
          setTarget(targetData);
        }

        // If it's an NPC, try to interact ONLY if already targeted
        if (type === 'npc' && localPlayer && isTargeted) {
          const distDx = localPlayer.pos[0] - position[0];
          const distDz = localPlayer.pos[2] - position[2];
          const distance = Math.sqrt(distDx * distDx + distDz * distDz);

          if (distance <= 5) {
            if (onInteract) onInteract();
            return; // Skip the secondary logic below
          }
        }

        // Secondary logic for already targeted or out-of-range
        if (isTargeted && localPlayer) {
          const distDx = localPlayer.pos[0] - position[0];
          const distDz = localPlayer.pos[2] - position[2];
          const distance = Math.sqrt(distDx * distDx + distDz * distDz);

          if (distance > 5) {
            state.addMessage({
              id: "sys-" + Date.now(),
              sender: "SYSTEM",
              text: `You are too far away to interact with ${name}.`,
              timestamp: Date.now(),
              color: "#ff4444"
            });
          } else {
            if (isDead && onInteract) onInteract();
            else if (type === 'npc' || !onAttack) {
              if (onInteract) onInteract();
            } else if (onAttack) {
              onAttack();
              if (type === 'enemy') state.setAutoAttackTarget(id);
            }
          }
        }
      }
    }

    mouseDownPos.current = null;
  };

  return (
    <group
      ref={groupRef}
      userData={{ isCollidable: false }} // Living entities don't block movement in WoW
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (isDead) {
          document.body.classList.add('loot-hover');
        } else {
          if (type === 'npc') document.body.classList.add('npc-hover');
          if (type === 'enemy') document.body.classList.add('enemy-hover');
          if (type === 'player') document.body.classList.add('player-hover');
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.classList.remove('npc-hover');
        document.body.classList.remove('enemy-hover');
        document.body.classList.remove('loot-hover');
        document.body.classList.remove('player-hover');
      }}
    >
      {/* Interaction Collider */}
      <mesh 
        position={[0, nameOffset / 2, 0]} 
        castShadow={false} 
        receiveShadow={false}
      >
        <boxGeometry args={[1.5, nameOffset, 1.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <SelectionCircle visible={isTargeted} color={getSelectionColor()} />

      
      {/* Visual content (Humanoid, Slime, etc.) */}
      {children}

      {/* Name and Level Tag */}
      {(isTargeted || hovered || showAllNames) && (
        <Billboard
          position={[0, nameOffset, 0]}
          follow={true}
        >
          <Text
            position={[0, 0.4, 0]}
            fontSize={0.25}
            color={hovered ? "#fff" : (isDead ? "#ffd700" : "#f4e4bc")}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="black"
          >
            {name.toUpperCase()} {isDead ? "[LOOTABLE]" : (type === 'enemy' ? `[Lvl ${level}]` : '')}
          </Text>
          
          {role && (
            <Text
              position={[0, 0.15, 0]}
              fontSize={0.12}
              color={role === 'owner' ? '#facc15' : color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.01}
              outlineColor="black"
            >
              {role === 'owner' ? '[ OWNER ]' : `<${role.toUpperCase()}>`}
            </Text>
          )}
        </Billboard>
      )}
    </group>
  );
});

BaseEntity.displayName = "BaseEntity";
