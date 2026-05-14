/**
 * @file src/hooks/useCombat.ts
 * @description Manages combat actions, skill casting, and ability management on the client.
 * Handles the logic for triggering skills, managing cooldowns, and calculating visual combat data.
 * @importance Essential: The central point for all player-initiated combat interactions and mechanics.
 */
import { useCallback, useRef, useEffect } from "react";
import { useGameStore } from "../store/useGameStore";
import { Character, Skill } from "@shared/types";
import { useShallow } from "zustand/react/shallow";
import { calculatePhysicalDamage, calculateMagicDamage, calculateTotalStats } from "../lib/gameUtils";
import { logger } from "../lib/logger";
import { ALL_SKILLS } from "@shared/data/skills";

export const useCombat = (socket: any) => {
  const { 
    localPlayer,
    currentTarget, 
    autoAttackTargetId, 
    setAutoAttackTarget, 
    setTarget 
  } = useGameStore(useShallow(state => ({
    localPlayer: state.localPlayer,
    currentTarget: state.currentTarget,
    autoAttackTargetId: state.autoAttackTargetId,
    setAutoAttackTarget: state.setAutoAttackTarget,
    setTarget: state.setTarget
  })));

  const addMessage = useGameStore(state => state.addMessage);
  const setSkillCooldown = useGameStore(state => state.setSkillCooldown);

  const useSkill = useCallback(async (skill: Skill, silent: boolean = false) => {
    const state = useGameStore.getState();
    const currentTarget = state.currentTarget;
    const players = state.players;
    
    // Attempt multiple ways to resolve our own player position
    let self = state.id ? players[state.id] : null;
    
    if (!self) {
      const matchingPlayer = Object.values(players).find(p => p.name === localPlayer?.name);
      if (matchingPlayer) self = matchingPlayer as any;
    }

    if (!self) {
      self = { id: state.id || "unknown", pos: localPlayer?.pos || [0,0,0] } as any;
    }

    if (!localPlayer || !socket) return;

    // 1. Check Cooldown
    const now = Date.now();
    const lastUsed = state.skillCooldowns[skill.id] || 0;
    if (now - lastUsed < skill.cooldown * 1000) {
      if (skill.id !== 'basic_attack' && !silent) {
        addMessage({
          id: Math.random().toString(),
          sender: "System",
          text: `${skill.name} is not ready yet!`,
          timestamp: now,
          color: "#9ca3af"
        });
      }
      return;
    }

    // 2. Check Mana
    if (localPlayer.mp < skill.manaCost) {
      if (!silent) {
        addMessage({
          id: Math.random().toString(),
          sender: "System",
          text: "Not enough mana!",
          timestamp: now,
          color: "#3b82f6"
        });
      }
      return;
    }

    // 3. Check Target & Range
    if (skill.targetType === 'target') {
      if (!currentTarget) {
        if (!silent) {
          addMessage({
            id: Math.random().toString(),
            sender: "System",
            text: "No target selected!",
            timestamp: now,
            color: "#9ca3af"
          });
        }
        return;
      }

      // Range Check
      if (currentTarget) {
        const ent = state.entities[currentTarget.id] || (state.players[currentTarget.id] as any);
        if (self && ent) {
          const dist = Math.sqrt(
            Math.pow(self.pos[0] - ent.pos[0], 2) +
            Math.pow(self.pos[2] - ent.pos[2], 2)
          );
          if (skill.range !== undefined && dist > skill.range) {
            if (!silent) {
              addMessage({
                id: Math.random().toString(),
                sender: "System",
                text: "Target is too far away!",
                timestamp: now,
                color: "#9ca3af"
              });
            }
            return;
          }
        } else if (!self) {
           return;
        }
      }
    }

    // 3.5 Cast Time Handling
    if (skill.castTime && skill.castTime > 0) {
      state.startCast(skill.name, skill.castTime);
      
      const castCompleted = await new Promise<boolean>((resolve) => {
        const interval = setInterval(() => {
          const currentState = useGameStore.getState();
          
          // Cancelled manually or by movement
          if (!currentState.castState) {
            clearInterval(interval);
            resolve(false);
          } 
          // Completed
          else if (Date.now() - currentState.castState.startTime >= skill.castTime!) {
            clearInterval(interval);
            currentState.completeCast();
            resolve(true);
          }
        }, 50);
      });

      if (!castCompleted) {
        addMessage({
          id: Math.random().toString(),
          sender: "System",
          text: "Cast cancelled.",
          timestamp: Date.now(),
          color: "#9ca3af"
        });
        return;
      }
    }

    // 4. Execute Action Locally (Visuals only)
    const finishTime = Date.now();
    setSkillCooldown(skill.id, finishTime);

     if (skill.id === 'fireball' && currentTarget && self) {
        useGameStore.getState().addProjectile({
          id: Math.random().toString(),
          startPos: [self.pos[0], self.pos[1] + 1, self.pos[2]],
          targetId: currentTarget.id,
          targetPos: (() => {
            const freshState = useGameStore.getState();
            const t = freshState.entities[currentTarget.id] || (freshState.players[currentTarget.id] as any);
            return t && t.pos ? [t.pos[0], t.pos[1], t.pos[2]] : [0,0,0];
          })(),
          speed: 15,
          color: "#ef4444",
          createdAt: Date.now()
        });
     }
    
    // 5. Send Intent to Server
    socket.emit("cast_skill", {
        skillId: skill.id,
        targetId: currentTarget?.id || (skill.healingMultiplier ? localPlayer.id : undefined)
    });

    // Trigger animation
    const { setAttacking } = useGameStore.getState();
    setAttacking(true);
    setTimeout(() => setAttacking(false), 300);

  }, [localPlayer, socket, addMessage, currentTarget, setSkillCooldown]);


  const basicAttack = useCallback((silent: boolean = false) => {
    const basic = ALL_SKILLS.find(s => s.id === 'basic_attack');
    if (basic) useSkill(basic, silent);
  }, [useSkill]);

  const stopCombat = useCallback(() => {
    setAutoAttackTarget(null);
    setTarget(null);
  }, [setAutoAttackTarget, setTarget]);

  // Auto-Attack Loop
  useEffect(() => {
    if (!autoAttackTargetId || !localPlayer) return;

    const interval = setInterval(() => {
      // Check if target still exists, is correct, and is alive
      const state = useGameStore.getState();
      if (state.currentTarget?.id !== autoAttackTargetId || state.currentTarget?.isDead) {
        setAutoAttackTarget(null);
        return;
      }

      basicAttack(true); // Silent checks for auto-attack loop
    }, 100); // High-frequency check for instant response when in range/off cooldown

    return () => clearInterval(interval);
  }, [autoAttackTargetId, localPlayer, basicAttack, setAutoAttackTarget]);

  const useSlot = useCallback(async (slotIndex: number) => {
    if (!localPlayer || !socket) return;
    
    const slot = localPlayer.hotbar[slotIndex];
    if (!slot) return;

    if (slot.type === 'skill') {
      useSkill(slot.data);
      // If it's a basic attack, also set as auto-attack target if we have a target
      if (slot.data.id === 'basic_attack' && currentTarget) {
        setAutoAttackTarget(currentTarget.id);
      }
    } else if (slot.type === 'item') {
      // Handle item use (potions etc)
      logger.info("combat", `Using item: ${slot.data.name}`);
    }
  }, [localPlayer, socket, useSkill, currentTarget, setAutoAttackTarget]);

  return { useSkill, useSlot, basicAttack, stopCombat };
};
