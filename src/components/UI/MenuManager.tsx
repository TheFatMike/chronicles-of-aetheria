import { AnimatePresence } from "motion/react";
import { useEffect } from "react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { GameState } from "../../store/types";
import { Map } from "./Map";
import { QuestLog } from "./QuestLog";
import { DialogueBox } from "./DialogueBox";
import { SpawnerManager } from "./SpawnerManager";
import { Inventory } from "./Inventory";
import { SkillBook } from "./SkillBook";
import { CharacterInfo } from "./CharacterInfo";
import { Character, InventoryItem, EquipmentSlots } from "@shared/types";
import { ContextMenu } from "./ContextMenu";
import { UserPlus, Handshake, MessageSquare, X, ShoppingCart, Landmark, Sword } from "lucide-react";
import { getNPCDialogue } from "@shared/data/npcDialogues";
import { SAMPLE_QUESTS } from "@shared/data/quests";
import { Shop } from "./Shop";
import { SHOPS } from "@shared/data/shops";
import { Bank } from "./Bank";
import { QuestWindow } from "./QuestWindow";
import { PassiveTree } from "./PassiveTree";

import { useInventory } from "../../hooks/useInventory";
import { getDistanceSq2D, getDistance2D } from "@shared/logic/math";
import { getSystemMessageId } from "../../lib/gameUtils";

interface MenuManagerProps {
  socket: any;
}

