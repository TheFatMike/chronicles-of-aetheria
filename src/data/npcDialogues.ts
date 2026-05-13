import { Quest } from "../types";
import { DialogueOption } from "../store/types";
import { SAMPLE_QUESTS } from "./quests";

export interface DialogueNode {
  id: string;
  speaker?: string;
  text: string;
  options: DialogueOption[];
}

export const NPC_DIALOGUE_NODES: Record<string, Record<string, DialogueNode>> = {
  "instructor_kael": {
    "root": {
      id: "root",
      text: "Knowledge is the greatest weapon, but a sharp sword helps too. How can I assist you today, traveler?",
      options: [
        { label: "Tell me about this place.", action: "dialogue", targetId: "lore_1" },
        { label: "I need training.", action: "dialogue", targetId: "tutorial_1" },
        { label: "Goodbye.", action: "close" }
      ]
    },
    "lore_1": {
      id: "lore_1",
      text: "You stand in the heart of Aetheria. It was once a land of floating islands and pure magic, until the Great Shattering. Now, we survivors cling to what remains.",
      options: [
        { label: "Tell me more about the Shattering.", action: "dialogue", targetId: "lore_2" },
        { label: "Back to main topics.", action: "dialogue", targetId: "root" },
        { label: "Goodbye.", action: "close" }
      ]
    },
    "lore_2": {
      id: "lore_2",
      text: "The Shattering was caused by an imbalance in the Aether core. Some say it was an accident, others say it was a deliberate act of sabotage. Regardless, the world as we knew it ended that day.",
      options: [
        { label: "I see. Back to topics.", action: "dialogue", targetId: "root" },
        { label: "Goodbye.", action: "close" }
      ]
    },
    "tutorial_1": {
      id: "tutorial_1",
      text: "To survive here, you must master your skills. Press 'I' for inventory, 'C' for character, and 'K' for your skill book. Use the number keys to activate skills in your hotbar.",
      options: [
        { label: "I see. Back to topics.", action: "dialogue", targetId: "root" },
        { label: "Goodbye.", action: "close" }
      ]
    }
  },
  "guard": {
    "root": {
      id: "root",
      text: "The old graveyard is stirring. Watch your back, citizen. Is there something you need?",
      options: [
        { label: "What's happening at the graveyard?", action: "dialogue", targetId: "graveyard_lore" },
        { label: "Nothing, sorry.", action: "close" }
      ]
    },
    "graveyard_lore": {
      id: "graveyard_lore",
      text: "Skeletons have been rising from their graves. We believe a necromancer is hiding in the shadows, but my guards are spread too thin to investigate properly.",
      options: [
        { label: "I see. Back to topics.", action: "dialogue", targetId: "root" },
        { label: "Goodbye.", action: "close" }
      ]
    }
  },
  "merchant_silas": {
    "root": {
      id: "root",
      text: "Greetings, traveler! I've got the finest wares in all of Aetheria. Care to take a look?",
      options: [
        { label: "Show me your wares.", action: "shop", targetId: "general_merchant" },
        { label: "Tell me about yourself.", action: "dialogue", targetId: "about_silas" },
        { label: "Goodbye.", action: "close" }
      ]
    },
    "about_silas": {
      id: "about_silas",
      text: "I've been trading across these islands since before the Shattering. It's a dangerous living, but someone has to keep the supplies moving.",
      options: [
        { label: "I see. Show me what you have.", action: "shop", targetId: "general_merchant" },
        { label: "Interesting. Goodbye.", action: "close" }
      ]
    }
  },
  "blacksmith_torin": {
    "root": {
      id: "root",
      text: "Hmph. Need something forged? Or did you just come to watch the sparks fly?",
      options: [
        { label: "I need to buy equipment.", action: "shop", targetId: "blacksmith" },
        { label: "Goodbye.", action: "close" }
      ]
    }
  },
  "banker": {
    "root": {
      id: "root",
      text: "Welcome to the Vault of Aetheria. Your valuables are safer here than in a dragon's hoard. How can I help you?",
      options: [
        { label: "I'd like to access my storage.", action: "bank" },
        { label: "Is it really safe here?", action: "dialogue", targetId: "safety" },
        { label: "Goodbye.", action: "close" }
      ]
    },
    "safety": {
      id: "safety",
      text: "Absolutely. Our vaults are protected by ancient Aetheric seals. Even the Shattering couldn't break them!",
      options: [
        { label: "Impressive. I'll access my storage then.", action: "bank" },
        { label: "Good to know. Goodbye.", action: "close" }
      ]
    }
  },
  "farmer_bob": {
    "root": {
      id: "root",
      text: "The slimes... they're eating everything. Can you help me?",
      options: [
        { label: "Maybe Later", action: "close" }
      ]
    }
  }
};

