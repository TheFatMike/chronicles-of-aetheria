import { initDb } from "../db";
import admin from "firebase-admin";

async function deepCleanChunks() {
    const db = await initDb();
    console.log("Starting Deep Clean of Object Chunks...");
    
    const snapshot = await db.collection("object_chunks").get();
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        const objects = data.objects || {};
        const updates: any = {};
        let needsUpdate = false;
        
        // 1. Find anything at the top level that looks like an object
        Object.entries(data).forEach(([key, val]: [string, any]) => {
            // If it's a UUID-like key or has a 'type' property and isn't 'objects' or 'data'
            if (key !== 'objects' && key !== 'data' && val && typeof val === 'object' && val.type) {
                console.log(` - FOUND GHOST OBJECT in ${doc.id} (Top Level): ${key}`);
                
                // Move it to the proper 'objects' map
                const cleanId = key.replace(/objects\.`?|`?/g, ""); // Clean up any path-like keys
                objects[cleanId] = { ...val, id: cleanId };
                
                // Mark top-level key for deletion
                updates[key] = admin.firestore.FieldValue.delete();
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            console.log(` -> CONSOLIDATING DOC: ${doc.id}`);
            // 1. Delete the ghost fields first
            await doc.ref.update(updates);
            // 2. Then update the proper objects map
            await doc.ref.update({ objects });
        }
    }
    
    console.log("Deep Clean and Consolidation Complete.");
    process.exit(0);
}

deepCleanChunks().catch(console.error);
