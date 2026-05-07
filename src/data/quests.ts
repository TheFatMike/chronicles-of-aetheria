import { Quest } from "../types";

export const SAMPLE_QUESTS: Record<string, Quest> = {
  "starter_1": {
    id: "starter_1",
    title: "A Skeletal Nuisance",
    description: "The old graveyard is stirring. Put down some Skeletons to keep the village safe.",
    giverName: "Guard Captain",
    giverId: "guard_captain",
    level: 1,
    status: "available",
    objectives: [
      {
        id: "obj_1",
        type: "kill",
        targetId: "Skeleton",
        targetName: "Skeletons",
        count: 5,
        currentCount: 0,
        completed: false
      }
    ],
    reward: {
      exp: 100,
      gold: 50,
      items: ["iron-sword"]
    }
  },
  "starter_2": {
    id: "starter_2",
    title: "The Slime Menace",
    description: "The fields are covered in sticky slimes! Clean them up before they ruin the harvest.",
    giverName: "Farmer Bob",
    giverId: "farmer_bob",
    level: 1,
    status: "available",
    objectives: [
      {
        id: "obj_1",
        type: "kill",
        targetId: "Slime",
        targetName: "Slimes",
        count: 10,
        currentCount: 0,
        completed: false
      }
    ],
    reward: {
      exp: 150,
      gold: 75
    }
  }
};
