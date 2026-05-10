/**
 * @file server/scripts/sync_db.ts
 * @description Manual synchronization script to push authoritative Firestore data into the Redis cache.
 */
import { initializeTerrain } from "../systems/persistence";
import { initDb } from "../db";
import { serverLogger } from "../logger";

async function sync() {
    try {
        serverLogger.info("sync", "Starting manual Database Sync...");
        await initDb();
        
        // This will load from Firestore and cache to Redis since Redis is empty
        await initializeTerrain();
        
        serverLogger.info("sync", "Manual Sync Complete.");
        process.exit(0);
    } catch (e: any) {
        serverLogger.error("sync", `Sync failed: ${e.message}`);
        process.exit(1);
    }
}

sync();
