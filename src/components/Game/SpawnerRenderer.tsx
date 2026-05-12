import { memo } from "react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { SpawnerBeacons } from "./SpawnerBeacons";

export const SpawnerRenderer = memo(() => {
  const spawners = useGameStore(useShallow(state => Object.values(state.spawners)));
  const entities = useGameStore(useShallow(state => Object.values(state.entities)));
  const devMode = useGameStore(state => state.devMode);
  const isEditorOpen = useGameStore(state => state.isEditorOpen);

  if (!devMode || !isEditorOpen || spawners.length === 0) return null;

  return <SpawnerBeacons spawners={spawners} entities={entities} />;
});

SpawnerRenderer.displayName = "SpawnerRenderer";
