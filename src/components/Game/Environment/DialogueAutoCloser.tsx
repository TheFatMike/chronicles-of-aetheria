import { memo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../../../store/useGameStore";

export const DialogueAutoCloser = memo(() => {
  const activeDialogue = useGameStore(state => state.activeDialogue);
  const setActiveDialogue = useGameStore(state => state.setActiveDialogue);
  const entities = useGameStore(state => state.entities);
  const worldObjects = useGameStore(state => state.worldObjects);

  useFrame(() => {
    if (!activeDialogue) return;

    // Find the speaker's position
    let speakerPos: [number, number, number] | null = null;
    
    // Check dynamic entities first
    if (entities[activeDialogue.npcId]) {
      speakerPos = entities[activeDialogue.npcId].pos;
    } 
    // Check static world objects next
    else if (worldObjects[activeDialogue.npcId]) {
      speakerPos = worldObjects[activeDialogue.npcId].pos;
    }

    if (speakerPos) {
      const state = useGameStore.getState();
      const localPlayer = state.players[state.id || ""];
      if (!localPlayer) return;

      const distSq = (localPlayer.pos[0] - speakerPos[0])**2 + 
                     (localPlayer.pos[2] - speakerPos[2])**2;
      
      // Auto-close if distance > 10 meters (100 square)
      if (distSq > 100) {
        setActiveDialogue(null);
      }
    }
  });

  return null;
});
