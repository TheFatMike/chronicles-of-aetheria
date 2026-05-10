/**
 * @file src/data/world/spawners.ts
 * @description Initial configuration and placement of entity spawners across the map.
 * Defines where enemies and NPCs should be instantiated in the game world.
 * @importance Essential: The primary source for populating the world with dynamic entities.
 */
import { WorldObject } from "../../types";

export const SPAWNER_OBJECTS: WorldObject[] = [
  {
    "id": "spawner-demo-slime",
    "type": "spawner_slime",
    "pos": [0, 0, 30],
    "rot": [0, 0, 0],
    "scale": 1
  },
  {
    "id": "spawner-demo-wolf",
    "type": "spawner_wolf",
    "pos": [-25, 0, 25],
    "rot": [0, 0, 0],
    "scale": 1
  }
];
