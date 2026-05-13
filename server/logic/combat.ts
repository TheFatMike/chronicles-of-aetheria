/**
 * @file server/logic/combat.ts
 * @description Implements the core authoritative combat logic on the server.
 * Handles skill execution, damage calculations, and state updates for combat participants.
 * @importance Critical: The heart of the game's combat system, ensuring fair and synchronized interactions.
 */
import { ALL_SKILLS } from "../../src/data/skills";
import { calculateTotalStats, calculatePhysicalDamage, calculateMagicDamage } from "../../src/lib/gameUtils";
import { players, entities, lastSkillUse, parties, dirtyEntities, dirtyPlayers } from "../state";
import { db } from "../db";
import { serverLogger } from "../logger";
import { updateQuestProgress } from "./quest";
import { ENTITY_TEMPLATES } from "../data/entityTemplates";
import { CharacterModel } from "../../src/models/CharacterModel";
import { markPlayerDirty } from "../lib/stateUtils";
import { decrementSpawnerCount } from "../systems/spawners";
import { CastSkillSchema } from "../lib/schemas";
import { validatePayload } from "../lib/validation";

export const handleCastSkill = (socket: any, io: any, data: any) => {
  const validated = validatePayload(socket, CastSkillSchema, data, "cast_skill");
  if (!validated) return;

  const player = players.get(socket.id);
  if (!player) return;

  const skill = ALL_SKILLS.find(s => s.id === validated.skillId);
  if (!skill) return;

  // Level Check
  if (skill.levelRequired && (player.level || 1) < skill.levelRequired) {
    socket.emit("chat_message", { id: "sys-skill-lvl", sender: "SYSTEM", text: `You need to be level ${skill.levelRequired} to use ${skill.name}!`, timestamp: Date.now(), color: "#ff4444" });
    return;
  }

  // 0. Life Check
  if (player.hp <= 0) {
    socket.emit("chat_message", { id: "sys-dead", sender: "SYSTEM", text: "You cannot cast skills while dead!", timestamp: Date.now(), color: "#ff4444" });
    return;
  }

  // 1. Cooldown Check (Server-side)
  const playerCooldowns = lastSkillUse.get(socket.id) || {};
  const lastUse = playerCooldowns[skill.id] || 0;
  const now = Date.now();
  if (now - lastUse < (skill.cooldown || 1000) - 100) { // 100ms grace period for network latency
    return;
  }

  // 2. Mana Check
  if (player.mp < skill.manaCost) return;

  // Range check (Offensive)
  let targetEntity = validated.targetId ? entities.get(validated.targetId) : null;
  if (targetEntity && skill.targetType === 'target') {
    const dist = Math.sqrt(
      Math.pow(player.pos[0] - targetEntity.pos[0], 2) +
      Math.pow(player.pos[2] - targetEntity.pos[2], 2)
    );
    
    // Account for target size (radius) in the range check
    // We add half the target's scale to the allowable range
    const targetRadius = (targetEntity.scale || 1) / 2;
    const maxRange = (skill.range || 3) + targetRadius + 1.5;
    
    if (dist > maxRange) {
      socket.emit("chat_message", { id: "sys-range", sender: "SYSTEM", text: "Target is out of range!", timestamp: Date.now(), color: "#ffaa00" });
      return;
    }
  }

  // Range check (Friendly/Healing)
  if (skill.healingMultiplier && validated.targetId && validated.targetId !== socket.id) {
    const targetPlayer = players.get(validated.targetId);
    if (targetPlayer) {
      const dist = Math.sqrt(
        Math.pow(player.pos[0] - targetPlayer.pos[0], 2) +
        Math.pow(player.pos[2] - targetPlayer.pos[2], 2)
      );
      if (skill.range && dist > skill.range + 1.5) {
        socket.emit("chat_message", { id: "sys-range-heal", sender: "SYSTEM", text: "Target is too far to heal!", timestamp: Date.now(), color: "#ffaa00" });
        return;
      }
    }
  }

  player.mp -= skill.manaCost;
  markPlayerDirty(socket.id, ["mp"]);
  
  // Update Cooldown
  const currentCooldowns = lastSkillUse.get(socket.id) || {};
  currentCooldowns[skill.id] = now;
  lastSkillUse.set(socket.id, currentCooldowns);

  // Public update (HP/MP) for others
  io.emit("player_stats", { id: player.id, hp: player.hp, mp: player.mp });
  // Private update (Gold/XP) for self
  socket.emit("player_stats", { 
    id: player.id, 
    hp: player.hp, 
    mp: player.mp, 
    level: player.level, 
    exp: player.exp, 
    maxExp: player.maxExp, 
    gold: player.gold 
  });

  // Calculate amount
  const stats = calculateTotalStats(player.stats || {}, player.equipment || {});
  let amount = 0;
  if (skill.id === 'fireball' || skill.id === 'heal') {
    amount = Math.floor(calculateMagicDamage(stats) * (skill.damageMultiplier || skill.healingMultiplier || 1));
  } else {
    amount = Math.floor(calculatePhysicalDamage(stats) * (skill.damageMultiplier || 1));
  }
  if (isNaN(amount) || amount <= 0) amount = 1;

  // Healing
  if (skill.healingMultiplier) {
    let target = players.get(validated.targetId || socket.id);
    if (target) {
      target.hp = Math.min(target.maxHp || 100, target.hp + amount);
      markPlayerDirty(target.id, ["hp"]);
      io.emit("player_stats", { id: target.id, hp: target.hp, mp: target.mp });
      // If the target is a player, send them their full private stats too
      io.to(target.id).emit("player_stats", { 
        id: target.id, 
        hp: target.hp, 
        mp: target.mp, 
        level: target.level, 
        exp: target.exp, 
        maxExp: target.maxExp, 
        gold: target.gold 
      });
      socket.emit("chat_message", { id: Math.random().toString(), sender: "Combat", text: `You cast ${skill.name} for ${amount} healing!`, timestamp: Date.now(), color: "#22c55e" });
    }
    return;
  }

  // Damage
  if (validated.targetId) {
    const target = entities.get(validated.targetId);
    if (target && !target.isDead) {
      // PREVENT NPC DAMAGE
      if (target.type === 'npc') {
        socket.emit("chat_message", { 
          id: Math.random().toString(), 
          sender: "SYSTEM", 
          text: "You cannot attack friendly NPCs!", 
          timestamp: Date.now(), 
          color: "#ff4444" 
        });
        return;
      }

      target.hp = Math.max(0, target.hp - amount);
      target.lastUpdate = Date.now();
      dirtyEntities.add(target.id);
      
      socket.emit("chat_message", {
        id: Math.random().toString(),
        sender: "Combat",
        text: `You used ${skill.name} on ${target.name} for ${amount} damage!`,
        timestamp: Date.now(),
        color: skill.id === 'basic_attack' ? "#9ca3af" : "#ef4444"
      });

      if (target.hp <= 0 && !target.isDead) {
        target.isDead = true;
        target.isMoving = false;
        decrementSpawnerCount(target.spawnerId);
        // Generate loot from template
        const loot: string[] = [];
        const templateKey = target.class.toLowerCase();
        const template = ENTITY_TEMPLATES[templateKey];
        
        let goldDrop = 0;

        if (template && template.lootTable) {
          // Items
          const items = template.lootTable.items || [];
          items.forEach((entry: any) => {
            if (Math.random() <= entry.chance) {
              loot.push(entry.itemId);
            }
          });

          // Gold
          const goldChance = template.lootTable.goldChance ?? 1.0;
          if (Math.random() <= goldChance) {
            const minG = template.lootTable.minGold || 0;
            const maxG = template.lootTable.maxGold || 0;
            goldDrop = Math.floor(Math.random() * (maxG - minG + 1)) + minG;
          }
        } else {
          // Fallback if no template found
          goldDrop = Math.floor(Math.random() * 10) + 5 + (target.level || 1) * 2;
        }
        
        target.gold = goldDrop; 
        target.loot = loot;
        
        serverLogger.info("combat", `Target ${target.name} died. Class: ${target.class}, TemplateKey: ${templateKey}, Found: ${!!template}. Loot: ${loot.join(', ')}, Gold: ${goldDrop}`);

        serverLogger.info("combat", `${player.characterName} killed ${target.name}!`);

        // XP & LOOT
        const expReward = target.expReward || 0;
        
        if (player.partyId && parties.has(player.partyId)) {
          const party = parties.get(player.partyId);
          const share = Math.floor(expReward / party.members.length);
          party.members.forEach((mId: string) => {
            const p = players.get(mId);
            if (p) giveExperience(io, p, share);
          });
        } else {
          giveExperience(io, player, expReward);
        }

        // QUEST PROGRESS TRACKING
        if (player.partyId && parties.has(player.partyId)) {
          const party = parties.get(player.partyId);
          party.members.forEach((mId: string) => {
            const member = players.get(mId);
            if (member) {
              const dist = Math.sqrt(
                Math.pow(member.pos[0] - target.pos[0], 2) +
                Math.pow(member.pos[2] - target.pos[2], 2)
              );
              // Shared credit range: 50 meters
              if (dist < 50) {
                const memberSocket = io.sockets.sockets.get(mId);
                if (memberSocket) {
                  updateQuestProgress(memberSocket, member, "kill", target.class);
                }
              }
            }
          });
        } else {
          updateQuestProgress(socket, player, "kill", target.class);
        }
        
        // Cleanup corpse after 5 minutes
        setTimeout(() => {
          const currentEntity = entities.get(target.id);
          if (currentEntity && currentEntity.isDead) {
            entities.delete(target.id);
            io.emit("entity_despawn", target.id);
          }
        }, 300000); // 5 minutes
      }
    }
  }
};

