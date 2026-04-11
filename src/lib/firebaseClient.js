import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function parseFirebaseConfig(rawConfig) {
  if (!rawConfig) {
    throw new Error('Missing VITE_FIREBASE_CONFIG environment variable.');
  }

  const source = String(rawConfig).trim();
  const candidates = [];

  function pushCandidate(value) {
    if (!value) {
      return;
    }

    const normalized = String(value).trim();
    if (!normalized || candidates.includes(normalized)) {
      return;
    }

    candidates.push(normalized);
  }

  pushCandidate(source);

  // Sometimes users accidentally set env value as the full assignment line.
  if (source.startsWith('VITE_FIREBASE_CONFIG=')) {
    pushCandidate(source.slice('VITE_FIREBASE_CONFIG='.length));
  }

  // If value contains extra text, still try the JSON-looking block.
  const firstBrace = source.indexOf('{');
  const lastBrace = source.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    pushCandidate(source.slice(firstBrace, lastBrace + 1));
  }

  // Accept common dotenv variants where JSON is wrapped/escaped as a string.
  const hasWrappingQuotes =
    (source.startsWith('"') && source.endsWith('"'))
    || (source.startsWith("'") && source.endsWith("'"));

  if (hasWrappingQuotes) {
    const unwrapped = source.slice(1, -1);
    pushCandidate(unwrapped);
    pushCandidate(unwrapped.replace(/\\"/g, '"'));

    const firstInnerBrace = unwrapped.indexOf('{');
    const lastInnerBrace = unwrapped.lastIndexOf('}');
    if (firstInnerBrace !== -1 && lastInnerBrace > firstInnerBrace) {
      pushCandidate(unwrapped.slice(firstInnerBrace, lastInnerBrace + 1));
    }
  }

  // Handle escaped-quote variants even when not wrapped.
  pushCandidate(source.replace(/\\"/g, '"'));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }

      // Support nested JSON string payloads like "{\"apiKey\":...}".
      if (typeof parsed === 'string') {
        const nested = JSON.parse(parsed);
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
          return nested;
        }
      }
    } catch {
      // Try next candidate format.
    }
  }

  // Last-resort recovery: extract required Firebase fields from non-JSON text.
  const mergedSource = candidates.join('\n');
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];
  const optionalKeys = ['measurementId'];
  const recovered = {};

  function extractValue(key) {
    const matcher = new RegExp(`["']?${key}["']?\\s*[:=]\\s*["']?([^"',}\\s]+)`, 'i');
    const match = mergedSource.match(matcher);
    return match ? match[1] : '';
  }

  for (const key of requiredKeys) {
    const value = extractValue(key);
    if (!value) {
      break;
    }
    recovered[key] = value;
  }

  const hasAllRequiredKeys = requiredKeys.every((key) => Boolean(recovered[key]));
  if (hasAllRequiredKeys) {
    for (const key of optionalKeys) {
      const value = extractValue(key);
      if (value) {
        recovered[key] = value;
      }
    }
    return recovered;
  }

  throw new Error('VITE_FIREBASE_CONFIG must be valid JSON.');
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
