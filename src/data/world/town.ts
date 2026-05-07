import { WorldObject } from "../../types";

export const TOWN_OBJECTS: WorldObject[] = [
  { id: "tent-1", type: "tent", pos: [-8, 0, -10], rot: [0, 0.5, 0], scale: 1 },
  { id: "tent-2", type: "tent", pos: [9.5, 0, -10], rot: [0, 0.3, 0], scale: 1 },
  { id: "house-3", type: "house", pos: [-12, 0, 0], rot: [0, 1.57, 0], scale: 1 },
  { id: "house-4", type: "house", pos: [10.3, 0, 2.73], rot: [0, 4.06, 0], scale: 0.96 },
  { id: "house-5", type: "house", pos: [2.86, 0, 10.17], rot: [0, 3.36, 0], scale: 1.1 },
  
  // Fences
  { id: "fence-1", type: "fence", pos: [-1.82, 0, -10.84], rot: [0, 4.69, 0], scale: 0.8 },
  { id: "fence-2", type: "fence", pos: [0, 0, -11.1], rot: [0, 3.08, 0], scale: 1.3 },
  { id: "fence-3", type: "fence", pos: [3.43, 0, -8.28], rot: [0, 0.8, 0], scale: 0.88 },
];
