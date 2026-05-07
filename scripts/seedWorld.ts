import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { INITIAL_WORLD_OBJECTS } from "../src/data/world/index";

/**
 * SEEDING SCRIPT
 * Run this to move your hardcoded world objects to Firestore.
 * After this, the server can load world data from the DB.
 */

async function seedWorld() {
  // Initialize admin (assuming local emulator environment variables are set)
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: "chronicles-of-aetheria" // Or your project ID
    });
  }

  const db = getFirestore();
  const worldRef = db.collection("worldObjects");

  console.log(`Starting seed: ${INITIAL_WORLD_OBJECTS.length} objects...`);

  const batchSize = 500;
  for (let i = 0; i < INITIAL_WORLD_OBJECTS.length; i += batchSize) {
    const batch = db.batch();
    const chunk = INITIAL_WORLD_OBJECTS.slice(i, i + batchSize);

    chunk.forEach(obj => {
      const docRef = worldRef.doc(obj.id);
      batch.set(docRef, obj);
    });

    await batch.commit();
    console.log(`Pushed batch ${i / batchSize + 1}`);
  }

  console.log("Seeding complete! You can now update your server to load from Firestore.");
}

// Note: To run this, you'd usually use ts-node or similar.
// For now, this serves as an implementation plan for the user.
// seedWorld();
