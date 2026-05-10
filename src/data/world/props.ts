/**
 * @file src/data/world/props.ts
 * @description Static placements for small environmental props and interactive objects.
 * Includes campfires, dummies, and other decorative world details.
 * @importance Essential: Adds visual density and points of interest to the game environment.
 */
import { WorldObject } from "../../types";

export const PROP_OBJECTS: WorldObject[] = [
  { id: "campfire-1", type: "campfire", pos: [0.44, 0, -0.32], rot: [0, 2.78, 0], scale: 1.15 },
  { id: "dummy-1", type: "dummy", pos: [-3.56, 0, -0.54], rot: [0, 2.04, 0], scale: 0.93 },
  
  // Misc/Edit markers (cleaned up or kept if needed)
  // For now I'll just keep the main ones.
];
