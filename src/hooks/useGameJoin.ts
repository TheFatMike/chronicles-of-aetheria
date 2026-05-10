/**
 * @file src/hooks/useGameJoin.ts
 * @description Manages the logic for a player joining the game world.
 * Handles character-to-world transitions, initial state requests, and loading status updates.
 * @importance Essential: Orchestrates the critical transition from the menu into the active gameplay state.
 */
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
    if (!setIsJoining || !selectedCharacter) return;
    
    // Check if essential data is ready
    const checkReady = () => {
      const state = useGameStore.getState();
      const hasObjects = Object.keys(state.worldObjects).length > 0;
      const hasSpawners = Object.keys(state.spawners).length > 0;
      const hasEntities = Object.keys(state.entities).length > 0;
      
      // If we are joining, we should at least wait for world objects and spawners sync
      // Note: In an empty world, this might never trigger, so we still need a safety timeout
      if (hasObjects && hasSpawners) {
        return true;
      }
      return false;
    };

    if (useGameStore.getState().isWorldLoading) {
      const interval = setInterval(() => {
        if (checkReady()) {
          setIsJoining(false);
          useGameStore.getState().setWorldLoading(false);
          logger.info("play", "World data verified. Weaving complete.");
          clearInterval(interval);
        }
      }, 500);

      // Safety timeout: 8 seconds
      const timeout = setTimeout(() => {
        setIsJoining(false);
        useGameStore.getState().setWorldLoading(false);
        logger.warn("play", "World loading timed out (Safety Trigger).");
        clearInterval(interval);
      }, 8000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [selectedCharacter, setIsJoining]);

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
    }
  }, [user, selectedCharacter, connected, socket?.id, sendJoin, requestWorldSync, setIsJoining]);
};
