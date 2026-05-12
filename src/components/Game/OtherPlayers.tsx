import { memo } from "react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { OtherPlayer } from "./OtherPlayer";

export const OtherPlayers = memo(() => {
  const players = useGameStore(useShallow(state => Object.keys(state.players)));
  const currentPlayerId = useGameStore(state => state.id);

  return (
    <>
      {players.map(pid => pid !== currentPlayerId && (
        <OtherPlayer key={pid} id={pid} />
      ))}
    </>
  );
});

OtherPlayers.displayName = "OtherPlayers";
