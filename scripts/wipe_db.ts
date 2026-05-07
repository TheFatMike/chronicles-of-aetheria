import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";

async function wipeDatabase() {
  console.log("🚀 Starting Cloud Database Wipe...");
  
  const keyPath = join(process.cwd(), "server", "serviceAccountKey.json");
  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  const db = admin.firestore();
  const collections = await db.listCollections();
  
  for (const collection of collections) {
    console.log(`🧹 Wiping collection: ${collection.id}...`);
    const snapshot = await collection.get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  console.log("✅ Cloud Database Wiped. You are now starting from a blank slate!");
  process.exit(0);
}

wipeDatabase().catch(err => {
  console.error("❌ Wipe Failed:", err);
  process.exit(1);
});
