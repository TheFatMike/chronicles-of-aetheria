/**
 * @file src/data/world/index.ts
 * @description Aggregates all static world object placements.
 * Provides a clean slate for the custom world-building process.
 * @importance Essential: The entry point for loading all environmental objects into the game world.
 */
import { WorldObject } from "../../types";

// INITIAL_WORLD_OBJECTS is now empty, allowing for a 100% custom world built via the editor.
export const INITIAL_WORLD_OBJECTS: WorldObject[] = [];

export * from "./templates";
export * from "./utils";
