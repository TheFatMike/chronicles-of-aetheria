/**
 * @file server/db.ts
 * @description Initializes the Firebase Admin SDK and exports the Firestore database instance.
 * Handles authentication via service account keys or environment variables.
 * @importance Critical: Provides the foundation for persistent data storage across the entire application.
 */
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseConfig } from "./config";
import { serverLogger } from "./logger";
import { readFileSync } from "fs";
import { join } from "path";

// Initialize Firebase Admin with Service Account Key
export const initDb = async () => {
  try {
    if (admin.apps.length === 0) {
      let serviceAccount;
      
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serverLogger.info("system", "Using FIREBASE_SERVICE_ACCOUNT from Environment Variables.");
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } else {
        const keyPath = join(process.cwd(), "server", "serviceAccountKey.json");
        serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
        serverLogger.info("system", "Using serviceAccountKey.json from disk.");
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId
      });
    }
    
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    return db;
  } catch (error: any) {
    serverLogger.error("system", `Firebase Init Error: ${error.message}`);
    
    // Fallback for environment variables or ADC if key missing
    if (admin.apps.length === 0) admin.initializeApp();
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    return db;
  }
};

export let db: any;
