import { WorldObject } from "../../types";
import { SPAWNER_OBJECTS } from "./spawners";
import { NATURE_OBJECTS } from "./nature";
import { TOWN_OBJECTS } from "./town";
import { PROP_OBJECTS } from "./props";

export const INITIAL_WORLD_OBJECTS: WorldObject[] = [
  ...SPAWNER_OBJECTS,
  ...NATURE_OBJECTS,
  ...TOWN_OBJECTS,
  ...PROP_OBJECTS,
];

export * from "./templates";
export * from "./utils";
