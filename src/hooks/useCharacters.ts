import { useState, useCallback, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc, getDoc, setDoc, runTransaction, serverTimestamp, deleteDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Character } from "../types";
import { CHARACTER_CLASSES, SAMPLE_ITEMS } from "../constants";
import { CharacterModel } from "../models/CharacterModel";
import { User } from "firebase/auth";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { logger } from "../lib/logger";
import { getAccountRole } from "../lib/permissions";

import { Socket } from "socket.io-client";

export const useCharacters = (user: User | null, socket: Socket | null) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [creationLoading, setCreationLoading] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  
  // Clear characters when user changes/logs out
  useEffect(() => {
    if (!user) {
      setCharacters([]);
    }
  }, [user]);

  const fetchCharacters = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    logger.info("characters", `Fetching characters for ${user.email}`);
    try {
      let accountRole = getAccountRole(user.email);

      const q = query(
        collection(db, `users/${user.uid}/characters`)
      );
      const snapshot = await getDocs(q);
      const fetched: Character[] = snapshot.docs.map(doc => 
        CharacterModel.fromFirestore(doc.id, doc.data(), accountRole)
      );
      
      // Sort in memory (fallback for missing createdAt)
      fetched.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      
      setCharacters(fetched);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/characters`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createCharacter = useCallback(async (data: { characterName: string; class: string; color: string }) => {
    if (!user || !socket) return null;
    
    setCreationError(null);
    setCreationLoading(true);

    return new Promise<Character | null>((resolve) => {
      // 1. Listen for success
      socket.once("character_created", (newChar: Character) => {
        setCreationLoading(false);
        setCharacters(prev => [newChar, ...prev]);
        resolve(newChar);
      });

      // 2. Listen for errors
      socket.once("error", (err: { message: string }) => {
        setCreationLoading(false);
        setCreationError(err.message);
        resolve(null);
      });

      // 3. Send request
      socket.emit("create_character", data);

      // 4. Timeout safety
      setTimeout(() => {
        socket.off("character_created");
        socket.off("error");
        setCreationLoading(false);
        setCreationError("Server timeout. Please try again.");
        resolve(null);
      }, 10000);
    });
  }, [user, socket]);

  const deleteCharacter = useCallback(async (character: Character) => {
    if (!user) return;
    const lowerName = character.name.toLowerCase().trim();
    const nameRef = doc(db, "characterNames", lowerName);
    const charRef = doc(db, `users/${user.uid}/characters`, character.id);

    logger.info("characters", `Deleting character ${character.name} (${character.id})`);
    try {
      await runTransaction(db, async (transaction) => {
        transaction.delete(nameRef);
        transaction.delete(charRef);
      });
      setCharacters(prev => prev.filter(c => c.id !== character.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/characters/${character.id}`);
    }
  }, [user]);

  return { 
    characters, 
    loading, 
    creationLoading, 
    creationError, 
    fetchCharacters, 
    createCharacter,
    setCreationError,
    setCharacters,
    deleteCharacter
  };
};
