import { ALL_SKILLS } from "../../src/data/skills";
import { calculateTotalStats, calculatePhysicalDamage, calculateMagicDamage } from "../../src/lib/gameUtils";
import { players, entities, lastSkillUse } from "../state";
import { db } from "../db";
import { serverLogger } from "../logger";

export const handleCastSkill = (socket: any, io: any, data: any) => {
  const player = players.get(socket.id);
  if (!player) return;

  const skill = ALL_SKILLS.find(s => s.id === data.skillId);
  if (!skill) return;

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

  io.emit("player_stats", { id: player.id, hp: player.hp, mp: player.mp });

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
      
      socket.emit("chat_message", {
        id: Math.random().toString(),
        sender: "Combat",
        text: `You used ${skill.name} on ${target.name} for ${amount} damage!`,
        timestamp: Date.now(),
        color: skill.id === 'basic_attack' ? "#9ca3af" : "#ef4444"
      });

      if (target.hp <= 0) {
        target.isDead = true;
        target.isMoving = false;
        const loot = ["gold_coin"];
        if (target.class === "Slime" && Math.random() < 0.8) loot.push("slime_goo");
        target.loot = loot;
        
        serverLogger.info("combat", `${player.characterName} killed ${target.name}!`);

        // QUEST PROGRESS TRACKING
        if (player.quests) {
          let questChanged = false;
          Object.values(player.quests).forEach((quest: any) => {
            if (quest.status === "active") {
              quest.objectives.forEach((obj: any) => {
                if (obj.type === "kill" && obj.targetId === target.class && !obj.completed) {
                  obj.currentCount = Math.min(obj.count, (obj.currentCount || 0) + 1);
                  if (obj.currentCount >= obj.count) {
                    obj.completed = true;
                    socket.emit("chat_message", {
                      id: "sys-q-" + Date.now(),
                      sender: "QUEST",
                      text: `Objective Complete: ${obj.targetName} (${obj.currentCount}/${obj.count})`,
                      timestamp: Date.now(),
                      color: "#c2a472"
                    });
                  } else {
                    socket.emit("chat_message", {
                      id: "sys-q-" + Date.now(),
                      sender: "QUEST",
                      text: `${quest.title}: ${obj.targetName} ${obj.currentCount}/${obj.count}`,
                      timestamp: Date.now(),
                      color: "#c2a472"
                    });
                  }
                  questChanged = true;
                }
              });
            }
          });

          if (questChanged) {
            socket.emit("quest_update", player.quests);
            // PERSIST TO DB
            db.collection("users").doc(player.userId).collection("characters").doc(player.characterId).set({
              quests: player.quests
            }, { merge: true }).catch((e: any) => serverLogger.error("firestore", "Quest save failed", e.message));
          }
        }
        
        setTimeout(() => {
          if (entities.has(target.id) && entities.get(target.id).isDead) {
            entities.delete(target.id);
            io.emit("entity_despawn", target.id);
          }
        }, 60000);
      }
    }
  }
};
