/**
 * @file src/components/Game/EntityRenderer.tsx
 * @description Central manager for rendering all non-player entities.
 * Dynamically selects and renders the appropriate component based on entity type.
 * @importance Essential: Simplifies the main scene logic by abstracting the rendering of diverse entities.
 */
import { memo, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { NPC } from "./NPC";
import { SlimeEnemy, SkeletonEnemy, GoblinEnemy } from "./Enemy";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { SAMPLE_QUESTS } from "../../data/quests";
import { getNPCDialogue } from "../../data/npcDialogues";

import { useThree } from "@react-three/fiber";

interface EntityRendererProps {
  onAttack?: () => void;
  onLoot?: (id: string) => void;
}

export const EntityRenderer = memo(({ onAttack, onLoot }: EntityRendererProps) => {
  const entities = useGameStore(useShallow(state => Object.values(state.entities)));
  const { camera } = useThree();
  const [nearbyEntities, setNearbyEntities] = useState<any[]>([]);

  // Spatial Culling for Entities: Find entities within 100m
  useEffect(() => {
    const updateNearby = () => {
      const CULL_DISTANCE_SQ = 100 * 100;
      const state = useGameStore.getState();
      const localPlayer = state.players[state.id || ""];
      if (!localPlayer) return;

      const filtered = entities.filter(ent => {
        const dx = ent.pos[0] - localPlayer.pos[0];
        const dz = ent.pos[2] - localPlayer.pos[2];
        return (dx*dx + dz*dz) < CULL_DISTANCE_SQ;
      });
      setNearbyEntities(filtered);
    };

    const interval = setInterval(updateNearby, 1000); 
    updateNearby();
    return () => clearInterval(interval);
  }, [entities]); 

  const setActiveDialogue = useGameStore(state => state.setActiveDialogue);
  const activeQuests = useGameStore(state => state.activeQuests);

  return (
    <>
      {nearbyEntities.map(ent => (
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
            isMoving={ent.isMoving}
            isAttacking={ent.isAttacking}
            modelUrl={ent.modelUrl}
            onInteract={() => {
              if (useGameStore.getState().isEditorOpen) return;
              
              const dialogue = getNPCDialogue(ent.id, ent.entityClass || 'npc', ent.name, {
                activeQuests: activeQuests,
                quests: SAMPLE_QUESTS
              });

              setActiveDialogue({
                speaker: ent.name,
                text: dialogue.text,
                npcId: ent.id,
                npcType: ent.entityClass || 'npc',
                quest: dialogue.quest,
                options: dialogue.options
              });
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
