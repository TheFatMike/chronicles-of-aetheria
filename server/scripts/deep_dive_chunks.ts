
import { initDb } from "../db";

async function deepDive() {
    const db = await initDb();
    const chunkSnap = await db.collection("object_chunks").limit(10).get();
    
    for (const doc of chunkSnap.docs) {
        const objects = doc.data().objects || {};
        const types = Object.values(objects).map((o: any) => o.type);
        console.log(`Chunk ${doc.id} types:`, [...new Set(types)]);
    }

    process.exit(0);
}

deepDive();
