import { initDb } from "../db";

async function inspectChunkZero() {
    const db = await initDb();
    console.log("Inspecting chunk_0_0 raw data...");
    
    const doc = await db.collection("object_chunks").doc("chunk_0_0").get();
    if (!doc.exists) {
        console.log("Chunk chunk_0_0 does not exist.");
    } else {
        console.log(JSON.stringify(doc.data(), null, 2));
    }
    
    process.exit(0);
}

inspectChunkZero().catch(console.error);
