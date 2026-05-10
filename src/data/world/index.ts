/**
 * @file src/data/world/index.ts
 * @description Aggregates all static world object placements.
 * Combines nature, town, prop, and spawner data into a single master collection.
 * @importance Essential: The entry point for loading all environmental objects into the game world.
 */
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
