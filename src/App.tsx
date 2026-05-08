/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Character, EquipmentSlots } from "./types";
import { Login } from "./components/UI/Login";
import { CharacterCreation } from "./components/UI/CharacterCreation";
import { CharacterSelection } from "./components/UI/CharacterSelection";
import { GameMenu } from "./components/UI/GameMenu";
import { GameView } from "./components/Game/GameView";
import { useSocket } from "./hooks/useSocket";
import { useGameStore } from "./store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { Chat } from "./components/UI/Chat";
import { MenuManager } from "./components/UI/MenuManager";
import { Hotbar } from "./components/UI/Hotbar";
import { LoadingScreen } from "./components/UI/LoadingScreen";
import { TargetFrame } from "./components/UI/TargetFrame";
import { DebugOverlay } from "./components/UI/DebugOverlay";
import { WorldEditor } from "./components/UI/WorldEditor";
import { useCharacters } from "./hooks/useCharacters";
import { useInventory } from "./hooks/useInventory";
import { useKeybindings } from "./hooks/useKeybindings";
import { useChatCommands } from "./hooks/useChatCommands";
import { motion, AnimatePresence } from "motion/react";
import { calculateHPRegen, calculateMPRegen, calculateTotalStats } from "./lib/gameUtils";
import { logger } from "./lib/logger";
import { getAccountRole } from "./lib/permissions";
import { handleFirestoreError, OperationType } from "./lib/firestoreErrorHandler";
import { CastBar } from "./components/UI/CastBar";


