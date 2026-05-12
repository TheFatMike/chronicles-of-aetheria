import { initDb } from "../db";
import { redis } from "../redis";

async function nuclearNPCReset() {
    const db = await initDb();
    console.log("NUCLEAR NPC RESET: Cleaning Firestore and Redis...");
    
    // 1. Clear Firestore
    const snap = await db.collection("worldObjects").get();
    let fsCount = 0;
    const batch = db.batch();

    snap.docs.forEach((doc: any) => {
        const data = doc.data();
        if (data.type.startsWith('npc_') || data.type.startsWith('spawner_')) {
            batch.delete(doc.ref);
            fsCount++;
        }
    });

    if (fsCount > 0) await batch.commit();
    console.log(` - Firestore: Deleted ${fsCount} NPCs/Spawners.`);

    // 2. Clear Redis (if any were buffered)
    const keys = await redis.keys("world_object:*");
    let redisCount = 0;
    for (const key of keys) {
        // We can't easily check type without fetching, so let's check everything
        const data = await redis.hgetall(key);
        if (data.type && (data.type.startsWith('npc_') || data.type.startsWith('spawner_'))) {
            await redis.del(key);
            redisCount++;
        }
    }
    console.log(` - Redis: Purged ${redisCount} NPCs from cache.`);

    console.log("Reset complete. PLEASE REFRESH YOUR BROWSER to clear local state.");
    await redis.quit();
    process.exit(0);
}

nuclearNPCReset().catch(console.error);
