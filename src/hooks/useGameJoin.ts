import { useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { Character } from "../types";
import { Socket } from "socket.io-client";
import { useGameStore } from "../store/useGameStore";
import { logger } from "../lib/logger";
import { getAccountRole } from "../lib/permissions";

interface useGameJoinProps {
  user: User | null;
  selectedCharacter: Character | null;
  connected: boolean;
  socket: Socket | null;
  sendJoin: (data: any) => void;
  requestWorldSync: () => void;
  setIsJoining: (loading: boolean) => void;
}

export const useGameJoin = ({
  user,
  selectedCharacter,
  connected,
  socket,
  sendJoin,
  requestWorldSync,
  setIsJoining
}: useGameJoinProps) => {
  const lastJoinedRef = useRef<{ charId: string; socketId: string } | null>(null);

  useEffect(() => {
    const socketId = socket?.id;
    if (!user || !selectedCharacter || !connected || !socketId) return;

    const alreadyJoined = lastJoinedRef.current?.charId === selectedCharacter.id && 
                          lastJoinedRef.current?.socketId === socketId;

    if (!alreadyJoined) {
      logger.info("play", `Joining world as ${selectedCharacter.name} (${selectedCharacter.id}) | Socket: ${socketId}`);
      setIsJoining(true);
      useGameStore.getState().setWorldLoading(true);
      lastJoinedRef.current = { charId: selectedCharacter.id, socketId };
      
      sendJoin({
        displayName: user.displayName || "Unknown User",
        characterId: selectedCharacter.id,
        characterName: selectedCharacter.name,
        class: selectedCharacter.class,
        color: selectedCharacter.color,
        role: getAccountRole(user.email),
        pos: selectedCharacter.pos,
        rot: selectedCharacter.rot,
        hp: selectedCharacter.hp,
        mp: selectedCharacter.mp
      });

      requestWorldSync();
      setTimeout(() => {
        setIsJoining(false);
        useGameStore.getState().setWorldLoading(false);
      }, 1500);
    }
  }, [user, selectedCharacter, connected, socket?.id, sendJoin, requestWorldSync, setIsJoining]);
};
