
import { initDb } from "../db";
import { worldObjects, entities } from "../state";
import { initializeWorld } from "../systems/persistence";

async function verify() {
    await initDb();
    await initializeWorld();
    console.log(`Global Objects: ${worldObjects.size}`);
    console.log(`Entities: ${entities.size}`);
    for (const [id, ent] of entities.entries()) {
        console.log(` - Entity: ${ent.name} (${ent.type})`);
    }
    process.exit(0);
}

verify();
