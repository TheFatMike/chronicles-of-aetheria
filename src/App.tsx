/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Character } from "./types";
import { useSocket } from "./hooks/useSocket";
import { useGameStore } from "./store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { LoadingScreen } from "./components/UI/LoadingScreen";
import { DebugOverlay } from "./components/UI/DebugOverlay";
import { useCharacters } from "./hooks/useCharacters";
import { useInventory } from "./hooks/useInventory";
import { useKeybindings } from "./hooks/useKeybindings";
import { useChatCommands } from "./hooks/useChatCommands";
import { motion, AnimatePresence } from "motion/react";
import { logger } from "./lib/logger";
import { getAccountRole } from "./lib/permissions";
import { handleFirestoreError, OperationType } from "./lib/firestoreErrorHandler";
import { useCombat } from "./hooks/useCombat";
import { GameScaffold } from "./components/UI/GameScaffold";
import { PreGameView } from "./components/UI/PreGameView";
import { InGameView } from "./components/UI/InGameView";
import { useGameSync } from "./hooks/useGameSync";
import { useGameJoin } from "./hooks/useGameJoin";
import { GameView } from "./components/Game/GameView";
import { AssetPreloader } from "./components/Game/AssetPreloader";

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
  }, [user, devMode, setDevMode]);

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
      initialFetchAttempted.current = false;

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

  // Game State & Connection Hooks
  useGameSync({ socket, selectedCharacter, setSelectedCharacter, connected });
  useGameJoin({ user, selectedCharacter, connected, socket, sendJoin, requestWorldSync, setIsJoining });

  if (loading) return <LoadingScreen message="AWAKENING THE REALM..." />;
  const showDisconnected = !!(selectedCharacter && !connected && !loading);

  return (
    <div className="w-full h-dvh overflow-hidden relative">
      <AssetPreloader />
      
      <AnimatePresence>
        {(isJoining || showDisconnected) && (
          <motion.div
            key="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-200"
          >
            <LoadingScreen 
              message={
                showDisconnected 
                  ? "LOST CONNECTION... REWEAVING THREADS" 
                  : !connected 
                    ? "AWAKENING THE REALM (Waking Server)..." 
                    : "MANIFESTING WORLD... WEAVING DATA"
              } 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!selectedCharacter && (
        <div id="pre-game-bg-container" className="fixed inset-0 bg-[#0d0907] -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-20" />
          <div className="absolute inset-0 bg-linear-to-b from-[#1a1410] via-transparent to-[#0d0907] opacity-80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,52,32,0.15)_0%,transparent_70%)]" />
        </div>
      )}

      {selectedCharacter && (
        <div className={`absolute inset-0 z-0 ${!connected ? "opacity-50 grayscale pointer-events-none" : ""}`}>
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
        </div>
      )}

      <GameScaffold>
        <DebugOverlay socket={socket} />
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
          ) : !selectedCharacter ? (
            <PreGameView 
              user={user}
              setUser={setUser}
              characters={characters}
              setSelectedCharacter={setSelectedCharacter}
              isCreating={isCreating}
              setIsCreating={setIsCreating}
              createCharacter={createCharacter}
              deleteCharacter={deleteCharacter}
              creationLoading={creationLoading}
              creationError={creationError}
              setCreationError={setCreationError}
              onLogout={() => auth.signOut()}
            />
          ) : (
            <InGameView 
              selectedCharacter={selectedCharacter}
              userEmail={user?.email}
              socket={socket as any}
              showEscapeMenu={showEscapeMenu}
              setShowEscapeMenu={setShowEscapeMenu}
              onLogout={() => auth.signOut()}
              onSelectCharacter={() => { setSelectedCharacter(null); setShowEscapeMenu(false); }}
              updateHotbar={updateHotbar}
              moveItem={moveItem}
              splitStack={splitStack}
              equipItem={equipItem}
              unequipItem={unequipItem}
              handleSendMessage={handleSendMessage}
            />
          )}
        </AnimatePresence>
      </GameScaffold>
    </div>
  );
}
