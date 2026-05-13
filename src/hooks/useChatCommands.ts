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
import { Character, InventoryItem } from "@shared/types";
import { useShallow } from "zustand/react/shallow";
import { SAMPLE_ITEMS } from "../constants";
import { getAccountRole, getRoleLevel as getPermissionLevel } from "../lib/permissions";

export const useChatCommands = (
  user: any, 
  socket: any
) => {
  const { 
    localPlayer, 
    updateLocalPlayer,
    devMode, 
    setDevMode, 
    requestTeleport, 
    addMessage, 
    setActiveMenu 
  } = useGameStore(useShallow(s => ({
    localPlayer: s.localPlayer,
    updateLocalPlayer: s.updateLocalPlayer,
    devMode: s.devMode,
    setDevMode: s.setDevMode,
    requestTeleport: s.requestTeleport,
    addMessage: s.addMessage,
    setActiveMenu: s.setActiveMenu
  })));

  const getRoleLevel = (role?: string) => {
    // 1. Check character role (authoritative from server)
    const charLevel = getPermissionLevel(role);
    
    // 2. Fallback to hardcoded account role (mapping in permissions.ts)
    const accountRole = getAccountRole(user?.email);
    const accountLevel = getPermissionLevel(accountRole);

    // Use whichever is higher (prevents lockout if sync is slow)
    return Math.max(charLevel, accountLevel);
  };

  const executeCommand = useCallback(async (text: string) => {
    if (!text.startsWith("/")) return false;

    const args = text.slice(1).split(" ");
    const command = args[0].toLowerCase();

    const roleLevel = getRoleLevel(localPlayer?.role);
    const isAdmin = roleLevel >= 2;
    const isMod = roleLevel >= 1;
    const isDev = roleLevel >= 3;

    const currentTarget = useGameStore.getState().currentTarget;
    const players = useGameStore.getState().players;

    // Check permissions
    if (command !== "help") {
      if (['tp', 'spawners'].includes(command) && !isMod) return false;
      if (command === 'dev' && !isDev) return false;
      if (['give', 'promote', 'demote'].includes(command) && !isAdmin) return false;
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
        let targetEmail = "";
        let targetName = "";

        // 1. Check if first arg is an email
        if (args[1]?.includes("@")) {
          targetEmail = args[1];
          targetName = args[1];
        } 
        // 2. Try current target
        else if (currentTarget && currentTarget.type === 'player') {
          targetId = currentTarget.id;
          targetName = currentTarget.name;
        } 
        // 3. Try lookup by character name
        else if (args[1]) {
          const pName = args[1].toLowerCase();
          const pEntry = Object.values(players).find(p => p.name.toLowerCase() === pName);
          if (pEntry) {
            targetId = pEntry.id;
            targetName = pEntry.name;
          }
        }

        if (!args[1]) {
          addMessage({
            id: `sys-${Date.now()}`,
            sender: "System",
            text: "Usage: /promote [name|email] [role]",
            timestamp: Date.now(),
            color: "#ff4444",
          });
          return true;
        }

        const newRole = (targetEmail ? args[2] : args[2]) as string;
        const action = 'promote';

        if (newRole) {
          const requestedLevel = getPermissionLevel(newRole);
          
          let canPromote = false;
          if (roleLevel === 4) canPromote = true; 
          else if (roleLevel === 3 && requestedLevel <= 2) canPromote = true;
          else if (roleLevel === 2 && requestedLevel <= 1) canPromote = true;

          if (!canPromote) {
            addMessage({
              id: `sys-err-${Date.now()}`,
              sender: "System",
              text: "You do not have permission to grant that rank.",
              timestamp: Date.now(),
              color: "#ff4444",
            });
            return true;
          }

          if (['owner', 'dev', 'admin', 'mod', 'player'].includes(newRole)) {
            socket.emit("promote_player", { targetId, email: targetEmail, role: newRole, action });
            addMessage({
              id: `sys-${Date.now()}`,
              sender: "System",
              text: `Requesting ${newRole.toUpperCase()} rank for ${targetName}...`,
              timestamp: Date.now(),
              color: "#ffd700",
            });
          } else {
            addMessage({
              id: `sys-err-${Date.now()}`,
              sender: "System",
              text: `Invalid role: ${newRole}. Valid: owner, dev, admin, mod, player`,
              timestamp: Date.now(),
              color: "#ff4444",
            });
          }
        } else {
          // No role specified, just increment
          socket.emit("promote_player", { targetId, email: targetEmail, action });
          addMessage({
            id: `sys-${Date.now()}`,
            sender: "System",
            text: `Promoting ${targetName} to the next rank...`,
            timestamp: Date.now(),
            color: "#ffd700",
          });
        }
        return true;
      }

      case "demote": {
        if (!isAdmin) return true;
        
        let targetId = "";
        let targetEmail = "";
        let targetName = "";

        if (args[1]?.includes("@")) {
          targetEmail = args[1];
          targetName = args[1];
        } 
        else if (currentTarget && currentTarget.type === 'player') {
          targetId = currentTarget.id;
          targetName = currentTarget.name;
        } 
        else if (args[1]) {
          const pName = args[1].toLowerCase();
          const pEntry = Object.values(players).find(p => p.name.toLowerCase() === pName);
          if (pEntry) {
            targetId = pEntry.id;
            targetName = pEntry.name;
          }
        }

        if (!args[1] && !targetId) {
          addMessage({
            id: `sys-${Date.now()}`,
            sender: "System",
            text: "Usage: /demote [name|email]",
            timestamp: Date.now(),
            color: "#ff4444",
          });
          return true;
        }

        socket.emit("promote_player", { targetId, email: targetEmail, action: 'demote' });
        addMessage({
          id: `sys-${Date.now()}`,
          sender: "System",
          text: `Demoting ${targetName} to the lower rank...`,
          timestamp: Date.now(),
          color: "#ffd700",
        });
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
        if (!localPlayer || !user) return true;
        const itemName = args.slice(1).join(" ").toLowerCase();
        const item = SAMPLE_ITEMS.find(i => i.name.toLowerCase().includes(itemName));
        
        if (item) {
          const newInventory = [...localPlayer.inventory];
          const emptyIdx = newInventory.findIndex(slot => slot === null);
          if (emptyIdx !== -1) {
            newInventory[emptyIdx] = { ...item, id: Math.random().toString(36).substr(2, 9) };
            updateLocalPlayer({ inventory: newInventory });
            
            // Save to Firestore
            const charRef = doc(db, `users/${user.uid}/characters`, localPlayer.id);
            updateDoc(charRef, { inventory: newInventory });
          }
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
          { name: "/promote [name] [role?]", desc: "Increase rank or set specific role", level: 2 },
          { name: "/demote [name]", desc: "Decrease rank by 1", level: 2 },
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
  }, [user, localPlayer, updateLocalPlayer, devMode, setDevMode, addMessage, requestTeleport, socket]);

  return { executeCommand };
};
