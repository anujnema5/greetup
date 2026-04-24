import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// };

const firebaseConfig = {
  apiKey: "AIzaSyBC0HjJUPL1EXpX8gno3x4OdIuiYDN8dT4",
  authDomain: "greetup-1dba5.firebaseapp.com",
  projectId: "greetup-1dba5",
  storageBucket: "greetup-1dba5.firebasestorage.app",
  messagingSenderId: "882587955782",
  appId: "1:882587955782:web:a08c6f94dbaf3b51901047",
  measurementId: "G-TP8PT432JZ"
};

function getOrInitApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error(
      "Firebase client env missing. Set NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, MESSAGING_SENDER_ID, APP_ID.",
    );
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getOrInitApp());
}