import { useCombat } from "./hooks/useCombat";
import { ALL_SKILLS } from "./data/skills";
import { PlayerHUD } from "./components/UI/PlayerHUD";
import { PartyFrames } from "./components/UI/PartyFrames";
import { NotificationManager } from "./components/UI/NotificationManager";
import { TradeWindow } from "./components/UI/TradeWindow";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const initialFetchAttempted = useRef(false);

  // Custom Hooks
  const { socket, sendMove, sendJoin, sendChat, requestWorldSync, connected } = useSocket(token);
  
  const {
    characters,
    fetchCharacters,
    createCharacter,
    creationLoading,
    creationError,
    setCreationError,
    loading: charsLoading,
    deleteCharacter
  } = useCharacters(user, socket);

  const { moveItem, splitStack, updateHotbar, equipItem, unequipItem } = useInventory(user, selectedCharacter, setSelectedCharacter, socket);
  const { executeCommand } = useChatCommands(user, selectedCharacter, setSelectedCharacter, socket);
  const { useSlot, basicAttack, stopCombat } = useCombat(selectedCharacter, setSelectedCharacter, socket);



    const {
    activeMenu,
    devMode,
    players,
    activeDialogue,
    setActiveDialogue,
    addQuest,
    setActiveQuests,
    addMessage
  } = useGameStore(
    useShallow((s) => ({
      activeMenu: s.activeMenu,
      devMode: s.devMode,
      players: s.players,
      activeDialogue: s.activeDialogue,
      setActiveDialogue: s.setActiveDialogue,
      addQuest: s.addQuest,
      setActiveQuests: s.setActiveQuests,
      addMessage: s.addMessage
    }))
  );
  const setActiveMenu = useGameStore(s => s.setActiveMenu);
  const setDevMode = useGameStore(s => s.setDevMode);


  // Spawner data is now loaded from the server via the `spawners_sync` socket event
  // (emitted on join and on explicit get_spawners requests). No Firestore listener needed.

  // DevMode Toggle Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'd') {
        const accountRole = getAccountRole(user?.email);
        const isDev = accountRole === 'dev';

        if (!isDev) {
          logger.warn("auth", "Unauthorized attempt to toggle dev mode");
          return;
        }

        logger.info("system", `Dev mode toggled: ${!devMode}`);
        setDevMode(!devMode);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [devMode, setDevMode]);

  // Handler for chat to intercept commands
  const handleSendMessage = useCallback(async (text: string) => {
    const isCommand = await executeCommand(text);
    if (!isCommand) {
      sendChat(text);
    }
  }, [executeCommand, sendChat]);

  // Keybindings
  useKeybindings({
    enabled: !!user && !!selectedCharacter && !isCreating,
    onEscape: () => {
      stopCombat();
      setShowEscapeMenu(prev => !prev);
    },
    onHotbarUse: (index) => useSlot(index)
  });

  // Auth & Initial Setup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      logger.info("auth", `State changed: ${u ? u.email : 'No user'}`);
      setLoading(true);
      setUser(u);
      initialFetchAttempted.current = false; // Reset on auth change

      if (u) {
        try {
          const idToken = await u.getIdToken(true);
          setToken(idToken);
          const userRef = doc(db, "users", u.uid);
          try {
            await setDoc(userRef, {
              displayName: u.displayName || "Explorer",
              email: u.email || "",
              lastActive: serverTimestamp()
            }, { merge: true });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `users/${u.uid}`);
          }
          setLoading(false);
        } catch (error) {
          logger.error("auth", "Auth error:", error);
          setLoading(false);
        }
      } else {
        setLoading(false);
        setToken(null);
        setSelectedCharacter(null);
      }
    });
    return unsubscribe;
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    if (user && !loading && !charsLoading && characters.length === 0 && !selectedCharacter && !isCreating && !initialFetchAttempted.current) {
      initialFetchAttempted.current = true;
      fetchCharacters();
    }
  }, [user, loading, charsLoading, fetchCharacters, characters.length, selectedCharacter, isCreating]);

  // Listen for Quest Updates from Server
  useEffect(() => {
    if (!socket) return;
    const handleQuestUpdate = (newQuests: any) => {
      setSelectedCharacter(prev => prev ? { ...prev, quests: newQuests } : null);
      useGameStore.getState().setActiveQuests(newQuests);
    };
    socket.on("quest_update", handleQuestUpdate);
    return () => { socket.off("quest_update", handleQuestUpdate); };
  }, [socket]);

  // Listen for Session Start (Full Character Sync)
  useEffect(() => {
    if (!socket) return;
    const handleSessionStart = (confirmedState: any) => {
      setSelectedCharacter(prev => prev ? {
        ...prev,
        inventory: confirmedState.inventory,
        equipment: confirmedState.equipment,
        hp: confirmedState.hp,
        maxHp: confirmedState.maxHp,
        mp: confirmedState.mp,
        maxMp: confirmedState.maxMp,
        stats: confirmedState.stats,
        level: confirmedState.level,
        quests: confirmedState.quests
      } : null);
    };
    socket.on("session_start", handleSessionStart);
    return () => { socket.off("session_start", handleSessionStart); };
  }, [socket]);

  // Listen for Inventory Updates
  useEffect(() => {
    if (!socket) return;
    const handleInventoryUpdate = (data: any) => {
      setSelectedCharacter(prev => prev ? { ...prev, inventory: data.inventory } : null);
    };
    socket.on("inventory_update", handleInventoryUpdate);
    return () => { socket.off("inventory_update", handleInventoryUpdate); };
  }, [socket]);

  // Join Logic
  const lastJoinedRef = useRef<{ charId: string; socketId: string } | null>(null);
  useEffect(() => {
    const socketId = socket?.id;
    if (!user || !selectedCharacter || !connected || !socketId) return;

    // Only join if we haven't joined with this character on this specific socket session yet
    const alreadyJoined = lastJoinedRef.current?.charId === selectedCharacter.id && 
                          lastJoinedRef.current?.socketId === socketId;

    if (!alreadyJoined) {
      logger.info("play", `Joining world as ${selectedCharacter.name} (${selectedCharacter.id}) | Socket: ${socketId}`);
      setIsJoining(true);
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

      // Brief delay to allow state to settle
      setTimeout(() => setIsJoining(false), 800);
    }
  }, [user, selectedCharacter?.id, connected, socket?.id, sendJoin]);

  // Listen for Server-Side Health/Mana Regeneration
  useEffect(() => {
    if (!socket) return;
    const handlePlayerStats = (data: any) => {
      if (data.id === socket.id) {
        setSelectedCharacter(prev => prev ? { ...prev, hp: data.hp, mp: data.mp } : null);
      }
    };
    socket.on("player_stats", handlePlayerStats);
    return () => { socket.off("player_stats", handlePlayerStats); };
  }, [socket]);

  // Listen for Party Updates
  useEffect(() => {
    if (!socket) return;
    const handlePartyUpdate = (data: any) => {
      useGameStore.getState().setParty(data);
    };
    const handlePartyInvite = (data: any) => {
      useGameStore.getState().setPartyInvite(data);
    };
    socket.on("party_update", handlePartyUpdate);
    socket.on("party_invite_received", handlePartyInvite);
    return () => {
      socket.off("party_update", handlePartyUpdate);
      socket.off("party_invite_received", handlePartyInvite);
    };
  }, [socket]);

  if (loading || isJoining) return <LoadingScreen message={isJoining ? "MANIFESTING AVATAR..." : "AWAKENING THE REALM..."} />;

  // Lost connection overlay (soft bypass for now)
  const showDisconnected = !!(selectedCharacter && !connected && !loading);

  return (
    <div className="w-full h-dvh bg-black overflow-hidden relative">
      <DebugOverlay />
      <AnimatePresence mode="wait">
        {showDisconnected ? (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <LoadingScreen message="LOST CONNECTION... WEAVING RECONNECION THREADS" />
          </motion.div>
        ) : !user ? (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <Login onLogin={setUser} />
          </motion.div>
        ) : isCreating ? (
          <motion.div
            key="creation"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full h-full"
          >
            <CharacterCreation
              onComplete={async (data) => {
                const char = await createCharacter(data);
                if (char) {
                  setSelectedCharacter(char);
                  setIsCreating(false);
                }
              }}
              onCancel={() => setIsCreating(false)}
              error={creationError}
              isLoading={creationLoading}
              onClearError={() => setCreationError(null)}
              canCancel={characters.length > 0}
            />
          </motion.div>
        ) : !selectedCharacter ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full h-full"
          >
            <CharacterSelection
              characters={characters}
              onSelect={setSelectedCharacter}
              onNew={() => setIsCreating(true)}
              onDelete={(char) => deleteCharacter(char)}
              onLogout={() => auth.signOut()}
            />
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-full h-full relative"
          >
            <AnimatePresence>
              {activeMenu && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveMenu(null)}
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                  className="fixed inset-0 backdrop-blur-sm z-40"
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showEscapeMenu && (
                <GameMenu
                  onClose={() => setShowEscapeMenu(false)}
                  onSelectCharacter={() => { setSelectedCharacter(null); setShowEscapeMenu(false); }}
                  onLogout={() => auth.signOut()}
                />
              )}
            </AnimatePresence>

            <PlayerHUD character={selectedCharacter} userEmail={user?.email} />

            {devMode && (
              <div className="fixed top-6 right-6 z-40 bg-red-900/80 backdrop-blur-md p-3 rounded-xl border-2 border-red-500 text-white text-[10px] font-mono shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                DEV SESSION ACTIVE
              </div>
            )}

            <Chat onSendMessage={handleSendMessage} />
            <TargetFrame />
            <PartyFrames />
            <NotificationManager />
            <TradeWindow />
            <CastBar />
            <WorldEditor socket={socket} />
            <Hotbar
              slots={selectedCharacter.hotbar || Array(10).fill(null)}
              onSlotAction={(index, data) => {
                const newHotbar = [...(selectedCharacter.hotbar || Array(10).fill(null))];
                newHotbar[index] = data;
                updateHotbar(newHotbar);
              }}
              onClearSlot={(index) => {
                const newHotbar = [...(selectedCharacter.hotbar || Array(10).fill(null))];
                newHotbar[index] = null;
                updateHotbar(newHotbar);
              }}
            />


            <MenuManager 
              selectedCharacter={selectedCharacter}
              socket={socket}
              moveItem={moveItem}
              splitStack={splitStack}
              equipItem={equipItem}
              unequipItem={unequipItem}
            />

            <GameView 
              onMove={sendMove} 
              onAttack={basicAttack} 
              onLoot={(id) => socket?.emit("loot_entity", { targetId: id })}
              playerColor={selectedCharacter.color} 
              socketId={socket?.id || null} 
              socket={socket}
              initialPos={selectedCharacter.pos}
              initialRot={selectedCharacter.rot}
            />

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

