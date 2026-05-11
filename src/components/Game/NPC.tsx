/**
 * @file src/components/Game/NPC.tsx
 * @description Renders and manages non-player characters in the 3D world.
 * Integrates humanoid visuals with NPC-specific logic like quest markers and dialogue triggers.
 * @importance Essential: Populates the world with interactive storytellers and quest givers.
 */
import { memo } from "react";
import { Humanoid } from "./Humanoid";
import { BaseEntity } from "./BaseEntity";
import { useGameStore } from "../../store/useGameStore";
import { SAMPLE_QUESTS } from "../../data/quests";
import { useShallow } from "zustand/react/shallow";
import { Html } from "@react-three/drei";

interface NPCProps {
  id: string;
  name: string;
  role: string;
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
}



export const NPC = memo(({ id, name, role, position, rotation = [0, 0, 0], color = "#facc15", level = 1, onInteract, onAttack, hp, maxHp, isMoving = false, isAttacking = false }: NPCProps) => {
  const activeQuests = useGameStore(useShallow(state => state.activeQuests));
  
  // Find quests associated with this NPC
  const npcQuests = Object.values(SAMPLE_QUESTS).filter(q => q.giverId === id || q.giverName === name);
  
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
      hp={hp}
      maxHp={maxHp}
      onInteract={onInteract}
      onAttack={onAttack}
    >


      <Humanoid color={color} isMoving={isMoving} isGrounded={true} isAttacking={isAttacking} />
      
      {/* Quest Indicators */}
      <Html position={[0, 2.2, 0]} center distanceFactor={10}>
        {readyQuest ? (
          <div className="flex flex-col items-center animate-bounce">
            <span className="text-yellow-400 text-4xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">?</span>
          </div>
        ) : availableQuest ? (
          <div className="flex flex-col items-center">
            <span className="text-yellow-400 text-4xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">!</span>
          </div>
        ) : activeQuest ? (
          <div className="flex flex-col items-center opacity-60">
            <span className="text-gray-400 text-4xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">?</span>
          </div>
        ) : null}
      </Html>
    </BaseEntity>
  );
});

NPC.displayName = "NPC";
