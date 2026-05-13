/**
 * @file src/components/Game/OtherPlayer.tsx
 * @description Renders other players currently connected to the game world.
 * Synchronizes their visual state, animations, and equipment based on server updates.
 * @importance Essential: Key for the multiplayer experience, allowing players to see and interact with each other.
 */
import { memo } from "react";
import { Humanoid } from "./Humanoid";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { BaseEntity } from "./BaseEntity";

interface OtherPlayerProps {
  id: string;
}

export const OtherPlayer = memo(({ id }: OtherPlayerProps) => {
  // Subscribe only to this player's data
  const player = useGameStore(useShallow((state) => state.players[id]));
  
  if (!player) return null;

  return (
    <BaseEntity
      id={id}
      name={player.name}
      type="player"
      level={1} // Could be in player state
      position={player.pos}
      rotation={player.rot}
      color={player.color}
      role={player.class}
      isGrounded={player.isGrounded}
      nameOffset={1.8}
    >
      <Humanoid 
        color={player.color} 
        isMoving={player.isMoving} 
        isGrounded={player.isGrounded} 
        isAttacking={player.isAttacking}
      />

    </BaseEntity>
  );
});

OtherPlayer.displayName = "OtherPlayer";
