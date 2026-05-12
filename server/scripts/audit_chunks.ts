import { initDb } from "../db";

async function auditChunks() {
    const db = await initDb();
    console.log("Auditing World Object Chunks in Firestore...");
    
    const snap = await db.collection("object_chunks").get();
    console.log(`Found ${snap.size} chunks total.`);
    
    snap.docs.forEach((doc: any) => {
        const data = doc.data();
        const objects = data.objects || data; // Check both legacy and new structure
        
        const count = Object.keys(objects).length;
        console.log(`Chunk: ${doc.id} - ${count} objects`);
        
        Object.entries(objects).forEach(([id, obj]: [string, any]) => {
            if (obj.type?.startsWith('npc_')) {
                console.log(`  NPC FOUND: [${id}] Type: ${obj.type}, Name: "${obj.name}", Role: "${obj.role}", Color: ${obj.color}`);
            }
        });
    });
    
    process.exit(0);
}

auditChunks().catch(console.error);