export const NPC_DIALOGUE_METADATA: Record<string, any> = {
  "guard": {
    default: "The old graveyard is stirring. Watch your back, citizen.",
    greeting: "Hold there! Are you looking to help the town guard?",
    onQuestActive: "Keep at those skeletons. We need the graveyard cleared.",
    onQuestComplete: "Excellent work. The town sleeps a little safer tonight.",
  },
  "farmer_bob": {
    default: "The fields are a mess... sticky, green mess.",
    greeting: "Beg pardon, explorer. Could you help a poor farmer with a slime problem?",
    onQuestActive: "Those slimes won't clear themselves out!",
    onQuestComplete: "The harvest is saved! Thank you so much.",
  },
  "banker": {
    default: "Welcome to the Vault of Aetheria. Your valuables are safer here than in a dragon's hoard.",
    greeting: "Welcome! Are you looking to access your personal storage vault?",
  }
};

export interface DialogueResult {
  text: string;
  type: string;
  quest?: Quest | null;
  options?: DialogueOption[];
}

/**
 * Gets the dialogue for an NPC based on their state and quest progress.
 * If nodeId is provided, returns that specific node.
 */
export const getNPCDialogue = (npcId: string, npcType: string, npcName: string, state: any, nodeId?: string): DialogueResult => {
  const { activeQuests, quests } = state;
  // 1. Normalize npcType (strip npc_ prefix if present)
  const normalizedType = npcType.startsWith('npc_') ? npcType.replace('npc_', '') : npcType;

  // 2. If a specific node is requested (and it's not the root), return it
  if (nodeId && nodeId !== 'root' && NPC_DIALOGUE_NODES[normalizedType]?.[nodeId]) {
    const node = NPC_DIALOGUE_NODES[normalizedType][nodeId];
    return {
      text: node.text,
      options: node.options,
      type: 'dialogue'
    };
  }

  // --- 1. Gather all possible interactions ---
  const npcQuests = (Object.values(quests) as Quest[]).filter((q: Quest) => 
    q.giverId === npcId || q.giverId === normalizedType || q.giverName === npcName
  );

  const readyToTurnIn = npcQuests.filter((q: Quest) => {
    const pq = activeQuests[q.id];
    return pq && pq.status === 'active' && pq.objectives.every((o: any) => o.completed);
  });

  const availableQuests = npcQuests.filter((q: Quest) => {
    const pq = activeQuests[q.id];
    if (pq) return false;
    if (q.prerequisiteQuestId) {
      const prereq = activeQuests[q.prerequisiteQuestId];
      return prereq && prereq.status === 'completed';
    }
    return true;
  });

  const currentlyActive = npcQuests.filter((q: Quest) => activeQuests[q.id]?.status === 'active' && !readyToTurnIn.find(r => r.id === q.id));

  // Handle specific reminder node request
  if (nodeId && nodeId.startsWith('reminder_')) {
    const questId = nodeId.replace('reminder_', '');
    const q = npcQuests.find(quest => quest.id === questId);
    if (q) {
      const meta = NPC_DIALOGUE_METADATA[npcType] || {};
      return {
        text: meta.onQuestActive || `How goes the task for ${q.title}? Keep at it!`,
        options: [{ label: "Back to topics.", action: 'dialogue', targetId: 'root' }] as DialogueOption[],
        type: 'dialogue'
      };
    }
  }

  const hasDialogueTree = !!NPC_DIALOGUE_NODES[normalizedType]?.["root"];
  const rootNode = NPC_DIALOGUE_NODES[normalizedType]?.["root"];

  // --- 2. Build the options list ---
  const options: DialogueOption[] = [];

  // Add Turn-ins
  readyToTurnIn.forEach(q => {
    options.push({ label: `Complete Quest: ${q.title}`, action: 'quest', targetId: q.id });
  });

  // Add New Quests
  availableQuests.forEach(q => {
    options.push({ label: `New Quest: ${q.title}`, action: 'quest', targetId: q.id });
  });

  // Add Progress Checks for active quests
  currentlyActive.forEach(q => {
    options.push({ label: `About my task: ${q.title}`, action: 'quest', targetId: q.id });
  });

  // Add Lore/Tutorial options if it's a dialogue tree
  if (hasDialogueTree && rootNode) {
    // We filter out the 'quest' option from the root node if we already added quests above
    // to avoid redundancy, but usually custom trees have their own 'Do you have tasks?' option.
    rootNode.options.forEach(opt => {
      if (opt.action === 'quest') return; 
      options.push(opt);
    });
  }

  // Final check: if we have options but no close option, add one
  if (options.length > 0 && !options.some(o => o.action === 'close' || o.label === 'Goodbye' || o.label === 'Maybe Later')) {
    options.push({ label: "Maybe Later", action: "close" });
  }

  // --- 3. Decision Logic ---

  // Priority 1: If more than one option exists, show the selection menu
  if (options.length > 1) {
    return {
      text: rootNode?.text || "How can I help you, traveler?",
      options: options,
      type: 'dialogue'
    };
  }

  // Priority 2: If only one quest is ready to turn in, show it immediately (unless we have a dialogue tree)
  if (!hasDialogueTree && readyToTurnIn.length === 1 && options.length === 1) {
    const q = readyToTurnIn[0];
    return {
      text: "Incredible! You've done it. Here is your reward as promised.",
      quest: activeQuests[q.id],
      type: 'complete'
    };
  }

  // Priority 3: If only one quest is available, show it immediately (unless we have a dialogue tree)
  if (!hasDialogueTree && availableQuests.length === 1 && options.length === 1) {
    const q = availableQuests[0];
    const meta = NPC_DIALOGUE_METADATA[npcType] || {};
    return {
      text: `${meta.greeting || "Greetings traveler."} ${q.description}`,
      quest: q,
      type: 'offer',
      options: [
        { label: "New Quest", action: "quest", targetId: q.id },
        { label: "Maybe Later", action: "close" }
      ]
    };
  }

  // Priority 4: If only one dialogue option (like Lore) exists, show the root node
  if (hasDialogueTree && options.length > 0) {
    return {
      text: rootNode.text,
      options: options,
      type: 'dialogue'
    };
  }

  // Priority 5: If on an active quest but none ready to turn in/available
  if (currentlyActive.length > 0) {
    const q = currentlyActive[0];
    const meta = NPC_DIALOGUE_METADATA[normalizedType] || {};
    return {
      text: meta.onQuestActive || `How goes the task for ${q.title}? Keep at it!`,
      type: 'reminder'
    };
  }

  // Final Fallback: Default dialogue
  const meta = NPC_DIALOGUE_METADATA[normalizedType] || {};
  return {
    text: meta.default || "The winds of Aetheria are cold today. Watch your step, explorer.",
    type: 'default'
  };
};
