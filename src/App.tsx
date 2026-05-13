/**
 * @file src/App.tsx
 * @description The central React component and root of the application logic.
 * Manages user authentication, socket lifecycle, and top-level navigation between menus and the game world.
 * @importance Critical: Coordinates all client-side systems and provides the primary user interface structure.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Character } from "@shared/types";
import { useSocket } from "./hooks/useSocket";
import { useGameStore } from "./store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { LoadingScreen } from "./components/UI/LoadingScreen";
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
  const [isCreating, setIsCreating] = useState(false);
  const [showEscapeMenu, setShowEscapeMenu] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const initialFetchAttempted = useRef(false);

  // Zustand Store Selectors
  const { 
    localPlayer, 
    setLocalPlayer, 
    activeMenu, 
    devMode, 
    setActiveMenu, 
    setDevMode 
  } = useGameStore(
    useShallow((s) => ({
      localPlayer: s.localPlayer,
      setLocalPlayer: s.setLocalPlayer,
      activeMenu: s.activeMenu,
      devMode: s.devMode,
      setActiveMenu: s.setActiveMenu,
      setDevMode: s.setDevMode
    }))
  );

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

  const { moveItem, splitStack, updateHotbar, equipItem, unequipItem } = useInventory(socket);
  const { executeCommand } = useChatCommands(user, socket);
  const { useSlot, basicAttack, stopCombat } = useCombat(socket);

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
    enabled: !!user && !!localPlayer && !isCreating,
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
        setLocalPlayer(null);
      }
    });
    return unsubscribe;
  }, [setLocalPlayer]);

  // Initial Data Fetch
  useEffect(() => {
    if (user && !loading && !charsLoading && characters.length === 0 && !localPlayer && !isCreating && !initialFetchAttempted.current) {
      initialFetchAttempted.current = true;
      fetchCharacters();
    }
  }, [user, loading, charsLoading, fetchCharacters, characters.length, localPlayer, isCreating]);

  // Game State & Connection Hooks
  useGameSync({ socket, connected });
  useGameJoin({ user, connected, socket, sendJoin, requestWorldSync, setIsJoining });

  if (loading) return <LoadingScreen message="AWAKENING THE REALM..." />;
  const showDisconnected = !!(localPlayer && !connected && !loading);

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
            <LoadingStatusWrapper showDisconnected={showDisconnected} connected={connected} />
          </motion.div>
        )}
      </AnimatePresence>

      {!localPlayer && (
        <div id="pre-game-bg-container" className="fixed inset-0 bg-[#0d0907] -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-20" />
          <div className="absolute inset-0 bg-linear-to-b from-[#1a1410] via-transparent to-[#0d0907] opacity-80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,52,32,0.15)_0%,transparent_70%)]" />
        </div>
      )}

      {localPlayer && (
        <div className={`absolute inset-0 z-0 ${!connected ? "opacity-50 grayscale pointer-events-none" : ""}`}>
          <GameView 
            onMove={sendMove} 
            onAttack={basicAttack} 
            onLoot={(id) => socket?.emit("loot_entity", { targetId: id })}
            playerColor={localPlayer.color} 
            socketId={socket?.id || null} 
            socket={socket}
            initialPos={localPlayer.pos}
            initialRot={localPlayer.rot}
          />
        </div>
      )}

      <GameScaffold>
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
          ) : !localPlayer ? (
            <PreGameView 
              user={user}
              setUser={setUser}
              characters={characters}
              setSelectedCharacter={setLocalPlayer}
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
              userEmail={user?.email}
              socket={socket as any}
              showEscapeMenu={showEscapeMenu}
              setShowEscapeMenu={setShowEscapeMenu}
              onLogout={() => auth.signOut()}
              onSelectCharacter={() => { setLocalPlayer(null); setShowEscapeMenu(false); }}
              handleSendMessage={handleSendMessage}
            />
          )}
        </AnimatePresence>
      </GameScaffold>
    </div>
  );
}

const LoadingStatusWrapper = ({ showDisconnected, connected }: { showDisconnected: boolean, connected: boolean }) => {
  const worldReady = useGameStore(s => s.worldReady);
  const assetsReady = useGameStore(s => s.assetsReady);
  
  return (
    <LoadingScreen 
      message={
        showDisconnected 
          ? "LOST CONNECTION... REWEAVING THREADS" 
          : !connected 
            ? "AWAKENING THE REALM (Waking Server)..." 
            : !worldReady 
              ? "MANIFESTING WORLD... WEAVING DATA"
              : !assetsReady
                ? "FORGING REALM... MANIFESTING MODELS"
                : "MANIFESTING WORLD... WEAVING DATA"
      } 
    />
  );
};
