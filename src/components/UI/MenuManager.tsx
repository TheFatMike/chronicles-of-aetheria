/**
 * @file src/components/UI/MenuManager.tsx
 * @description Coordinates the visibility and layering of major UI windows.
 * Ensures that only one primary menu is active at a time or manages their concurrent display.
 * @importance Essential: Simplifies window management and prevents UI clutter by centralizing the menu state.
 */
import { AnimatePresence } from "motion/react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { Map } from "./Map";
import { QuestLog } from "./QuestLog";
import { DialogueBox } from "./DialogueBox";
import { SpawnerManager } from "./SpawnerManager";
import { Inventory } from "./Inventory";
import { SkillBook } from "./SkillBook";
import { CharacterInfo } from "./CharacterInfo";
import { Character, InventoryItem, EquipmentSlots } from "../../types";
import { ContextMenu } from "./ContextMenu";
import { UserPlus, Handshake, MessageSquare, X } from "lucide-react";

interface MenuManagerProps {
  selectedCharacter: Character;
  socket: any;
  moveItem: (from: number, to: number) => void;
  splitStack: (from: number, amount: number) => void;
  equipItem: (inventoryIndex: number) => void;
  unequipItem: (slotId: keyof EquipmentSlots) => void;
}

export const MenuManager = ({
  selectedCharacter,
  socket,
  moveItem,
  splitStack,
  equipItem,
  unequipItem
}: MenuManagerProps) => {
  const { 
    activeMenu, 
    setActiveMenu, 
    activeDialogue, 
    setActiveDialogue,
    activeQuests,
    setActiveQuests,
    addQuest,
    addMessage,
    players,
    contextMenu,
    setContextMenu,
    isInventoryOpen,
    setInventoryOpen,
    isCharacterOpen,
    setCharacterOpen,
    isQuestsOpen,
    setQuestsOpen,
    isSkillsOpen,
    setSkillsOpen
  } = useGameStore(useShallow((s) => ({
    activeMenu: s.activeMenu,
    setActiveMenu: s.setActiveMenu,
    activeDialogue: s.activeDialogue,
    setActiveDialogue: s.setActiveDialogue,
    activeQuests: s.activeQuests,
    setActiveQuests: s.setActiveQuests,
    addQuest: s.addQuest,
    addMessage: s.addMessage,
    players: s.players,
    contextMenu: s.contextMenu,
    setContextMenu: s.setContextMenu,
    isInventoryOpen: s.isInventoryOpen,
    setInventoryOpen: s.setInventoryOpen,
    isCharacterOpen: s.isCharacterOpen,
    setCharacterOpen: s.setCharacterOpen,
    isQuestsOpen: s.isQuestsOpen,
    setQuestsOpen: s.setQuestsOpen,
    isSkillsOpen: s.isSkillsOpen,
    setSkillsOpen: s.setSkillsOpen
  })));

  return (
    <AnimatePresence>
      {activeMenu === 'map' && <Map key="map-window" localPlayerId={socket?.id || null} />}

      {activeDialogue && (
        <DialogueBox
          key="dialogue-box"
          speaker={activeDialogue.speaker}
          text={activeDialogue.text}
          quest={activeDialogue.quest}
          isQuestReady={activeDialogue.quest ? activeQuests[activeDialogue.quest.id]?.objectives.every((o: any) => o.completed) : false}
          onAccept={() => {
            if (activeDialogue.quest && socket) {
              socket.emit("accept_quest", { questId: activeDialogue.quest.id });
            }
            setActiveDialogue(null);
          }}
          onDecline={() => setActiveDialogue(null)}
          onComplete={() => {
            if (activeDialogue.quest && socket) {
              socket.emit("turn_in_quest", { questId: activeDialogue.quest.id });
            }
            setActiveDialogue(null);
          }}
        />
      )}
      {activeMenu === 'spawners' && (players[socket?.id || '']?.role === 'dev' || players[socket?.id || '']?.role === 'admin' || players[socket?.id || '']?.role === 'mod') && (
        <SpawnerManager
          key="spawner-manager"
          onClose={() => setActiveMenu(null)}
          playerPos={players[socket?.id || '']?.pos || [0, 0, 0]}
          socket={socket}
        />
      )}
      {/* Handled independently below */}
      {/* Removed {activeMenu === 'menu' && ...} */}

      {/* Player Context Menu */}
      {contextMenu && (
        <ContextMenu
          key="player-context-menu"
          x={contextMenu.x}
          y={contextMenu.y}
          title={contextMenu.title}
          options={[
            {
              label: "Invite to Party",
              icon: <UserPlus size={14} />,
              onClick: () => {
                if (socket) socket.emit("party_invite", contextMenu.targetId);
              }
            },
            {
              label: "Trade Request",
              icon: <Handshake size={14} />,
              onClick: () => {
                if (socket) socket.emit("trade_request", contextMenu.targetId);
              }
            },
            {
              label: "Whisper",
              icon: <MessageSquare size={14} />,
              onClick: () => {
                // Future implementation
              }
            },
            {
              label: "Cancel",
              icon: <X size={14} />,
              onClick: () => {},
              variant: "danger"
            }
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
      {isInventoryOpen && (
        <Inventory
          key="inventory-window"
          items={selectedCharacter.inventory || []}
          gold={selectedCharacter.gold || 0}
          onClose={() => setInventoryOpen(false)}
          onMoveItem={moveItem}
          onSplitStack={splitStack}
          onEquip={equipItem}
        />
      )}
      {isCharacterOpen && (
        <CharacterInfo
          key="character-window"
          character={selectedCharacter}
          onClose={() => setCharacterOpen(false)}
          onUnequip={unequipItem}
        />
      )}
      {isQuestsOpen && (
        <QuestLog key="quests-window" onClose={() => setQuestsOpen(false)} />
      )}
      {isSkillsOpen && (
        <SkillBook
          key="skills-window"
          onClose={() => setSkillsOpen(false)}
          playerClass={selectedCharacter.class}
          learnedSkills={selectedCharacter.skills || []}
        />
      )}
    </AnimatePresence>
  );
};
