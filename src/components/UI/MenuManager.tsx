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
import { UserPlus, Handshake, MessageSquare, X, ShoppingCart, Landmark, Sword } from "lucide-react";
import { getNPCDialogue } from "../../data/npcDialogues";
import { SAMPLE_QUESTS } from "../../data/quests";
import { Shop } from "./Shop";
import { SHOPS } from "../../data/shops";
import { Bank } from "./Bank";

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
    setSkillsOpen,
    isShopOpen,
    setShopOpen,
    activeShop,
    setActiveShop,
    isBankOpen,
    setBankOpen,
    setAutoAttackTarget
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
    setSkillsOpen: s.setSkillsOpen,
    isShopOpen: s.isShopOpen,
    setShopOpen: s.setShopOpen,
    activeShop: s.activeShop,
    setActiveShop: s.setActiveShop,
    isBankOpen: s.isBankOpen,
    setBankOpen: s.setBankOpen,
    setAutoAttackTarget: s.setAutoAttackTarget
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
          options={activeDialogue.options}
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
          onOptionSelect={(option) => {
            if (option.action === 'close') {
              setActiveDialogue(null);
              return;
            }

            const { npcId, npcType, speaker: speakerName } = activeDialogue;

            if (option.action === 'dialogue') {
              const nextDialogue = getNPCDialogue(npcId, npcType, speakerName, {
                activeQuests: activeQuests,
                quests: SAMPLE_QUESTS
              }, option.targetId);

              setActiveDialogue({
                speaker: speakerName,
                npcId,
                npcType,
                ...nextDialogue
              });
            } else if (option.action === 'quest') {
              if (option.targetId && SAMPLE_QUESTS[option.targetId]) {
                const q = SAMPLE_QUESTS[option.targetId];
                setActiveDialogue({
                  speaker: speakerName,
                  npcId,
                  npcType,
                  text: q.description,
                  quest: q
                });
                return;
              }

              // Force search for quests by temporarily ignoring the dialogue tree
              const questDialogue = getNPCDialogue(npcId, npcType, speakerName, {
                activeQuests: activeQuests,
                quests: SAMPLE_QUESTS
              });

              // If it returned a dialogue node (the root again), we need to manually find the quest
              if (questDialogue.type === 'dialogue') {
                const npcQuests = Object.values(SAMPLE_QUESTS).filter((q: any) => 
                  q.giverId === npcId || q.giverId === npcType || q.giverName === speakerName
                );
                const availableQuest = npcQuests.find((q: any) => {
                  const pq = activeQuests[q.id];
                  if (pq) return false;
                  if (q.prerequisiteQuestId) {
                    const prereq = activeQuests[q.prerequisiteQuestId];
                    return prereq && prereq.status === 'completed';
                  }
                  return true;
                });

                if (availableQuest) {
                  setActiveDialogue({
                    speaker: speakerName,
                    npcId,
                    npcType,
                    text: availableQuest.description,
                    quest: availableQuest
                  });
                } else {
                   setActiveDialogue({
                    speaker: speakerName,
                    npcId,
                    npcType,
                    text: "I don't have any tasks for you right now."
                  });
                }
              } else {
                setActiveDialogue({
                  speaker: speakerName,
                  npcId,
                  npcType,
                  ...questDialogue
                });
              }
            } else if (option.action === 'shop') {
              if (option.targetId && SHOPS[option.targetId]) {
                setActiveShop(SHOPS[option.targetId]);
                setShopOpen(true);
                setActiveDialogue(null);
              }
            } else if (option.action === 'bank') {
              setBankOpen(true);
              setInventoryOpen(true);
              setActiveDialogue(null);
            }
          }}
        />
      )}
      {isShopOpen && activeShop && (
        <Shop
          key="shop-window"
          shop={activeShop}
          playerGold={selectedCharacter.gold || 0}
          playerInventory={selectedCharacter.inventory || []}
          onClose={() => setShopOpen(false)}
          onBuy={(itemId, price) => {
            if (socket) {
              socket.emit("buy_item", { itemId, price, shopId: activeShop.id });
            }
          }}
          onSell={(inventoryIndex) => {
            if (socket) {
              socket.emit("sell_item", { inventoryIndex, shopId: activeShop.id });
            }
          }}
        />
      )}
      {isBankOpen && (
        <Bank
          key="bank-window"
          bankItems={selectedCharacter.bank || []}
          inventoryItems={selectedCharacter.inventory || []}
          onClose={() => {
            setBankOpen(false);
          }}
          onDeposit={(invIdx, bankIdx, amount, all) => {
            if (socket) socket.emit("bank_deposit", { 
              inventoryIndex: invIdx, 
              bankIndex: bankIdx === -1 ? undefined : bankIdx,
              amount: amount,
              all: all
            });
          }}
          onWithdraw={(bankIdx, invIdx, amount, all) => {
            if (socket) socket.emit("bank_withdraw", { 
              bankIndex: bankIdx, 
              inventoryIndex: invIdx === -1 ? undefined : invIdx,
              amount: amount,
              all: all
            });
          }}
          onMoveBankItem={(from, to) => {
            if (socket) socket.emit("bank_move", { fromIndex: from, toIndex: to });
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

      {/* Dynamic Context Menu */}
      {contextMenu && (
        <ContextMenu
          key="dynamic-context-menu"
          x={contextMenu.x}
          y={contextMenu.y}
          title={contextMenu.title}
          options={(() => {
            if (contextMenu.targetType === 'player') {
              return [
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
                  label: "Cancel",
                  icon: <X size={14} />,
                  onClick: () => {}
                }
              ];
            } else if (contextMenu.targetType === 'npc') {
              const options = [
                {
                  label: "Talk",
                  icon: <MessageSquare size={14} />,
                  onClick: () => {
                    // Check distance
                    const state = useGameStore.getState();
                    const player = state.players[state.id || ""];
                    const ent = state.entities[contextMenu.targetId];
                    if (!player || !ent) return;

                    const dx = player.pos[0] - ent.pos[0];
                    const dz = player.pos[2] - ent.pos[2];
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    if (dist > 5) {
                      addMessage({
                        id: "sys-" + Date.now(),
                        sender: "SYSTEM",
                        text: `You are too far away to talk to ${contextMenu.title}.`,
                        timestamp: Date.now(),
                        color: "#ff4444"
                      });
                      return;
                    }

                    const dialogue = getNPCDialogue(contextMenu.targetId, contextMenu.targetRole || 'npc', contextMenu.title, {
                      activeQuests: activeQuests,
                      quests: SAMPLE_QUESTS
                    });
                    if (dialogue) {
                      setActiveDialogue({
                        speaker: contextMenu.title,
                        npcId: contextMenu.targetId,
                        npcType: contextMenu.targetRole || 'npc',
                        ...dialogue
                      });
                    }
                  }
                }
              ];

              const role = contextMenu.targetRole?.toLowerCase() || '';
              const id = contextMenu.targetId.toLowerCase();

              // Shop options
              if (role.includes('merchant') || role.includes('blacksmith') || id.includes('merchant') || id.includes('blacksmith')) {
                options.push({
                  label: "Shop",
                  icon: <ShoppingCart size={14} />,
                  onClick: () => {
                    // Check distance
                    const state = useGameStore.getState();
                    const player = state.players[state.id || ""];
                    const ent = state.entities[contextMenu.targetId];
                    if (!player || !ent) return;

                    const dx = player.pos[0] - ent.pos[0];
                    const dz = player.pos[2] - ent.pos[2];
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    if (dist > 5) {
                      addMessage({
                        id: "sys-" + Date.now(),
                        sender: "SYSTEM",
                        text: `You are too far away to shop with ${contextMenu.title}.`,
                        timestamp: Date.now(),
                        color: "#ff4444"
                      });
                      return;
                    }

                    const shopId = id.includes('blacksmith') ? 'blacksmith_basic' : 'general_merchant';
                    const shop = SHOPS[shopId];
                    if (shop) {
                      setActiveShop(shop);
                      setShopOpen(true, contextMenu.targetId);
                    }
                  }
                });
              }

              // Bank options
              if (role.includes('banker') || id.includes('banker')) {
                options.push({
                  label: "Bank",
                  icon: <Landmark size={14} />,
                  onClick: () => {
                    // Check distance
                    const state = useGameStore.getState();
                    const player = state.players[state.id || ""];
                    const ent = state.entities[contextMenu.targetId];
                    if (!player || !ent) return;

                    const dx = player.pos[0] - ent.pos[0];
                    const dz = player.pos[2] - ent.pos[2];
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    if (dist > 5) {
                      addMessage({
                        id: "sys-" + Date.now(),
                        sender: "SYSTEM",
                        text: `You are too far away to access the bank.`,
                        timestamp: Date.now(),
                        color: "#ff4444"
                      });
                      return;
                    }

                    setBankOpen(true, contextMenu.targetId);
                  }
                });
              }

              options.push({
                label: "Cancel",
                icon: <X size={14} />,
                onClick: () => {}
              });

              return options;
            } else if (contextMenu.targetType === 'enemy') {
              return [
                {
                  label: "Attack",
                  icon: <Sword size={14} />,
                  onClick: () => {
                    setAutoAttackTarget(contextMenu.targetId);
                  }
                },
                {
                  label: "Cancel",
                  icon: <X size={14} />,
                  onClick: () => {}
                }
              ];
            }
            return [];
          })()}
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
