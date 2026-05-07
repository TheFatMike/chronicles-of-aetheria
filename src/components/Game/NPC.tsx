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
}


export const NPC = memo(({ id, name, role, position, rotation = [0, 0, 0], color = "#facc15", level = 1, onInteract, onAttack, hp, maxHp }: NPCProps) => {
  const activeQuests = useGameStore(useShallow(state => state.activeQuests));
  
  // Find quest associated with this NPC
  const quest = Object.values(SAMPLE_QUESTS).find(q => q.giverId === id || q.giverName === name);
  const playerQuest = quest ? activeQuests[quest.id] : null;
  
  const hasAvailableQuest = quest && !playerQuest;
  const isQuestReady = playerQuest && playerQuest.objectives.every(o => o.completed) && playerQuest.status !== 'completed';
  const isQuestActive = playerQuest && playerQuest.status === 'active' && !isQuestReady;

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


      <Humanoid color={color} isMoving={false} isGrounded={true} />
      
      {/* Quest Indicators */}
      <Html position={[0, 2.2, 0]} center distanceFactor={10}>
        {isQuestReady ? (
          <div className="flex flex-col items-center animate-bounce">
            <span className="text-yellow-400 text-4xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">!</span>
          </div>
        ) : hasAvailableQuest ? (
          <div className="flex flex-col items-center">
            <span className="text-yellow-400 text-4xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">?</span>
          </div>
        ) : isQuestActive ? (
          <div className="flex flex-col items-center opacity-60">
            <span className="text-gray-400 text-4xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">?</span>
          </div>
        ) : null}
      </Html>
    </BaseEntity>
  );
});

NPC.displayName = "NPC";
