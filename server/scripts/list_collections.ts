import { initDb } from "../db";

async function listCollections() {
    const db = await initDb();
    const cols = await db.listCollections();
    console.log("Collections in DB:");
    cols.forEach((c: any) => console.log(` - ${c.id}`));
    process.exit(0);
}

listCollections().catch(console.error);