export function giveExperience(io: any, player: any, amount: number) {
  player.exp = (player.exp || 0) + amount;
  
  if (player.exp >= (player.maxExp || 100)) {
    player.level = (player.level || 1) + 1;
    player.exp -= (player.maxExp || 100);
    player.maxExp = player.level * 100;
    player.hp = player.maxHp; // Heal on level up
    player.mp = player.maxMp;
    player.passivePoints = (player.passivePoints || 0) + 1;
    markPlayerDirty(player.id, ["level", "exp", "maxExp", "hp", "mp", "passivePoints"]);
    
    io.to(player.id).emit("chat_message", { 
      sender: "SYSTEM", 
      text: `Congratulations! You have reached level ${player.level}!`, 
      color: "#facc15" 
    });

    // SYNC PARTY ON LEVEL UP
    if (player.partyId && parties.has(player.partyId)) {
      const party = parties.get(player.partyId);
      if (party) {
        const updateData = {
          ...party,
          memberDetails: party.members.map((id: string) => {
            const p = players.get(id);
            return p ? { id: p.id, name: p.characterName, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, class: p.class, color: p.color, level: p.level } : null;
          }).filter(Boolean)
        };
        party.members.forEach((mId: string) => io.to(mId).emit("party_update", updateData));
      }
    }
  }
  
  io.to(player.id).emit("player_stats", {
    id: player.id,
    hp: player.hp,
    mp: player.mp,
    maxHp: player.maxHp,
    maxMp: player.maxMp,
    level: player.level,
    exp: player.exp,
    maxExp: player.maxExp,
    gold: player.gold,
    passivePoints: player.passivePoints
  });
  markPlayerDirty(player.id, ["exp", "level", "gold", "hp", "mp", "passivePoints"]);
}
