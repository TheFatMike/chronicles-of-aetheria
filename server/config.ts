import fs from "fs";
import path from "path";

const getFirebaseConfig = () => {
  const possiblePaths = [
    path.join(process.cwd(), "firebase-applet-config.json"),
    path.join(process.cwd(), "..", "firebase-applet-config.json"),
    "/workspace/firebase-applet-config.json"
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    }
  }
  throw new Error("Could not find firebase-applet-config.json");
};

export const firebaseConfig = getFirebaseConfig();
export const hostProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
