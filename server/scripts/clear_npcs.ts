import { initDb } from "../db";

async function clearNPCs() {
    const db = await initDb();
    console.log("Locating all NPCs in the world...");
    
    const snap = await db.collection("worldObjects").get();
    let count = 0;

    const batch = db.batch();

    snap.docs.forEach((doc: any) => {
        const data = doc.data();
        // Delete anything that is an NPC or a Spawner (to be safe for a full reset)
        if (data.type.startsWith('npc_') || data.type.startsWith('spawner_')) {
            console.log(` - Marking for deletion: ${data.type} [${doc.id}]`);
            batch.delete(doc.ref);
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Successfully purged ${count} NPCs/Spawners from the database.`);
    } else {
        console.log("No NPCs found to clear.");
    }

    process.exit(0);
}

clearNPCs().catch(console.error);
