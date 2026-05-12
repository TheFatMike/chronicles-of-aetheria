import { initDb } from "../db";

async function checkWorldObjects() {
    const db = await initDb();
    console.log("Checking World Objects in Firestore...");
    const snap = await db.collection("worldObjects").get();
    
    console.log(`Found ${snap.size} objects total.`);
    
    // Group by type
    const byType: Record<string, number> = {};
    snap.docs.forEach(doc => {
        const data = doc.data();
        byType[data.type] = (byType[data.type] || 0) + 1;
        
        if (data.type.startsWith('npc_')) {
             console.log(` NPC: [${doc.id}] Type: ${data.type}, Name: "${data.name}", Role: "${data.role}", Color: ${data.color}`);
        }
    });
    
    console.log("\nSummary by Type:");
    Object.entries(byType).forEach(([type, count]) => {
        console.log(` - ${type}: ${count}`);
    });
    
    process.exit(0);
}

checkWorldObjects().catch(console.error);
