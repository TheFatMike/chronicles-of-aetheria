/**
 * @file src/lib/firebase.ts
 * @description Initializes the Firebase Client SDK for the application.
 * Configures authentication services, Firestore database access, and analytics.
 * @importance Critical: The core service provider for all client-side data persistence and security.
 */
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  fetchSignInMethodsForEmail, 
  sendPasswordResetEmail 
} from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

export const checkEmailExists = async (email: string) => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  } catch (error) {
    // If discovery is blocked, we'll just assume false and let the login attempt fail later
    return false;
  }
};

export const resetPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};

export const loginWithEmail = async (email: string, pass: string) => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
};

export const registerWithEmail = async (email: string, pass: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  return result.user;
};


