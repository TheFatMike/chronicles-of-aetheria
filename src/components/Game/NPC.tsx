/**
 * @file src/components/Game/NPC.tsx
 * @description Renders and manages non-player characters in the 3D world.
 * Integrates humanoid visuals with NPC-specific logic like quest markers and dialogue triggers.
 * @importance Essential: Populates the world with interactive storytellers and quest givers.
 */
import { memo } from "react";
import { Humanoid } from "./Humanoid";
import { BaseEntity } from "./BaseEntity";
import { GLBModel } from "./GLBModel";
import { useGameStore } from "../../store/useGameStore";
import { SAMPLE_QUESTS } from "../../data/quests";
import { useShallow } from "zustand/react/shallow";
import { Text, Billboard } from "@react-three/drei";
import { OBJECT_TEMPLATES } from "../../data/world/templates";

interface NPCProps {
  id: string;
  name: string;
  role: string;
  entityClass?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  level?: number;
  onInteract?: () => void;
  onAttack?: () => void;
  hp?: number;
  maxHp?: number;
  isMoving?: boolean;
  isAttacking?: boolean;
  modelUrl?: string;
  scale?: number;
}



export const NPC = memo(({ id, name, role, entityClass, position, rotation = [0, 0, 0], color = "#facc15", level = 1, onInteract, onAttack, hp, maxHp, isMoving = false, isAttacking = false, modelUrl, scale = 1 }: NPCProps) => {
  const activeQuests = useGameStore(useShallow(state => state.activeQuests));
  
  // Find quests associated with this NPC
  const npcType = id.startsWith('npc_') ? id.replace('npc_', '') : '';
  const npcQuests = Object.values(SAMPLE_QUESTS).filter(q => 
    q.giverId === id || 
    (npcType && q.giverId === npcType) || 
    q.giverName === name
  );
  
  const readyQuest = npcQuests.find(q => {
    const pq = activeQuests[q.id];
    return pq && pq.status === 'active' && pq.objectives.every(o => o.completed);
  });

  const availableQuest = npcQuests.find(q => {
    const pq = activeQuests[q.id];
    if (pq) return false;
    if (q.prerequisiteQuestId) {
      const prereq = activeQuests[q.prerequisiteQuestId];
      return prereq && prereq.status === 'completed';
    }
    return true;
  });

  const activeQuest = npcQuests.find(q => {
    const pq = activeQuests[q.id];
    return pq && pq.status === 'active' && !pq.objectives.every(o => o.completed);
  });

  return (
      <BaseEntity
        id={id}
        name={name}
        type="npc"
        level={level}
        position={position}
        rotation={rotation}
        color={color}
        role={role}
        entityClass={entityClass}
        hp={hp}
        maxHp={maxHp}
        onInteract={onInteract}
        onAttack={onAttack}
        scale={scale}
      >
        {modelUrl ? (
          <GLBModel url={modelUrl} scale={1} position={[0, 0, 0]} rotation={[0, 0, 0]} isCollidable={false} />
        ) : (
          <Humanoid color={color} isMoving={isMoving} isGrounded={true} isAttacking={isAttacking} />
        )}
      
      <Billboard position={[0, 2.4, 0]}>
        {readyQuest ? (
          <Text
            fontSize={0.6}
            color="#facc15"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="black"
          >
            ?
          </Text>
        ) : availableQuest ? (
          <Text
            fontSize={0.6}
            color="#facc15"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="black"
          >
            !
          </Text>
        ) : activeQuest ? (
          <Text
            fontSize={0.6}
            color="#9ca3af"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="black"
            fillOpacity={0.6}
          >
            ?
          </Text>
        ) : null}
      </Billboard>
    </BaseEntity>
  );
});

NPC.displayName = "NPC";
