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
              const quest = Object.values(SAMPLE_QUESTS).find(q => q.giverId === ent.id || q.giverName === ent.name);
              const playerQuest = quest ? activeQuests[quest.id] : null;
              
              if (playerQuest && playerQuest.objectives.every(o => o.completed) && playerQuest.status !== 'completed') {
                setActiveDialogue({
                  speaker: ent.name,
                  text: `Incredible! You've done it. Here is your reward as promised.`,
                  quest: playerQuest
                });
              } else if (quest && !playerQuest) {
                setActiveDialogue({
                  speaker: ent.name,
                  text: `Greetings traveler. ${quest.description}`,
                  quest: quest
                });
              } else {
                setActiveDialogue({
                  speaker: ent.name,
                  text: `The winds of Aetheria are cold today. Watch your step, explorer.`
                });
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
