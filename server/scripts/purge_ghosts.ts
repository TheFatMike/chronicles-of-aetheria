import { initDb } from "../db";
import { redis, removeCharacterSessionRedis } from "../redis";

async function purgeGhostCharacters() {
    const db = await initDb();
    console.log("Starting Global Ghost Character Purge...");

    const usersSnap = await db.collection("users").get();
    let totalPurged = 0;

    for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const email = userDoc.data().email;
        console.log(`Checking user: ${email} (${userId})`);

        const charCol = db.collection("users").doc(userId).collection("characters");
        const charSnap = await charCol.get();

        for (const charDoc of charSnap.docs) {
            const charData = charDoc.data();
            const charId = charDoc.id;
            const name = charData.name || "Unknown";

            const isGhost = name === "Unknown" || !name.trim() || name === "null" || name === "undefined";

            if (isGhost) {
                console.log(` - PURGING GHOST: ${name} (${charId})`);
                
                // 1. Delete name reservation if it exists
                if (name && name !== "Unknown") {
                    await db.collection("characterNames").doc(name.toLowerCase().trim()).delete();
                }

                // 2. Delete character doc
                await charDoc.ref.delete();

                // 3. PURGE FROM REDIS (The missing piece!)
                await removeCharacterSessionRedis(charId);
                totalPurged++;
            } else {
                // Check if name reservation is actually pointing to this character
                const nameRef = db.collection("characterNames").doc(name.toLowerCase().trim());
                const nameSnap = await nameRef.get();
                if (!nameSnap.exists) {
                    console.log(` - WARNING: Character ${name} exists but has no name reservation. Creating one...`);
                    await nameRef.set({
                        ownerId: userId,
                        id: name.toLowerCase().trim(),
                        characterId: charId,
                        claimedAt: new Date()
                    });
                }
            }
        }
    }

    // Finally, check characterNames collection for "dead" claims
    console.log("Cleaning up orphaned name claims...");
    const nameSnap = await db.collection("characterNames").get();
    for (const doc of nameSnap.docs) {
        const data = doc.data();
        if (!data.ownerId || !data.characterId) {
            console.log(` - DELETING INVALID CLAIM: ${doc.id}`);
            await doc.ref.delete();
            continue;
        }

        const charRef = db.collection("users").doc(data.ownerId).collection("characters").doc(data.characterId);
        const charSnap = await charRef.get();
        if (!charSnap.exists) {
            console.log(` - DELETING ORPHANED CLAIM: ${doc.id} (points to non-existent char)`);
            await doc.ref.delete();
        }
    }

    // 3. Scan Redis for orphaned sessions
    console.log("Scanning Redis for orphaned sessions...");
    const keys = await redis.keys("player:session:*");
    for (const key of keys) {
        const charId = key.split(":")[2];
        const session = await redis.hgetall(key);
        if (session.userId) {
            const charRef = db.collection("users").doc(session.userId).collection("characters").doc(charId);
            const charSnap = await charRef.get();
            if (!charSnap.exists) {
                console.log(` - PURGING ORPHANED REDIS SESSION: ${key}`);
                await redis.del(key);
            }
        }
    }

    console.log(`Purge complete! Total ghost characters removed: ${totalPurged}`);
    await redis.quit();
    process.exit(0);
}

purgeGhostCharacters();
