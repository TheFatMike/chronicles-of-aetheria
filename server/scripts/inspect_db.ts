
import { initDb } from "../db";

async function listCollections() {
    const db = await initDb();
    const collections = await db.listCollections();
    console.log("Collections:", collections.map((c: any) => c.id));
    
    // Check 'world' specifically
    const worldSnap = await db.collection("world").limit(10).get();
    console.log("World Sample:", worldSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    
    // Check 'object_chunks' specifically
    const chunkSnap = await db.collection("object_chunks").limit(2).get();
    console.log("Chunk Sample:", chunkSnap.docs.map((d: any) => ({ id: d.id, count: Object.keys(d.data().objects || {}).length })));

    process.exit(0);
}

listCollections();
