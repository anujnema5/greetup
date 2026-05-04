import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * These must be present when `next build` runs — Next inlines `NEXT_PUBLIC_*` into the
 * browser bundle. Adding them only to the container/host “runtime” env after build
 * will not update the client; trigger a new deploy/build with the vars set.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const REQUIRED_ENV_HINT =
  "Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID " +
  "(and MESSAGING_SENDER_ID, APP_ID). They must be available at build time, then redeploy.";

function getOrInitApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error(`Firebase client env missing. ${REQUIRED_ENV_HINT}`);
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getOrInitApp());
}
