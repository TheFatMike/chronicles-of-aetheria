import { motion, AnimatePresence } from "motion/react";
import { Character } from "../../types";
import { PlayerHUD } from "./PlayerHUD";
import { Chat } from "./Chat";
import { TargetFrame } from "./TargetFrame";
import { PartyFrames } from "./PartyFrames";
import { NotificationManager } from "./NotificationManager";
import { TradeWindow } from "./TradeWindow";
import { CastBar } from "./CastBar";
import { WorldEditor } from "./WorldEditor";
import { Hotbar } from "./Hotbar";
import { MenuManager } from "./MenuManager";
import { NavigationMenu } from "./NavigationMenu";
import { GameMenu } from "./GameMenu";
import { LootWindow } from "./LootWindow";
import { useGameStore } from "../../store/useGameStore";
import { Socket } from "socket.io-client";

interface InGameViewProps {
  selectedCharacter: Character;
  userEmail?: string | null;
  socket: Socket | null;
  showEscapeMenu: boolean;
  setShowEscapeMenu: (show: boolean) => void;
  onLogout: () => void;
  onSelectCharacter: () => void;
  updateHotbar: (hotbar: any[]) => void;
  moveItem: any;
  splitStack: any;
  equipItem: any;
  unequipItem: any;
  handleSendMessage: (text: string) => void;
}

export const InGameView = ({
  selectedCharacter,
  userEmail,
  socket,
  showEscapeMenu,
  setShowEscapeMenu,
  onLogout,
  onSelectCharacter,
  updateHotbar,
  moveItem,
  splitStack,
  equipItem,
  unequipItem,
  handleSendMessage
}: InGameViewProps) => {
  const activeMenu = useGameStore(s => s.activeMenu);
  const setActiveMenu = useGameStore(s => s.setActiveMenu);
  const devMode = useGameStore(s => s.devMode);

  return (
    <motion.div
      key="game"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="w-full h-full relative pointer-events-none"
    >
      <AnimatePresence>
        {(activeMenu === 'map' || activeMenu === 'spawners') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveMenu(null)}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
            className="fixed inset-0 backdrop-blur-sm z-40 pointer-events-auto"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEscapeMenu && (
          <div className="pointer-events-auto">
            <GameMenu
              onClose={() => setShowEscapeMenu(false)}
              onSelectCharacter={onSelectCharacter}
              onLogout={onLogout}
            />
          </div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto">
        <PlayerHUD character={selectedCharacter} userEmail={userEmail} />

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
        <LootWindow socket={socket} />
        <WorldEditor socket={socket} userEmail={userEmail} />
        
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

        <NavigationMenu />
        <DebugOverlay socket={socket} />
      </div>
    </motion.div>
  );
};
