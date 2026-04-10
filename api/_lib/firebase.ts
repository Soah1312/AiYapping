import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore/lite';

const DAILY_TURN_LIMIT = 10;
const devUsageStore = new Map<string, { turnsUsed: number; lastReset: string; updatedAt: string }>();
const devConversationStore = new Map<string, Record<string, unknown>>();

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `local-${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
}

function isPermissionDenied(error: unknown) {
  const message = String((error as { message?: string })?.message || error || '').toLowerCase();
  return message.includes('permission-denied') || message.includes('missing or insufficient permissions');
}

function shouldUseLocalFallback(error: unknown) {
  const notProd = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

  return notProd && isPermissionDenied(error);
}

function getLocalUsage(sessionId: string) {
  const stamp = todayStamp();
  const existing = devUsageStore.get(sessionId);

  if (!existing || existing.lastReset !== stamp) {
    const fresh = { turnsUsed: 0, lastReset: stamp, updatedAt: nowIso() };
    devUsageStore.set(sessionId, fresh);
    return {
      remaining: DAILY_TURN_LIMIT,
      limit: DAILY_TURN_LIMIT,
      turnsUsed: 0,
    };
  }

  return {
    remaining: Math.max(0, DAILY_TURN_LIMIT - existing.turnsUsed),
    limit: DAILY_TURN_LIMIT,
    turnsUsed: existing.turnsUsed,
  };
}

function incrementLocalUsage(sessionId: string) {
  const current = getLocalUsage(sessionId);
  const nextTurnsUsed = current.turnsUsed + 1;

  devUsageStore.set(sessionId, {
    turnsUsed: nextTurnsUsed,
    lastReset: todayStamp(),
    updatedAt: nowIso(),
  });

  return {
    remaining: Math.max(0, DAILY_TURN_LIMIT - nextTurnsUsed),
    limit: DAILY_TURN_LIMIT,
    turnsUsed: nextTurnsUsed,
  };
}

function parseFirebaseConfig() {
  const raw = typeof process !== 'undefined' && process.env ? process.env.VITE_FIREBASE_CONFIG : undefined;
  if (!raw) {
    throw new Error('Missing VITE_FIREBASE_CONFIG environment variable.');
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('VITE_FIREBASE_CONFIG must be valid JSON.');
  }
}

function getDb() {
  const app = getApps().length ? getApp() : initializeApp(parseFirebaseConfig());
  return getFirestore(app);
}

export async function getUsageStatus(sessionId: string) {
  try {
    const db = getDb();
    const usageRef = doc(db, 'usage', sessionId);
    const snapshot = await getDoc(usageRef);
    const stamp = todayStamp();

    if (!snapshot.exists()) {
      await setDoc(usageRef, {
        turnsUsed: 0,
        lastReset: stamp,
        updatedAt: nowIso(),
      });

      return {
        remaining: DAILY_TURN_LIMIT,
        limit: DAILY_TURN_LIMIT,
        turnsUsed: 0,
      };
    }

    const data = snapshot.data() as { turnsUsed?: number; lastReset?: string };
    let turnsUsed = Number(data.turnsUsed || 0);

    if (data.lastReset !== stamp) {
      turnsUsed = 0;
      await updateDoc(usageRef, {
        turnsUsed: 0,
        lastReset: stamp,
        updatedAt: nowIso(),
      });
    }

    return {
      remaining: Math.max(0, DAILY_TURN_LIMIT - turnsUsed),
      limit: DAILY_TURN_LIMIT,
      turnsUsed,
    };
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      return getLocalUsage(sessionId);
    }

    throw error;
  }
}

export async function incrementUsage(sessionId: string) {
  try {
    const db = getDb();
    const usageRef = doc(db, 'usage', sessionId);
    const status = await getUsageStatus(sessionId);
    const nextTurnsUsed = status.turnsUsed + 1;

    await setDoc(
      usageRef,
      {
        turnsUsed: nextTurnsUsed,
        lastReset: todayStamp(),
        updatedAt: nowIso(),
      },
      { merge: true },
    );

    return {
      remaining: Math.max(0, DAILY_TURN_LIMIT - nextTurnsUsed),
      limit: DAILY_TURN_LIMIT,
      turnsUsed: nextTurnsUsed,
    };
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      return incrementLocalUsage(sessionId);
    }

    throw error;
  }
}

type ConversationConfig = {
  model1: string;
  model2: string;
  mode: 'debate' | 'chat';
};

type TranscriptItem = {
  role: string;
  content: string;
  model?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export async function createConversationSkeleton({
  ownerId,
  topic,
  config,
}: {
  ownerId: string;
  topic: string;
  config: ConversationConfig;
}) {
  try {
    const db = getDb();
    const created = await addDoc(collection(db, 'conversations'), {
      shareId: null,
      ownerId,
      topic,
      config,
      transcript: [],
      verdict: null,
      turnCount: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    return created.id;
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      const id = createId();
      devConversationStore.set(id, {
        id,
        shareId: null,
        ownerId,
        topic,
        config,
        transcript: [],
        verdict: null,
        turnCount: 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      return id;
    }

    throw error;
  }
}

export async function saveConversation({
  conversationId,
  ownerId,
  shareId,
  topic,
  config,
  transcript,
  verdict,
}: {
  conversationId?: string | null;
  ownerId: string;
  shareId: string;
  topic: string;
  config: ConversationConfig;
  transcript: TranscriptItem[];
  verdict?: Record<string, unknown> | null;
}) {
  try {
    const db = getDb();
    let resolvedShareId = shareId;

    if (conversationId) {
      const existingRef = doc(db, 'conversations', conversationId);
      const existing = await getDoc(existingRef);
      const existingShareId = existing.exists() ? (existing.data()?.shareId as string | null | undefined) : null;
      if (existingShareId) {
        resolvedShareId = existingShareId;
      }
    }

    const payload = {
      shareId: resolvedShareId,
      ownerId,
      topic,
      config,
      transcript,
      verdict: verdict || null,
      turnCount: transcript.filter((item) => item.role !== 'system').length,
      updatedAt: nowIso(),
    };

    if (conversationId) {
      const conversationRef = doc(db, 'conversations', conversationId);
      await setDoc(conversationRef, payload, { merge: true });
      return conversationId;
    }

    const created = await addDoc(collection(db, 'conversations'), {
      ...payload,
      createdAt: nowIso(),
    });

    return created.id;
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      const id = conversationId || createId();
      const existing = devConversationStore.get(id) || {};
      const resolvedShareId = (existing.shareId as string | null | undefined) || shareId;

      devConversationStore.set(id, {
        ...existing,
        id,
        shareId: resolvedShareId,
        ownerId,
        topic,
        config,
        transcript,
        verdict: verdict || null,
        turnCount: transcript.filter((item) => item.role !== 'system').length,
        createdAt: (existing.createdAt as string | undefined) || nowIso(),
        updatedAt: nowIso(),
      });

      return id;
    }

    throw error;
  }
}

export async function getConversationByShareId(shareId: string) {
  try {
    const db = getDb();
    const q = query(collection(db, 'conversations'), where('shareId', '==', shareId), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const first = snapshot.docs[0];
    return {
      id: first.id,
      ...first.data(),
    };
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      for (const [, value] of devConversationStore.entries()) {
        if (value.shareId === shareId) {
          return value;
        }
      }
      return null;
    }

    throw error;
  }
}
