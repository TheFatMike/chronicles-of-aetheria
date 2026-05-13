import { memo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "../../../store/useGameStore";

export const InteractionAutoCloser = memo(() => {
  const activeDialogue = useGameStore(state => state.activeDialogue);
  const setActiveDialogue = useGameStore(state => state.setActiveDialogue);
  
  const isShopOpen = useGameStore(state => state.isShopOpen);
  const activeShopNPCId = useGameStore(state => state.activeShopNPCId);
  const setShopOpen = useGameStore(state => state.setShopOpen);
  
  const isBankOpen = useGameStore(state => state.isBankOpen);
  const activeBankNPCId = useGameStore(state => state.activeBankNPCId);
  const setBankOpen = useGameStore(state => state.setBankOpen);
  
  const entities = useGameStore(state => state.entities);
  const worldObjects = useGameStore(state => state.worldObjects);

  useFrame(() => {
    const state = useGameStore.getState();
    const localPlayer = state.players[state.id || ""];
    if (!localPlayer) return;

    const checkDistance = (npcId: string, onClose: () => void) => {
      let npcPos: [number, number, number] | null = null;
      if (entities[npcId]) npcPos = entities[npcId].pos;
      else if (worldObjects[npcId]) npcPos = worldObjects[npcId].pos;

      if (npcPos) {
        const distSq = (localPlayer.pos[0] - npcPos[0])**2 + 
                       (localPlayer.pos[2] - npcPos[2])**2;
        if (distSq > 100) onClose(); // 10m range
      }
    };

    if (activeDialogue) {
      checkDistance(activeDialogue.npcId, () => setActiveDialogue(null));
    }

    if (isShopOpen && activeShopNPCId) {
      checkDistance(activeShopNPCId, () => setShopOpen(false));
    }

    if (isBankOpen && activeBankNPCId) {
      checkDistance(activeBankNPCId, () => setBankOpen(false));
    }

    // New: Clear target if walking away (standard RPG behavior)
    const currentTarget = state.currentTarget;
    if (currentTarget) {
      const targetId = currentTarget.id;
      let targetPos: [number, number, number] | null = null;
      
      if (entities[targetId]) targetPos = entities[targetId].pos;
      else if (worldObjects[targetId]) targetPos = worldObjects[targetId].pos;
      else if (state.players[targetId]) targetPos = state.players[targetId].pos;

      if (targetPos) {
        const distSq = (localPlayer.pos[0] - targetPos[0])**2 + 
                       (localPlayer.pos[2] - targetPos[2])**2;
        if (distSq > 1600) { // 40m range for losing target
          state.setTarget(null);
        }
      }
    }
  });

  return null;
});
