import { initDb } from "../db";
import { redis } from "../redis";

async function nuclearResetWorld() {
    const db = await initDb();
    console.log("!!! WARNING: STARTING NUCLEAR RESET OF WORLD OBJECTS !!!");
    
    // 1. Nuke the modern 'object_chunks' collection
    console.log(" - Wiping 'object_chunks'...");
    const objectChunks = await db.collection("object_chunks").get();
    const chunkBatch = db.batch();
    objectChunks.docs.forEach(doc => chunkBatch.delete(doc.ref));
    await chunkBatch.commit();
    console.log(`   Done. Purged ${objectChunks.size} chunks.`);
    
    // 2. Nuke the legacy 'world' collection
    console.log(" - Wiping legacy 'world' collection...");
    const legacyWorld = await db.collection("world").get();
    const legacyBatch = db.batch();
    legacyWorld.docs.forEach(doc => legacyBatch.delete(doc.ref));
    await legacyBatch.commit();
    console.log(`   Done. Purged ${legacyWorld.size} legacy objects.`);
    
    // 3. Reset the Redis Interest Registry
    try {
        console.log(" - Resetting Redis Interest Registry...");
        await redis.del("world:existing_chunks");
        console.log("   Done.");
    } catch (e) {
        console.log("   Skipping Redis (not connected).");
    }
    
    console.log("!!! NUCLEAR RESET COMPLETE !!!");
    console.log("The world is now empty of all objects. Terrain has been preserved.");
    process.exit(0);
}

nuclearResetWorld().catch(console.error);
