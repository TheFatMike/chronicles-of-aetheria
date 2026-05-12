
import { initDb } from "../db";

async function listCharacters() {
    const db = await initDb();
    const userId = "dOyRDTIoqqf8XZNlee7uVAdmobd2"; // michaeljhoward94@gmail.com
    
    console.log(`Listing characters for user: ${userId}`);
    const charCol = db.collection("users").doc(userId).collection("characters");
    const charSnap = await charCol.get();

    charSnap.docs.forEach((doc: any) => {
        const data = doc.data();
        console.log(` - ID: ${doc.id}, Name: "${data.name}", Class: ${data.class}`);
    });
    process.exit(0);
}

listCharacters();
