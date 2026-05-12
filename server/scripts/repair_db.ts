import { initDb } from "../db";
import admin from "firebase-admin";

async function fixDatabaseCorruption() {
    const db = await initDb();
    console.log("Starting Database Structure Repair...");
    
    const collections = ["object_chunks", "terrain_chunks"];
    
    for (const colName of collections) {
        console.log(`Checking collection: ${colName}`);
        const snap = await db.collection(colName).get();
        
        for (const doc of snap.docs) {
            const data = doc.data();
            const updates: any = {};
            let needsRepair = false;
            
            // Look for keys with dots or starting with 'objects.`'
            Object.keys(data).forEach(key => {
                if (key.includes(".") || key.includes("`")) {
                    console.log(` - FOUND CORRUPTED FIELD in ${doc.id}: ${key}`);
                    // Mark the corrupted field for deletion
                    updates[key] = admin.firestore.FieldValue.delete();
                    
                    // Extract the data and place it correctly
                    // For objects.`id` -> move to objects.id
                    if (key.startsWith("objects.`")) {
                        const id = key.replace("objects.`", "").replace("`", "");
                        const worldObj = data[key];
                        updates[`objects.${id}`] = worldObj;
                        needsRepair = true;
                    } else if (key.startsWith("data.`")) {
                        const k = key.replace("data.`", "").replace("`", "");
                        const terrainPoint = data[key];
                        updates[`data.${k}`] = terrainPoint;
                        needsRepair = true;
                    }
                }
            });
            
            if (needsRepair) {
                console.log(` -> REPAIRING DOC: ${doc.id}`);
                await doc.ref.update(updates);
            }
        }
    }
    
    console.log("Database Repair Complete.");
    process.exit(0);
}

fixDatabaseCorruption().catch(console.error);
