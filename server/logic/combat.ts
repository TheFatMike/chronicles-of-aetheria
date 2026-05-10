import { ALL_SKILLS } from "../../src/data/skills";
import { calculateTotalStats, calculatePhysicalDamage, calculateMagicDamage } from "../../src/lib/gameUtils";
import { players, entities, lastSkillUse, parties, dirtyEntities } from "../state";
import { db } from "../db";
import { serverLogger } from "../logger";
import { updateQuestProgress } from "./quest";
import { ENTITY_TEMPLATES } from "../data/entityTemplates";
import { decrementSpawnerCount } from "../systems/spawners";

export const handleCastSkill = (socket: any, io: any, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const skill = ALL_SKILLS.find(s => s.id === data.skillId);
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

  // Range check
  let targetEntity = data.targetId ? entities.get(data.targetId) : null;
  if (targetEntity && skill.targetType === 'target') {
    const dist = Math.sqrt(
      Math.pow(player.pos[0] - targetEntity.pos[0], 2) +
      Math.pow(player.pos[2] - targetEntity.pos[2], 2)
    );
    if (skill.range && dist > skill.range + 1.5) return;
  }

  player.mp -= skill.manaCost;
  
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
    let target = players.get(data.targetId || socket.id);
    if (target) {
      target.hp = Math.min(target.maxHp || 100, target.hp + amount);
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
  if (data.targetId) {
    const target = entities.get(data.targetId);
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
        updateQuestProgress(socket, player, "kill", target.class);
        
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
    
    io.to(player.id).emit("chat_message", { 
      sender: "SYSTEM", 
      text: `Congratulations! You have reached level ${player.level}!`, 
      color: "#facc15" 
    });
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
    gold: player.gold
  });
  
}
