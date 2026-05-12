
import { initDb } from "../db";
import { serverLogger } from "../logger";

async function cleanupNpcs() {
    try {
        const db = await initDb();
        console.log("cleanup", "Starting NPC cleanup...");

        // 1. Check 'world' collection (legacy or global objects)
        const worldSnap = await db.collection("world").get();
        let deletedGlobal = 0;
        
        for (const doc of worldSnap.docs) {
            const data = doc.data();
            if (data.type?.startsWith("npc_")) {
                console.log("cleanup", `Deleting global NPC: ${data.name || data.type} (${doc.id})`);
                await doc.ref.delete();
                deletedGlobal++;
            }
        }

        // 2. Check 'object_chunks' collection (optimized spatial chunks)
        const chunkSnap = await db.collection("object_chunks").get();
        let deletedFromChunks = 0;

        for (const doc of chunkSnap.docs) {
            const data = doc.data();
            const objects = data.objects || {};
            let changed = false;

            for (const [id, obj] of Object.entries(objects as any)) {
                if ((obj as any).type?.startsWith("npc_")) {
                    console.log("cleanup", `Removing NPC from chunk ${doc.id}: ${(obj as any).name || (obj as any).type}`);
                    delete objects[id];
                    changed = true;
                    deletedFromChunks++;
                }
            }

            if (changed) {
                await doc.ref.update({ objects });
            }
        }

        console.log("cleanup", `Cleanup complete! Deleted ${deletedGlobal} global NPCs and ${deletedFromChunks} NPCs from chunks.`);
        process.exit(0);
    } catch (e: any) {
        serverLogger.error("cleanup", `Cleanup failed: ${e.message}`);
        process.exit(1);
    }
}

cleanupNpcs();
