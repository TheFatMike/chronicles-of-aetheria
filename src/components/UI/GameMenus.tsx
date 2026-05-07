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

interface GameMenusProps {
  selectedCharacter: Character;
  socket: any;
  moveItem: (from: number, to: number) => void;
  splitStack: (from: number, amount: number) => void;
  equipItem: (inventoryIndex: number) => void;
  unequipItem: (slotId: keyof EquipmentSlots) => void;
}

export const GameMenus = ({
  selectedCharacter,
  socket,
  moveItem,
  splitStack,
  equipItem,
  unequipItem
}: GameMenusProps) => {
  const { 
    activeMenu, 
    setActiveMenu, 
    activeDialogue, 
    setActiveDialogue,
    activeQuests,
    setActiveQuests,
    addQuest,
    addMessage,
    players
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
    </AnimatePresence>
  );
};
