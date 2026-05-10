/**
 * @file src/components/Game/EntityRenderer.tsx
 * @description Central manager for rendering all non-player entities.
 * Dynamically selects and renders the appropriate component based on entity type.
 * @importance Essential: Simplifies the main scene logic by abstracting the rendering of diverse entities.
 */
import { memo } from "react";
import { NPC } from "./NPC";
import { SlimeEnemy, SkeletonEnemy, GoblinEnemy } from "./Enemy";
import { useGameStore } from "../../store/useGameStore";
import { SAMPLE_QUESTS } from "../../data/quests";

interface EntityRendererProps {
  entities: any[];
  onAttack?: () => void;
  onLoot?: (id: string) => void;
}

export const EntityRenderer = memo(({ entities, onAttack, onLoot }: EntityRendererProps) => {
  const setActiveDialogue = useGameStore(state => state.setActiveDialogue);
  const activeQuests = useGameStore(state => state.activeQuests);

  return (
    <>
      {entities.map(ent => (
        ent.type === 'npc' ? (
          <NPC 
            key={ent.id}
            id={ent.id} 
            name={ent.name} 
            role={ent.class || "Villager"} 
            position={ent.pos} 
            rotation={ent.rot}
            color={ent.color || "#facc15"} 
            hp={ent.hp}
            maxHp={ent.maxHp}
            onInteract={() => {
              const npcQuests = Object.values(SAMPLE_QUESTS).filter(q => q.giverId === ent.id || q.giverName === ent.name);
              
              // 1. Check for turn-in
              const readyToTurnIn = npcQuests.find(q => {
                const pq = activeQuests[q.id];
                return pq && pq.status === 'active' && pq.objectives.every(o => o.completed);
              });

              if (readyToTurnIn) {
                setActiveDialogue({
                  speaker: ent.name,
                  text: `Incredible! You've done it. Here is your reward as promised.`,
                  quest: activeQuests[readyToTurnIn.id]
                });
                return;
              }

              // 2. Check for new quests
              const availableQuest = npcQuests.find(q => {
                const pq = activeQuests[q.id];
                if (pq) return false; // Already taken or completed
                
                // Check prerequisite
                if (q.prerequisiteQuestId) {
                  const prereq = activeQuests[q.prerequisiteQuestId];
                  return prereq && prereq.status === 'completed';
                }
                
                return true;
              });

              if (availableQuest) {
                setActiveDialogue({
                  speaker: ent.name,
                  text: `Greetings traveler. ${availableQuest.description}`,
                  quest: availableQuest
                });
              } else {
                // Check if currently working on a quest
                const currentlyActive = npcQuests.find(q => activeQuests[q.id]?.status === 'active');
                if (currentlyActive) {
                  setActiveDialogue({
                    speaker: ent.name,
                    text: `How goes the task for ${currentlyActive.title}? Keep at it!`
                  });
                } else {
                  setActiveDialogue({
                    speaker: ent.name,
                    text: `The winds of Aetheria are cold today. Watch your step, explorer.`
                  });
                }
              }
            }}
          />
        ) : (
          ent.entityClass === 'Skeleton' ? (
            <SkeletonEnemy key={ent.id} id={ent.id} name={ent.name} level={ent.level} position={ent.pos} hp={ent.hp} maxHp={ent.maxHp} isDead={ent.isDead} onAttack={onAttack} onLoot={onLoot} />
          ) : ent.entityClass === 'Goblin' ? (
            <GoblinEnemy key={ent.id} id={ent.id} name={ent.name} level={ent.level} position={ent.pos} hp={ent.hp} maxHp={ent.maxHp} isDead={ent.isDead} onAttack={onAttack} onLoot={onLoot} />
          ) : (
            <SlimeEnemy 
              key={ent.id}
              id={ent.id} 
              name={ent.name} 
              level={ent.level} 
              position={ent.pos} 
              hp={ent.hp}
              maxHp={ent.maxHp}
              isDead={ent.isDead}
              color={ent.color || "#ef4444"}
              onAttack={onAttack}
              onLoot={onLoot}
            />
          )
        )
      ))}
    </>
  );
});

EntityRenderer.displayName = "EntityRenderer";
