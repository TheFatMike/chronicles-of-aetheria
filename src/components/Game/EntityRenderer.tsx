/**
 * @file src/components/Game/EntityRenderer.tsx
 * @description Central manager for rendering all non-player entities.
 * Dynamically selects and renders the appropriate component based on entity type.
 * @importance Essential: Simplifies the main scene logic by abstracting the rendering of diverse entities.
 */
import { memo, useState, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { NPC } from "./NPC";
import { SlimeEnemy, SkeletonEnemy, GoblinEnemy, WolfEnemy } from "./Enemy";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { SAMPLE_QUESTS } from "@shared/data/quests";
import { getNPCDialogue } from "@shared/data/npcDialogues";

import { useThree } from "@react-three/fiber";

interface EntityRendererProps {
  onAttack?: () => void;
  onLoot?: (id: string) => void;
}

export const EntityRenderer = memo(({ onAttack, onLoot }: EntityRendererProps) => {
  const { camera } = useThree();
  const entities = useGameStore(state => state.entities);
  const localPlayerPos = useGameStore(state => state.players[state.id || ""]?.pos);

  // Spatial Culling (Reactive & High Performance)
  const culledEntities = useMemo(() => {
    if (!localPlayerPos) return [];
    const CULL_DISTANCE_SQ = 180 * 180;
    return Object.values(entities).filter(ent => {
      const dx = ent.pos[0] - localPlayerPos[0];
      const dz = ent.pos[2] - localPlayerPos[2];
      return (dx*dx + dz*dz) < CULL_DISTANCE_SQ;
    });
  }, [entities, localPlayerPos]);

  const setActiveDialogue = useGameStore(state => state.setActiveDialogue);
  const activeQuests = useGameStore(state => state.activeQuests);

  return (
    <>
      {culledEntities.map(ent => (
        ent.type === 'npc' ? (
          <NPC 
            key={ent.id}
            id={ent.id} 
            name={ent.name} 
            role={ent.class || "Villager"} 
            entityClass={ent.entityClass}
            position={ent.pos} 
            rotation={ent.rot}
            color={ent.color || "#facc15"} 
            hp={ent.hp}
            maxHp={ent.maxHp}
            isMoving={ent.isMoving}
            isAttacking={ent.isAttacking}
            modelUrl={ent.modelUrl}
            scale={Array.isArray(ent.scale) ? ent.scale[0] : (ent.scale || 1)}
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
          (() => {
            const eClass = (ent.entityClass || "").toLowerCase();
            if (eClass === 'skeleton') return <SkeletonEnemy key={ent.id} id={ent.id} name={ent.name} level={ent.level} position={ent.pos} hp={ent.hp} maxHp={ent.maxHp} isDead={ent.isDead} scale={Array.isArray(ent.scale) ? ent.scale[0] : (ent.scale || 1)} onAttack={onAttack} onLoot={onLoot} />;
            if (eClass === 'goblin') return <GoblinEnemy key={ent.id} id={ent.id} name={ent.name} level={ent.level} position={ent.pos} hp={ent.hp} maxHp={ent.maxHp} isDead={ent.isDead} scale={Array.isArray(ent.scale) ? ent.scale[0] : (ent.scale || 1)} onAttack={onAttack} onLoot={onLoot} />;
            if (eClass === 'wolf') return <WolfEnemy key={ent.id} id={ent.id} name={ent.name} level={ent.level} position={ent.pos} hp={ent.hp} maxHp={ent.maxHp} isDead={ent.isDead} scale={Array.isArray(ent.scale) ? ent.scale[0] : (ent.scale || 1)} onAttack={onAttack} onLoot={onLoot} />;
            
            return (
              <SlimeEnemy 
                key={ent.id}
                id={ent.id} 
                name={ent.name} 
                level={ent.level} 
                position={ent.pos} 
                hp={ent.hp}
                maxHp={ent.maxHp}
                isDead={ent.isDead}
                scale={Array.isArray(ent.scale) ? ent.scale[0] : (ent.scale || 1)}
                color={ent.color || "#ef4444"}
                onAttack={onAttack}
                onLoot={onLoot}
              />
            );
          })()
        )
      ))}
    </>
  );
});

EntityRenderer.displayName = "EntityRenderer";
