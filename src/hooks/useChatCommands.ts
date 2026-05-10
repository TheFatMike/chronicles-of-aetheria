/**
 * @file src/hooks/useChatCommands.ts
 * @description Implements the logic for processing and executing chat-based commands.
 * Handles administrative and debugging shortcuts directly from the chat interface.
 * @importance Essential: Provides a powerful and flexible way for developers and admins to interact with the game state.
 */
import { useCallback } from "react";
import { useGameStore } from "../store/useGameStore";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Character, InventoryItem } from "../types";
import { SAMPLE_ITEMS } from "../constants";
import { getAccountRole, getRoleLevel as getPermissionLevel } from "../lib/permissions";

export const useChatCommands = (
  user: any, 
  character: Character | null, 
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>,
  socket: any
) => {
  const { devMode, setDevMode, requestTeleport, addMessage, setActiveMenu } = useGameStore();

  const getRoleLevel = (role?: string) => {
    // If we passed a role string, use that level
    if (role) return getPermissionLevel(role);
    // Otherwise check the current account email
    return getPermissionLevel(getAccountRole(user?.email));
  };

  const executeCommand = useCallback(async (text: string) => {
    if (!text.startsWith("/")) return false;

    const args = text.slice(1).split(" ");
    const command = args[0].toLowerCase();

    const roleLevel = getRoleLevel(character?.role);
    const isAdmin = roleLevel >= 2;
    const isMod = roleLevel >= 1;
    const isDev = roleLevel >= 3;

    const currentTarget = useGameStore.getState().currentTarget;
    const players = useGameStore.getState().players;

    // Check permissions
    if (command !== "help") {
      if (['tp', 'spawners'].includes(command) && !isMod) return false;
      if (command === 'dev' && !isDev) return false;
      if (['give', 'role', 'promote'].includes(command) && !isAdmin) return false;
      if (!isMod && !isAdmin) return false;
    }

    switch (command) {
      case "dev":
        if (!isDev) return true;
        setDevMode(!devMode);
        return true;

      case "spawners":
        if (!isDev) return true;
        setActiveMenu("spawners");
        return true;

      case "promote": {
        if (!isAdmin) return true;
        
        let targetId = "";
        let targetName = "";

        // Try target first
        if (currentTarget && currentTarget.type === 'player') {
          targetId = currentTarget.id;
          targetName = currentTarget.name;
        } else if (args[1]) {
          // Look up by name
          const pName = args[1].toLowerCase();
          const pEntry = Object.values(players).find(p => p.characterName.toLowerCase() === pName);
          if (pEntry) {
            targetId = pEntry.id;
            targetName = pEntry.characterName;
          }
        }

        if (!targetId) {
          addMessage({
            id: `sys-${Date.now()}`,
            sender: "System",
            text: "No valid target for promotion found.",
            timestamp: Date.now(),
            color: "#ff4444",
          });
          return true;
        }

        const newRole = (args[2] || args[1]) as string;
        const requestedLevel = getRoleLevel(newRole);
        
        // Promotion Rules:
        // Rank 4 (Main Dev) -> can promote to any (up to level 3/dev)
        // Rank 3 (Dev) -> can promote up to Admin (level 2)
        // Rank 2 (Admin) -> can promote up to Mod (level 1)
        
        let canPromote = false;
        if (roleLevel === 4) canPromote = true; // Main dev is all-powerful
        else if (roleLevel === 3 && requestedLevel <= 2) canPromote = true;
        else if (roleLevel === 2 && requestedLevel <= 1) canPromote = true;

        if (canPromote && ['admin', 'mod', 'player', 'dev'].includes(newRole)) {
          socket.emit("change_role", { targetId, role: newRole });
          addMessage({
            id: `sys-${Date.now()}`,
            sender: "System",
            text: `Granted ${newRole} rank to ${targetName}'s account.`,
            timestamp: Date.now(),
            color: "#ffd700",
          });
        } else {
          addMessage({
            id: `sys-err-${Date.now()}`,
            sender: "System",
            text: "You do not have permission to grant that rank.",
            timestamp: Date.now(),
            color: "#ff4444",
          });
        }
        return true;
      }

      case "tp": {
        if (args.length < 4) return true;
        const x = parseFloat(args[1]);
        const y = parseFloat(args[2]);
        const z = parseFloat(args[3]);
        if (isNaN(x) || isNaN(y) || isNaN(z)) return true;
        
        requestTeleport([x, y, z]);
        return true;
      }

      case "give": {
        if (!character || !user) return true;
        const itemName = args.slice(1).join(" ").toLowerCase();
        const item = SAMPLE_ITEMS.find(i => i.name.toLowerCase().includes(itemName));
        
        if (item) {
          const newInventory = [...character.inventory];
          const emptyIdx = newInventory.findIndex(slot => slot === null);
          if (emptyIdx !== -1) {
            newInventory[emptyIdx] = { ...item, id: Math.random().toString(36).substr(2, 9) };
            setCharacter({ ...character, inventory: newInventory });
            
            // Save to Firestore
            const charRef = doc(db, `users/${user.uid}/characters`, character.id);
            updateDoc(charRef, { inventory: newInventory });
          }
        }
        return true;
      }

      case "role": {
        if (!isAdmin) return true;
        const newRole = args[1] as string;
        const requestedLevel = getRoleLevel(newRole);

        // You can only change your own role to something equal or lower than your current rank
        // unless you are the main dev (level 4)
        if (roleLevel === 4 || (roleLevel >= requestedLevel && requestedLevel >= 0)) {
          if (['admin', 'mod', 'player', 'dev'].includes(newRole)) {
            if (character) {
              // The server handles the persistent account update and notifies all clients
              socket.emit("change_role", { targetId: socket.id, role: newRole });
              
              addMessage({
                id: `sys-${Date.now()}`,
                sender: "System",
                text: `Requesting account rank change to ${newRole}...`,
                timestamp: Date.now(),
                color: "#ffd700",
              });
            }
          }
        } else {
          addMessage({
            id: `sys-err-${Date.now()}`,
            sender: "System",
            text: "You cannot self-promote to a higher rank than your current one.",
            timestamp: Date.now(),
            color: "#ff4444",
          });
        }
        return true;
      }

      case "help": {
        const commands = [
          { name: "/help", desc: "List available commands", level: 0 },
          { name: "/dev", desc: "Toggle development mode", level: 3 },
          { name: "/spawners", desc: "Open spawner management tool", level: 3 },
          { name: "/tp [x] [y] [z]", desc: "Teleport to coordinates", level: 1 },
          { name: "/give [itemName]", desc: "Spawn an item into your inventory", level: 2 },
          { name: "/role [admin|mod|player|dev]", desc: "Change your own role", level: 2 },
          { name: "/promote [name] [role]", desc: "Change another player's role", level: 2 },
        ];

        const available = commands.filter(c => roleLevel >= c.level);
        const now = Date.now();
        
        // Add a local system message for each command
        addMessage({
          id: `help-header-${now}`,
          sender: "System",
          text: "--- Available Commands ---",
          timestamp: now,
          color: "#ffd700",
        });

        available.forEach((c, idx) => {
          addMessage({
            id: `help-${c.name.replace(/\//g, '')}-${now}-${idx}`,
            sender: "System",
            text: `${c.name}: ${c.desc}`,
            timestamp: now + idx + 1,
            color: "#e2d1b0",
          });
        });

        return true;
      }

      default:
        return false;
    }
  }, [user, character, setCharacter, devMode, setDevMode, addMessage, requestTeleport, socket]);

  return { executeCommand };
};
