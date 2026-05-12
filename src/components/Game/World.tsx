/**
 * @file src/components/Game/World.tsx
 * @description Orchestrates the 3D environment and global scene elements.
 * Manages lighting, skybox, stars, and the collection of players and objects within the scene.
 * @importance Critical: The container component that brings together all elements of the 3D game world.
 */
import { memo } from "react";
import { useGameStore } from "../../store/useGameStore";
import { WorldObjectsRenderer } from "./WorldObjectsRenderer";
import { EntityRenderer } from "./EntityRenderer";
import { EditorCamera } from "./EditorCamera";
import { Terrain } from "./Terrain";
import { BrushPreview } from "./BrushPreview";
import { OtherPlayers } from "./OtherPlayers";
import { SpawnerRenderer } from "./SpawnerRenderer";
import { GlobalEnvironment } from "./Environment/Lighting";
import { DialogueAutoCloser } from "./Environment/DialogueAutoCloser";
import { useWorldInteraction } from "../../hooks/useWorldInteraction";

interface WorldProps {
  onAttack?: () => void;
  onLoot?: (id: string) => void;
  socket: any;
}

export const World = memo(({ onAttack, onLoot, socket }: WorldProps) => {
  const isEditorOpen = useGameStore(state => state.isEditorOpen);
  const { onFloorClick, handlePointerMove, handlePointerOut } = useWorldInteraction(socket);

  return (
    <>
      <GlobalEnvironment />
      <DialogueAutoCloser />

      <group name="collidables_root">
        <Terrain 
          socket={socket} 
          onClick={onFloorClick} 
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
        />
        
        <BrushPreview />
        <WorldObjectsRenderer socket={socket} />
      </group>
      
      <EntityRenderer onAttack={onAttack} onLoot={onLoot} />
      <OtherPlayers />
      <SpawnerRenderer />
      
      {isEditorOpen && <EditorCamera />}
    </>
  );
});

World.displayName = "World";
