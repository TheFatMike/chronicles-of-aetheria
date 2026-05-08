import { Character, InventoryItem, Stats, EquipmentSlots } from "../types";
import { calculateTotalStats, calculateMaxHP, calculateMaxMP } from "../lib/gameUtils";

export class CharacterModel {
  static createDefaultInventory(length: number = 30): (InventoryItem | null)[] {
    return Array(length).fill(null);
  }

  static fromFirestore(id: string, data: any, accountRole: string = "player"): Character {
    const inventory = this.ensureValidInventory(data.inventory);
    const equipment = this.ensureValidEquipment(data.equipment);
    const stats = data.stats || { strength: 10, dexterity: 10, wisdom: 10, intelligence: 10, stamina: 10 };
    
    const { maxHp, maxMp } = this.calculateDerivedStats(stats, equipment);

    return {
      id,
      name: data.name || "Unknown",
      class: data.class || "warrior",
      color: data.color || "#ccc",
      level: data.level || 1,
      exp: data.exp || 0,
      maxExp: data.maxExp || (data.level || 1) * 100,
      stats,
      hp: Math.min(data.hp ?? maxHp, maxHp),
      maxHp,
      mp: Math.min(data.mp ?? maxMp, maxMp),
      maxMp,
      inventory,
      hotbar: data.hotbar || Array(10).fill(null),
      equipment,
      quests: data.quests || {},
      skills: data.skills || [],
      gold: data.gold || 0,
      role: accountRole,
      pos: data.pos || [0, 0, 0],
      rot: data.rot || [0, 0, 0]
    };

  }

  static ensureValidInventory(inventory?: (InventoryItem | null)[]): (InventoryItem | null)[] {
    const inv = inventory || [];
    if (inv.length < 30) {
      const padded = this.createDefaultInventory(30);
      inv.forEach((item, i) => {
        if (i < 30) padded[i] = item;
      });
      return padded;
    }
    return inv;
  }

  static ensureValidEquipment(equipment?: Partial<EquipmentSlots>): EquipmentSlots {
    return {
      head: equipment?.head || null,
      chest: equipment?.chest || null,
      legs: equipment?.legs || null,
      boots: equipment?.boots || null,
      weapon: equipment?.weapon || null,
      offhand: equipment?.offhand || null,
      accessory: equipment?.accessory || null,
    };
  }

  static calculateDerivedStats(stats: Stats, equipment: EquipmentSlots) {
    const totalStats = calculateTotalStats(stats, equipment);
    return {
      maxHp: calculateMaxHP(totalStats),
      maxMp: calculateMaxMP(totalStats)
    };
  }

  static equipItem(character: Character, item: InventoryItem): Character | null {
    const newInventory = [...character.inventory];
    const itemIdx = newInventory.findIndex(i => i?.id === item.id);
    if (itemIdx === -1) return null;

    let slot = item.type as keyof EquipmentSlots;
    // Backward compatibility for old "armor" type
    if (item.type === "armor" as any) {
      const name = item.name.toLowerCase();
      if (name.includes("shield") || name.includes("tome")) slot = "offhand";
      else if (name.includes("cap") || name.includes("helm")) slot = "head";
      else if (name.includes("boots") || name.includes("shoes")) slot = "boots";
      else if (name.includes("pants") || name.includes("legs")) slot = "legs";
      else slot = "chest";
    }

    const newEquipment: EquipmentSlots = {
      head: character.equipment?.head || null,
      chest: character.equipment?.chest || null,
      legs: character.equipment?.legs || null,
      boots: character.equipment?.boots || null,
      weapon: character.equipment?.weapon || null,
      offhand: character.equipment?.offhand || null,
      accessory: character.equipment?.accessory || null,
    };
    let outgoingItems: (InventoryItem | null)[] = [];

    if (slot === "weapon" && item.twoHanded) {
      outgoingItems.push(newEquipment.weapon || null);
      outgoingItems.push(newEquipment.offhand || null);
      newEquipment.weapon = item;
      newEquipment.offhand = null;
    } else if (slot === "offhand") {
      outgoingItems.push(newEquipment.offhand || null);
      if (newEquipment.weapon?.twoHanded) {
        outgoingItems.push(newEquipment.weapon || null);
        newEquipment.weapon = null;
      }
      newEquipment.offhand = item;
    } else {
      const slotKey = slot as string;
      outgoingItems.push(newEquipment[slotKey] || null);
      newEquipment[slotKey] = item;
    }

    // Place previous items back into inventory
    newInventory[itemIdx] = null; // Clear original slot first
    outgoingItems.filter((out): out is InventoryItem => out !== null).forEach(out => {
      const emptyIdx = newInventory.findIndex(i => i === null);
      if (emptyIdx > -1) newInventory[emptyIdx] = out;
    });

    const { maxHp, maxMp } = this.calculateDerivedStats(character.stats, newEquipment);

    return {
      ...character,
      inventory: newInventory,
      equipment: newEquipment as EquipmentSlots,
      maxHp,
      maxMp,
      hp: Math.min(character.hp, maxHp),
      mp: Math.min(character.mp, maxMp)
    };
  }

  static unequipItem(character: Character, slot: keyof EquipmentSlots): Character | null {
    if (!character.equipment) return null;
    const slotKey = slot as string;
    const item = character.equipment[slotKey];
    if (!item) return null;

    const newInventory = [...character.inventory];
    const emptyIdx = newInventory.findIndex(i => i === null);
    if (emptyIdx === -1) return null; // No space

    const newEquipment: EquipmentSlots = {
      head: character.equipment.head || null,
      chest: character.equipment.chest || null,
      legs: character.equipment.legs || null,
      boots: character.equipment.boots || null,
      weapon: character.equipment.weapon || null,
      offhand: character.equipment.offhand || null,
      accessory: character.equipment.accessory || null,
    };
    newEquipment[slotKey] = null;
    newInventory[emptyIdx] = item;

    const { maxHp, maxMp } = this.calculateDerivedStats(character.stats, newEquipment as EquipmentSlots);

    return {
      ...character,
      inventory: newInventory,
      equipment: newEquipment as EquipmentSlots,
      maxHp,
      maxMp,
      hp: Math.min(character.hp, maxHp),
      mp: Math.min(character.mp, maxMp)
    };
  }
}
