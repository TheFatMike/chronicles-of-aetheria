import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join } from "path";

async function deleteUser(email: string) {
  console.log(`🚀 Attempting to delete user: ${email}...`);
  
  const keyPath = join(process.cwd(), "server", "serviceAccountKey.json");
  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(user.uid);
    console.log(`✅ Successfully deleted account: ${email}. You can now Sign Up fresh!`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log(`ℹ️ No account found for ${email}. It's already fresh!`);
    } else {
      console.error("❌ Error deleting user:", error.message);
    }
  }
  process.exit(0);
}

deleteUser("michaeljhoward94@gmail.com");
