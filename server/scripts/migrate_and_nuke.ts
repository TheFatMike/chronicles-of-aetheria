import { initDb } from "../db";
import admin from "firebase-admin";

async function migrateAndNukeLegacy() {
    const db = await initDb();
    console.log("Starting Final Migration and Legacy Nuke...");
    
    // 1. Load everything from the legacy 'world' collection
    const legacySnap = await db.collection("world").get();
    console.log(`Found ${legacySnap.size} objects in legacy collection.`);
    
    if (legacySnap.size > 0) {
        const batch = db.batch();
        
        for (const doc of legacySnap.docs) {
            const data = doc.data();
            const id = doc.id;
            
            // Determine chunk
            const pos = data.pos;
            if (pos && Array.isArray(pos)) {
                const chunkX = Math.floor(pos[0] / 100);
                const chunkZ = Math.floor(pos[2] / 100);
                const chunkId = `chunk_${chunkX}_${chunkZ}`;
                
                console.log(` - Migrating ${id} (${data.type}) to ${chunkId}`);
                
                // Move to chunk
                const chunkRef = db.collection("object_chunks").doc(chunkId);
                const update: any = {};
                update[`objects.${id}`] = { id, ...data };
                batch.set(chunkRef, update, { merge: true });
            }
            
            // Mark for deletion from legacy
            batch.delete(doc.ref);
        }
        
        console.log("Committing migration...");
        await batch.commit();
    }
    
    // 2. Final Deep Clean of corrupted keys in chunks
    const chunkSnap = await db.collection("object_chunks").get();
    for (const doc of chunkSnap.docs) {
        const data = doc.data();
        const updates: any = {};
        let needsFix = false;
        
        Object.keys(data).forEach(key => {
            if (key.includes("`") || (key.includes(".") && !key.startsWith("objects.") && !key.startsWith("data."))) {
                console.log(` - NUKING GHOST KEY in ${doc.id}: ${key}`);
                updates[key] = admin.firestore.FieldValue.delete();
                needsFix = true;
            }
        });
        
        if (needsFix) {
            await doc.ref.update(updates);
        }
    }
    
    console.log("MIGRATION AND NUKE COMPLETE. The world is now 100% chunk-based.");
    process.exit(0);
}

migrateAndNukeLegacy().catch(console.error);
