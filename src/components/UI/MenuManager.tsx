import { AnimatePresence } from "motion/react";
import { useGameStore } from "../../store/useGameStore";
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
    setContextMenu
  } = useGameStore();

  return (
    <AnimatePresence mode="wait">
      {activeMenu === 'map' && <Map localPlayerId={socket?.id || null} />}
      {activeMenu === 'quests' && <QuestLog onClose={() => setActiveMenu(null)} />}

      {activeDialogue && (
        <DialogueBox
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
          onClose={() => setActiveMenu(null)}
          playerPos={players[socket?.id || '']?.pos || [0, 0, 0]}
          socket={socket}
        />
      )}
      {activeMenu === 'inventory' && (
        <Inventory
          items={selectedCharacter.inventory || []}
          gold={selectedCharacter.gold || 0}
          onClose={() => setActiveMenu(null)}
          onMoveItem={moveItem}
          onSplitStack={splitStack}
          onEquip={equipItem}
        />
      )}
      {activeMenu === 'skills' && (
        <SkillBook
          onClose={() => setActiveMenu(null)}
          playerClass={selectedCharacter.class}
          learnedSkills={selectedCharacter.skills || []}
        />
      )}
      {activeMenu === 'menu' && (
        <CharacterInfo
          character={selectedCharacter}
          onClose={() => setActiveMenu(null)}
          onUnequip={unequipItem}
        />
      )}

      {/* Player Context Menu */}
      {contextMenu && (
        <ContextMenu
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
              color: "text-red-400"
            }
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
    </AnimatePresence>
  );
};
