// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- Resilient Initialization ---
// Check if we have minimum required config
const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
const isBuildTime = process.env.NODE_ENV === 'production';

let app;
try {
  if (!isConfigValid && isBuildTime) {
    // During build, if keys are missing, we use a dummy app to prevent crash
    app = getApps().length > 0 ? getApp() : initializeApp({ ...firebaseConfig, apiKey: "BUILD_DUMMY_KEY" });
  } else {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error);
  app = getApps().length > 0 ? getApp() : ({} as any);
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, "asia-southeast1");

export { app, auth, db, storage, functions };
