
import { initDb } from "../db";

async function dumpChunk() {
    const db = await initDb();
    const chunkSnap = await db.collection("object_chunks").get();
    
    for (const doc of chunkSnap.docs) {
        const objects = doc.data().objects || {};
        const npcKeys = Object.keys(objects).filter(k => objects[k].type?.includes('npc') || objects[k].type?.includes('instructor') || objects[k].type?.includes('guard'));
        if (npcKeys.length > 0) {
            console.log(`Chunk ${doc.id} contains NPCs:`, npcKeys.map(k => ({ id: k, type: objects[k].type, name: objects[k].name })));
        }
    }

    process.exit(0);
}

dumpChunk();
