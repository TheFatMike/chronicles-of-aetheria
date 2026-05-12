
import { initDb } from "../db";

async function globalSearch() {
    const db = await initDb();
    const collections = ['world', 'object_chunks', 'spawners'];
    
    for (const colName of collections) {
        console.log(`Checking collection: ${colName}`);
        try {
            const snap = await db.collection(colName).get();
            for (const doc of snap.docs) {
                const data = doc.data();
                const str = JSON.stringify(data).toLowerCase();
                if (str.includes('instructor') || str.includes('captain') || str.includes('kael')) {
                    console.log(`FOUND in ${colName} [${doc.id}]:`, data);
                    // Delete it!
                    await doc.ref.delete();
                    console.log(`DELETED ${doc.id}`);
                }
            }
        } catch(e) {}
    }

    process.exit(0);
}

globalSearch();
