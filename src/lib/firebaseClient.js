import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function parseFirebaseConfig(rawConfig) {
  if (!rawConfig) {
    throw new Error('Missing VITE_FIREBASE_CONFIG environment variable.');
  }

  try {
    return JSON.parse(rawConfig);
  } catch {
    throw new Error('VITE_FIREBASE_CONFIG must be valid JSON.');
  }
}

function getFirebaseApp() {
  const firebaseConfig = parseFirebaseConfig(import.meta.env.VITE_FIREBASE_CONFIG);
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export async function ensureAnonymousUser() {
  const auth = getFirebaseAuth();

  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }

  const result = await signInAnonymously(auth);
  return result.user.uid;
}