export const MenuManager = ({
  socket
}: MenuManagerProps) => {
  const { moveItem, splitStack, equipItem, unequipItem } = useInventory(socket);
  const { 
    localPlayer,
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
    isPassiveTreeOpen,
    setPassiveTreeOpen,
    isShopOpen,
    setShopOpen,
    activeShop,
    setActiveShop,
    activeShopNPCId,
    isBankOpen,
    setBankOpen,
    activeBankNPCId,
    setAutoAttackTarget,
    playerId,
    entities,
    showAllNames,
    activeQuestOffer,
    activeQuestNPCId,
    setQuestOffer,
    isTeleportMenuOpen,
    setTeleportMenuOpen,
    activeTeleportCrystalId,
    worldObjects,
    discoveredTeleports
  } = useGameStore(useShallow((s: GameState) => ({
    localPlayer: s.localPlayer,
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
    isPassiveTreeOpen: s.isPassiveTreeOpen,
    setPassiveTreeOpen: s.setPassiveTreeOpen,
    isShopOpen: s.isShopOpen,
    setShopOpen: s.setShopOpen,
    activeShop: s.activeShop,
    setActiveShop: s.setActiveShop,
    activeShopNPCId: s.activeShopNPCId,
    isBankOpen: s.isBankOpen,
    setBankOpen: s.setBankOpen,
    activeBankNPCId: s.activeBankNPCId,
    setAutoAttackTarget: s.setAutoAttackTarget,
    showAllNames: s.showAllNames,
    activeQuestOffer: s.activeQuestOffer,
    activeQuestNPCId: s.activeQuestNPCId,
    setQuestOffer: s.setQuestOffer,
    isTeleportMenuOpen: s.isTeleportMenuOpen,
    setTeleportMenuOpen: s.setTeleportMenuOpen,
    activeTeleportCrystalId: s.activeTeleportCrystalId,
    entities: s.entities,
    worldObjects: s.worldObjects,
    discoveredTeleports: s.discoveredTeleports,
    playerId: s.id
  })));

  // Auto-close logic for distance-based windows
  
  // Consolidated Auto-close logic for distance-based windows
  useEffect(() => {
    if (!localPlayer?.pos) return;

    // 1. Quest Offer
    if (activeQuestOffer && activeQuestNPCId) {
      const npc = entities[activeQuestNPCId];
      if (npc && getDistanceSq2D(localPlayer.pos, npc.pos) > 100) {
        setQuestOffer(null);
      }
    }

    // 2. Bank
    if (isBankOpen && activeBankNPCId) {
      const npc = entities[activeBankNPCId];
      if (npc && getDistanceSq2D(localPlayer.pos, npc.pos) > 64) {
        setBankOpen(false);
        addMessage({
          id: getSystemMessageId('bank-close'),
          sender: "SYSTEM",
          text: "Bank closed: You walked too far away.",
          timestamp: Date.now(),
          color: "#fbbf24"
        });
      }
    }

    // 3. Teleport Menu
    if (isTeleportMenuOpen && activeTeleportCrystalId) {
      const crystal = (worldObjects as any)[activeTeleportCrystalId];
      if (crystal && getDistanceSq2D(localPlayer.pos, crystal.pos) > 225) {
        setTeleportMenuOpen(false);
        addMessage({
          id: getSystemMessageId('teleport-close'),
          sender: "SYSTEM",
          text: "Network link lost: You walked too far away from the crystal.",
          timestamp: Date.now(),
          color: "#fbbf24"
        });
      }
    }

    // 4. Shop
    if (isShopOpen && activeShopNPCId) {
      const npc = entities[activeShopNPCId];
      if (npc && getDistanceSq2D(localPlayer.pos, npc.pos) > 64) {
        setShopOpen(false);
        addMessage({
          id: getSystemMessageId('shop-close'),
          sender: "SYSTEM",
          text: "Shop closed: You walked too far away.",
          timestamp: Date.now(),
          color: "#fbbf24"
        });
      }
    }
  }, [
    localPlayer?.pos, 
    activeQuestOffer, activeQuestNPCId, 
    isBankOpen, activeBankNPCId, 
    isTeleportMenuOpen, activeTeleportCrystalId, 
    isShopOpen, activeShopNPCId, 
    entities, worldObjects, 
    setQuestOffer, setBankOpen, setTeleportMenuOpen, setShopOpen, addMessage
  ]);


  return (
    <AnimatePresence>
      {activeMenu === 'map' && <Map key="map-window" localPlayerId={socket?.id || null} />}

      {activeDialogue && (
        <DialogueBox
          key="dialogue-box"
          speaker={activeDialogue.speaker}
          text={activeDialogue.text}
          options={activeDialogue.options}
          onDecline={() => {
            setActiveDialogue(null);
            setQuestOffer(null);
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
            } else if (option.targetId === 'view_quest_offer' && activeDialogue.quest) {
              setQuestOffer(activeDialogue.quest, activeDialogue.npcId);
              setActiveDialogue(null);
            } else if (option.action === 'quest') {
              if (option.targetId) {
                // Prioritize the active quest instance so progress is shown
                const q = activeQuests[option.targetId] || SAMPLE_QUESTS[option.targetId];
                if (q) {
                  setQuestOffer(q, npcId);
                  setActiveDialogue(null);
                  return;
                }
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
                setShopOpen(true, npcId);
                setActiveDialogue(null);
              }
            } else if (option.action === 'bank') {
              setBankOpen(true, npcId);
              setActiveDialogue(null);
            }
          }}
        />
      )}
      {isShopOpen && activeShop && (
        <Shop
          key="shop-window"
          shop={activeShop}
          playerGold={localPlayer?.gold || 0}
          playerInventory={localPlayer?.inventory || []}
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
          bankItems={localPlayer?.bank || []}
          inventoryItems={localPlayer?.inventory || []}
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
          onMoveInventoryItem={moveItem}
          onDepositAll={() => {
            if (socket) socket.emit("bank_deposit_all");
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
                    const ent = state.entities[contextMenu.targetId] || state.worldObjects[contextMenu.targetId];
                    if (!player || !ent) return;

                    const dist = getDistance2D(player.pos, ent.pos);

                    if (dist > 5) {
                      addMessage({
                        id: getSystemMessageId('npc-dist'),
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
                        text: dialogue.text,
                        options: dialogue.options,
                        quest: dialogue.quest,
                        type: dialogue.type
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
                    const ent = state.entities[contextMenu.targetId] || state.worldObjects[contextMenu.targetId];
                    if (!player || !ent) return;

                    const dist = getDistance2D(player.pos, ent.pos);

                    if (dist > 5) {
                      addMessage({
                        id: getSystemMessageId('shop-dist'),
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
                    const ent = state.entities[contextMenu.targetId] || state.worldObjects[contextMenu.targetId];
                    if (!player || !ent) return;

                    const dist = getDistance2D(player.pos, ent.pos);

                    if (dist > 5) {
                      addMessage({
                        id: getSystemMessageId('bank-dist'),
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
            } else if (contextMenu.targetType === 'teleport_crystal') {
              const isDiscovered = discoveredTeleports.includes(contextMenu.targetId);
              return [
                {
                  label: isDiscovered ? "Teleport" : "Attune",
                  icon: <Landmark size={14} />,
                  onClick: () => {
                    const state = useGameStore.getState();
                    const player = state.players[state.id || ""];
                    const crystal = (state.worldObjects as any)[contextMenu.targetId];
                    if (!player || !crystal) return;

                    const dist = getDistance2D(player.pos, crystal.pos);
                    if (dist > 5) {
                      addMessage({
                        id: getSystemMessageId('teleport-dist'),
                        sender: "SYSTEM",
                        text: `You are too far away to use the crystal.`,
                        timestamp: Date.now(),
                        color: "#ff4444"
                      });
                      return;
                    }

                    const isDiscovered = state.discoveredTeleports.includes(contextMenu.targetId);
                    if (isDiscovered) {
                      state.setTeleportMenuOpen(true, contextMenu.targetId);
                    } else {
                      if (state.castState?.name === "Attuning Crystal") return;
                      state.startCast("Attuning Crystal", 5000);
                      setTimeout(() => {
                        const latestState = useGameStore.getState();
                        if (latestState.castState?.name === "Attuning Crystal") {
                          latestState.discoverTeleport(contextMenu.targetId);
                          latestState.completeCast();
                          latestState.setTeleportMenuOpen(true, contextMenu.targetId);
                          latestState.addMessage({
                            id: "sys-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9),
                            sender: "SYSTEM",
                            text: `Successfully attuned to ${contextMenu.title}!`,
                            timestamp: Date.now(),
                            color: "#22c55e"
                          });
                        }
                      }, 5000);
                    }
                  }
                },
                {
                  label: "Cancel",
                  icon: <X size={14} />,
                  onClick: () => {}
                }
              ];
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
          items={localPlayer?.inventory || []}
          gold={localPlayer?.gold || 0}
          onClose={() => setInventoryOpen(false)}
          onMoveItem={moveItem}
          onSplitStack={splitStack}
          onEquip={equipItem}
        />
      )}
      {isCharacterOpen && (
        <CharacterInfo
          key="character-window"
          character={localPlayer!}
          onClose={() => setCharacterOpen(false)}
          onUnequip={unequipItem}
        />
      )}
      {isQuestsOpen && (
        <QuestLog key="quests-window" onClose={() => setQuestsOpen(false)} socket={socket} />
      )}
      {isSkillsOpen && (
        <SkillBook
          key="skills-window"
          onClose={() => setSkillsOpen(false)}
          playerClass={localPlayer?.class || 'warrior'}
          learnedSkills={localPlayer?.skills || []}
        />
      )}
      {isPassiveTreeOpen && (
        <PassiveTree
          key="passive-tree-window"
          character={localPlayer!}
          onClose={() => setPassiveTreeOpen(false)}
          onAllocate={(nodeId) => {
            if (socket) socket.emit("allocate_passive", { nodeId });
          }}
        />
      )}
      {activeQuestOffer && (
        <QuestWindow
          key="quest-offer-window"
          quest={activeQuestOffer}
          isOffer={!activeQuests[activeQuestOffer.id]}
          isComplete={activeQuests[activeQuestOffer.id]?.objectives.every(o => o.completed)}
          onAccept={() => {
            const isComplete = activeQuests[activeQuestOffer.id]?.objectives.every(o => o.completed);
            if (socket) {
              if (isComplete) {
                socket.emit("turn_in_quest", { questId: activeQuestOffer.id });
              } else {
                socket.emit("accept_quest", { questId: activeQuestOffer.id });
              }
            }
            setQuestOffer(null);
            setActiveDialogue(null);
          }}
          onDecline={() => {
            setQuestOffer(null);
          }}
        />
      )}
    </AnimatePresence>
  );
};
