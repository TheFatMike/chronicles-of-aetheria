/**
 * @file src/components/Game/EntityRenderer.tsx
 * @description Central manager for rendering all non-player entities.
 * Dynamically selects and renders the appropriate component based on entity type.
 * @importance Essential: Simplifies the main scene logic by abstracting the rendering of diverse entities.
 */
import { memo, useState, useEffect, useMemo, useRef } from "react";
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
  const { camera } = useThree();
  const [nearbyEntities, setNearbyEntities] = useState<any[]>([]);
  const lastCullPos = useRef(new THREE.Vector3());

  // Spatial Culling (Reactive): Only update when player moves > 2m or entities list changes
  useEffect(() => {
    const updateNearby = () => {
      const state = useGameStore.getState();
      const localPlayer = state.players[state.id || ""];
      if (!localPlayer) return;

      const playerPos = new THREE.Vector3(localPlayer.pos[0], localPlayer.pos[1], localPlayer.pos[2]);
      
      // If we haven't moved much and we have entities, skip (unless list size changed)
      const distMoved = playerPos.distanceTo(lastCullPos.current);
      const currentEntities = Object.values(state.entities);
      
      let hasUpdates = nearbyEntities.length !== currentEntities.length;
      if (!hasUpdates) {
        for (let i = 0; i < nearbyEntities.length; i++) {
          if (state.entities[nearbyEntities[i].id] !== nearbyEntities[i]) {
            hasUpdates = true;
            break;
          }
        }
      }

      if (distMoved < 2 && !hasUpdates && nearbyEntities.length > 0) return;

      lastCullPos.current.copy(playerPos);
      
      const CULL_DISTANCE_SQ = 180 * 180;
      const filtered = currentEntities.filter(ent => {
        const dx = ent.pos[0] - localPlayer.pos[0];
        const dz = ent.pos[2] - localPlayer.pos[2];
        return (dx*dx + dz*dz) < CULL_DISTANCE_SQ;
      });
      
      setNearbyEntities(filtered);
    };

    // Subscribing to entities count changes (add/remove)
    const unsubscribe = useGameStore.subscribe(
      (state) => Object.keys(state.entities).length,
      () => updateNearby()
    );

    // Frequent check for movement, but thresholded internally
    const interval = setInterval(updateNearby, 300);
    
    updateNearby();
    return () => {
      unsubscribe();
      clearInterval(interval);
    }
  }, [camera]); 

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
            entityClass={ent.entityClass}
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
