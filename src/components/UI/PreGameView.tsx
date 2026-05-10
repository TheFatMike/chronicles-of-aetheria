/**
 * @file src/components/UI/PreGameView.tsx
 * @description Manages the user interface flow before entering the game world.
 * Coordinates the login, character selection, and character creation screens.
 * @importance Critical: The first point of contact for all users, facilitating account access and character management.
 */
import { motion } from "motion/react";
import { User } from "firebase/auth";
import { Character } from "../../types";
import { Login } from "./Login";
import { CharacterSelection } from "./CharacterSelection";
import { CharacterCreation } from "./CharacterCreation";

interface PreGameViewProps {
  user: User | null;
  setUser: (user: User | null) => void;
  characters: Character[];
  setSelectedCharacter: (char: Character | null) => void;
  isCreating: boolean;
  setIsCreating: (creating: boolean) => void;
  createCharacter: (data: any) => Promise<Character | null>;
  deleteCharacter: (char: Character) => void;
  creationLoading: boolean;
  creationError: string | null;
  setCreationError: (err: string | null) => void;
  onLogout: () => void;
}

export const PreGameView = ({
  user,
  setUser,
  characters,
  setSelectedCharacter,
  isCreating,
  setIsCreating,
  createCharacter,
  deleteCharacter,
  creationLoading,
  creationError,
  setCreationError,
  onLogout
}: PreGameViewProps) => {
  if (!user) {
    return (
      <motion.div
        key="login"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full h-full pointer-events-auto"
      >
        <Login onLogin={setUser} />
      </motion.div>
    );
  }

  if (isCreating) {
    return (
      <motion.div
        key="creation"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full h-full pointer-events-auto"
      >
        <CharacterCreation
          onComplete={async (data) => {
            const char = await createCharacter(data);
            if (char) {
              setSelectedCharacter(char);
              setIsCreating(false);
            }
          }}
          onCancel={() => setIsCreating(false)}
          error={creationError}
          isLoading={creationLoading}
          onClearError={() => setCreationError(null)}
          canCancel={characters.length > 0}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      key="selection"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full h-full pointer-events-auto"
    >
      <CharacterSelection
        characters={characters}
        onSelect={setSelectedCharacter}
        onNew={() => setIsCreating(true)}
        onDelete={deleteCharacter}
        onLogout={onLogout}
      />
    </motion.div>
  );
};
