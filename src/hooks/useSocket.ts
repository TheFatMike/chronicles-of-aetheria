import { useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import customParser from "socket.io-msgpack-parser";
import { useGameStore } from "../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { logger } from "../lib/logger";

export const useSocket = (token: string | null) => {
  const socketRef = useRef<Socket | null>(null);
  
  const { 
    setPlayers, 
    updatePlayer, 
    removePlayer, 
    addMessage, 
    setConnected,
    connected
  } = useGameStore(
    useShallow((s) => ({
      setPlayers: s.setPlayers,
      updatePlayer: s.updatePlayer,
      removePlayer: s.removePlayer,
      addMessage: s.addMessage,
      setConnected: s.setConnected,
      connected: s.connected
    }))
  );

  // Initialize Socket
  useEffect(() => {
    if (!token) {
      setConnected(false);
      return;
    }

    logger.info("socket", "Initializing connection...");
    const socket = io({
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
      parser: customParser
    });
    
    socketRef.current = socket;
    (window as any).socket = socket;

    // --- Listeners ---
    socket.on("connect", () => {
      setConnected(true);
      useGameStore.getState().setPlayerId(socket.id || null);
      logger.info("socket", "Connected", { id: socket.id, transport: socket.io.engine.transport.name });
    });

    socket.on("disconnect", (reason) => {
      logger.warn("socket", "Disconnected", { reason });
      setConnected(false);
      useGameStore.getState().setPlayerId(null);
    });

    socket.on("connect_error", (error) => {
      logger.error("socket", "Connection error", { message: error.message });
      setConnected(false);
    });

    socket.on("reconnect_attempt", (attempt) => {
      logger.info("socket", `Reconnection attempt #${attempt}`);
    });

    socket.on("reconnect_failed", () => {
      logger.error("socket", "All reconnection attempts failed");
    });

    socket.on("player_stats", (data) => {
      useGameStore.getState().updatePlayer(data.id, { 
        hp: data.hp, 
        mp: data.mp,
        maxHp: data.maxHp,
        maxMp: data.maxMp,
        level: data.level,
        exp: data.exp,
        maxExp: data.maxExp
      });
    });

    socket.on("players", (allPlayers) => {
      logger.debug("socket", `Received ${allPlayers.length} players`);
      useGameStore.getState().setPlayers(allPlayers);
    });

    socket.on("player_join", (player) => {
      logger.info("socket", `Player joined nearby: ${player.characterName}`);
      useGameStore.getState().updatePlayer(player.id, player);
    });
    
    socket.on("player_move", (data) => {
      useGameStore.getState().updatePlayer(data.id, { 
        pos: data.pos, 
        rot: data.rot, 
        isMoving: data.isMoving, 
        isGrounded: data.isGrounded,
        role: data.role
      });
    });

    socket.on("chat_message", (msg) => {
      logger.debug("socket", "Chat message received", msg);
      useGameStore.getState().addMessage(msg);
    });
    
    socket.on("move_correction", (data) => {
      logger.warn("socket", "Move correction received", data.pos);
      useGameStore.getState().requestTeleport(data.pos);
    });
    
    socket.on("player_leave", (id) => useGameStore.getState().removePlayer(id));
    
    // Entity Events
    socket.on("entity_spawn", (ent) => {
      logger.debug("socket", `Entity spawned: ${ent.name}`);
      useGameStore.getState().registerEntity(ent)
    });
    socket.on("entity_despawn", (id) => {
      logger.debug("socket", `Entity despawned: ${id}`);
      useGameStore.getState().unregisterEntity(id)
    });
    socket.on("entities", (ents) => {
      useGameStore.getState().setEntities(ents)
    });

    socket.on("entities_discover", (ents) => {
      useGameStore.getState().discoverEntities(ents);
    });

    socket.on("entities_remove", (ids) => {
      useGameStore.getState().removeEntities(ids);
    });

    socket.on("entities_update", (updates) => {
      updates.forEach((e: any) => useGameStore.getState().updateEntity(e.id, e));
    });

    // Spawner Events — server pushes live in-memory spawner list
    socket.on("spawners_sync", (spawnersArray) => {
      logger.debug("socket", `Spawners sync received: ${spawnersArray.length} spawners`);
      useGameStore.getState().setSpawners(spawnersArray);
    });
    
    socket.on("world_sync", (objects) => {
      logger.debug("socket", `World sync received: ${objects.length} objects`);
      useGameStore.getState().setWorldObjects(objects);
    });

    socket.on("session_start", (confirmedState) => {
      // Use a ref to prevent spamming the log with every state sync
      const lastSessionId = (socket as any)._lastSessionId;
      if (lastSessionId !== confirmedState.characterId) {
        logger.info("socket", "Session started with server-confirmed state", confirmedState.pos);
        (socket as any)._lastSessionId = confirmedState.characterId;
      }
      useGameStore.getState().requestTeleport(confirmedState.pos);
    });

    socket.on("world_object_updated", (obj) => {
      // Only log if not a campfire (to prevent flicker spam)
      if (obj.type !== "campfire") {
        logger.debug("socket", `World object updated: ${obj.type} (${obj.id}) model: ${obj.modelUrl || 'none'}`);
      }
      useGameStore.getState().addWorldObject(obj);
    });

    socket.on("world_object_removed", (data) => {
      logger.debug("socket", `World object removed: ${data.id}`);
      useGameStore.getState().removeWorldObject(data.id);
    });

    socket.on("world_sync", (objectsArray) => {
      logger.info("socket", `World sync received: ${objectsArray.length} objects`);
      useGameStore.getState().setWorldObjects(objectsArray);
    });

    // Party Events
    socket.on("party_invite_received", (invite) => {
      logger.info("socket", "Party invite received", invite);
      useGameStore.getState().setPartyInvite(invite);
    });

    socket.on("party_update", (party) => {
      logger.debug("socket", "Party update received", party);
      useGameStore.getState().setParty(party);
    });

    // Trade Events
    socket.on("trade_request_received", (request) => {
      logger.info("socket", "Trade request received", request);
      useGameStore.getState().setTradeRequest(request);
    });

    socket.on("trade_start", (trade) => {
      logger.info("socket", "Trade started", trade);
      useGameStore.getState().setActiveTrade(trade);
      useGameStore.getState().setTradeRequest(null);
    });

    socket.on("trade_cancel", () => {
      logger.info("socket", "Trade cancelled");
      useGameStore.getState().setActiveTrade(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // --- Emitters ---
  const sendMove = useCallback((pos: [number, number, number], rot: [number, number, number], isMoving = false, isGrounded = true) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    
    socket.emit("move", { pos, rot, isMoving, isGrounded });
    
    // Optimistic local update
    updatePlayer(socket.id as string, { pos, rot, isMoving, isGrounded });

    if (isMoving) {
      const state = useGameStore.getState();
      if (state.castState?.active) {
        state.cancelCast();
      }
    }
  }, [updatePlayer]);


  const sendJoin = useCallback((playerData: any) => {
    socketRef.current?.emit("join", playerData);
  }, []);

  const sendChat = useCallback((text: string) => {
    socketRef.current?.emit("chat_message", text);
  }, []);

  const requestWorldSync = useCallback(() => {
    socketRef.current?.emit("request_world_sync");
  }, []);

  return { 
    socket: socketRef.current, 
    sendMove, 
    sendJoin, 
    sendChat,
    requestWorldSync,
    connected
  };
};
