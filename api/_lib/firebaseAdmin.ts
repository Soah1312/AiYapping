import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type AdminServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const ADMIN_APP_NAME = 'aiyapper-admin';

function normalizePrivateKey(value: unknown) {
  return String(value || '').replace(/\\n/g, '\n').trim();
}

function parseJsonObject(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore and continue with other parsing strategies.
  }

  return null;
}

function resolveServiceAccount(): AdminServiceAccount {
  const rawJson = String(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '').trim();
  if (rawJson) {
    const parsed = parseJsonObject(rawJson);
    if (parsed) {
      const projectId = String(parsed.project_id || parsed.projectId || '').trim();
      const clientEmail = String(parsed.client_email || parsed.clientEmail || '').trim();
      const privateKey = normalizePrivateKey(parsed.private_key || parsed.privateKey);

      if (projectId && clientEmail && privateKey) {
        return {
          projectId,
          clientEmail,
          privateKey,
        };
      }
    }
  }

  const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.',
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) {
    return existing;
  }

  const serviceAccount = resolveServiceAccount();
  return initializeApp(
    {
      credential: cert({
        projectId: serviceAccount.projectId,
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey,
      }),
    },
    ADMIN_APP_NAME,
  );
}

function parseIsoMs(value: unknown) {
  if (!value) {
    return 0;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const candidate = value as { toDate?: () => Date };
  if (candidate && typeof candidate.toDate === 'function') {
    const parsed = candidate.toDate().getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeTimestamp(value: unknown) {
  const asMs = parseIsoMs(value);
  if (asMs > 0) {
    return new Date(asMs).toISOString();
  }

  return '';
}

export function hasFirebaseAdminEnv() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
  );
}

export async function getAdminDashboardStatsPrivileged() {
  const db = getFirestore(getAdminApp());

  const cacheDoc = await db.collection('admin').doc('analytics').get();
  const cachedData = cacheDoc.data();
  if (cachedData && Date.now() - parseIsoMs(cachedData.generatedAt) < 1000 * 60 * 10) {
    return cachedData.stats;
  }

  const [usageCountResult, conversationCountResult, usageSnapshot, recentConversationsSnapshot] = await Promise.all([
    db.collection('usage').count().get(),
    db.collection('conversations').count().get(),
    db.collection('usage').get(),
    db.collection('conversations').orderBy('createdAt', 'desc').limit(200).get(),
  ]);

  const usersCount = usageCountResult.data().count;
  const totalVisitsCount = conversationCountResult.data().count;

  const usageRows = usageSnapshot.docs.map((entry) => {
    const data = entry.data() as Record<string, unknown>;
    return {
      userId: entry.id,
      injectionsCount: Number.isFinite(Number(data.injectionsCount)) ? Number(data.injectionsCount) : 0,
      totalApiCalls: Number.isFinite(Number(data.turnsUsed)) ? Number(data.turnsUsed) : 0,
      lastReset: normalizeTimestamp(data.lastReset),
      updatedAt: normalizeTimestamp(data.updatedAt),
    };
  });

  const conversations = recentConversationsSnapshot.docs.map((entry) => {
    const data = entry.data() as Record<string, unknown>;
    const transcript = Array.isArray(data.transcript)
      ? (data.transcript as Array<Record<string, unknown>>)
      : [];

    return {
      id: entry.id,
      ownerId: String(data.ownerId || 'unknown'),
      topic: String(data.topic || '').trim() || 'Untitled chat',
      turnCount: Number.isFinite(Number(data.turnCount)) ? Number(data.turnCount) : 0,
      updatedAt: normalizeTimestamp(data.updatedAt),
      createdAt: normalizeTimestamp(data.createdAt),
      transcript,
    };
  });

  const toNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const percentile = (values: number[], p: number) => {
    if (!values.length) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const rank = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[rank] ?? null;
  };

  const visitByUser = new Map<string, number>();
  for (const chat of conversations) {
    visitByUser.set(chat.ownerId, (visitByUser.get(chat.ownerId) || 0) + 1);
  }

  const perUserVisits = [...visitByUser.entries()]
    .map(([userId, visits]) => ({ userId, visits }))
    .sort((a, b) => b.visits - a.visits || a.userId.localeCompare(b.userId));

  const perUserApiCalls = [...usageRows].sort(
    (a, b) => b.totalApiCalls - a.totalApiCalls || a.userId.localeCompare(b.userId),
  );

  const totalInjections = usageRows.reduce((acc, row) => acc + (row.injectionsCount || 0), 0);

  const perUserInjections = [...usageRows]
    .filter(row => (row.injectionsCount || 0) > 0)
    .map(({ userId, injectionsCount }) => ({ userId, injectionsCount }))
    .sort((a, b) => b.injectionsCount - a.injectionsCount || a.userId.localeCompare(b.userId));

  const recentChats = [...conversations]
    .sort((a, b) => parseIsoMs(b.updatedAt || b.createdAt) - parseIsoMs(a.updatedAt || a.createdAt))
    .slice(0, 25);

  const totalTurns = conversations.reduce((sum, chat) => sum + toNumber(chat.turnCount), 0);
  const avgTurnsPerDuel = conversations.length > 0 ? totalTurns / conversations.length : 0;

  const latencyMs: number[] = [];
  let analyzedForCompletion = 0;
  let completedDuels = 0;
  let interruptedDuels = 0;
  let errorTurns = 0;
  let totalAiTurns = 0;
  const modelTurnMap = new Map<string, { total: number; errors: number }>();

  for (const chat of conversations) {
    const transcript = Array.isArray(chat.transcript) ? chat.transcript : [];
    const aiMessages = transcript.filter((item) => String(item.role || '') === 'assistant');

    if (aiMessages.length === 0) {
      continue;
    }

    totalAiTurns += aiMessages.length;

    let hasStatusSignal = false;
    let hasInterruption = false;

    for (const message of aiMessages) {
      const status = String(message.status || '');
      const model = String(message.model || 'unknown');
      const modelStats = modelTurnMap.get(model) || { total: 0, errors: 0 };
      modelStats.total += 1;

      if (status) {
        hasStatusSignal = true;
      }

      if (status === 'error' || status === 'interrupted') {
        hasInterruption = true;
        errorTurns += 1;
        modelStats.errors += 1;
      }

      modelTurnMap.set(model, modelStats);

      const startedAtMs = parseIsoMs(message.timestamp);
      const finishedAtMs = parseIsoMs(message.finishedAt);
      if (startedAtMs > 0 && finishedAtMs >= startedAtMs) {
        latencyMs.push(finishedAtMs - startedAtMs);
      }
    }

    if (!hasStatusSignal) {
      continue;
    }

    analyzedForCompletion += 1;
    if (hasInterruption) {
      interruptedDuels += 1;
    } else {
      completedDuels += 1;
    }
  }

  const completionRatePct = analyzedForCompletion > 0 ? (completedDuels / analyzedForCompletion) * 100 : null;
  const errorRatePct = totalAiTurns > 0 ? (errorTurns / totalAiTurns) * 100 : null;
  const p50TurnLatencyMs = percentile(latencyMs, 50);
  const p95TurnLatencyMs = percentile(latencyMs, 95);

  const modelErrorRates = [...modelTurnMap.entries()]
    .map(([model, stats]) => ({
      model,
      totalTurns: stats.total,
      errorTurns: stats.errors,
      errorRatePct: stats.total > 0 ? (stats.errors / stats.total) * 100 : 0,
    }))
    .sort((a, b) => b.errorRatePct - a.errorRatePct || b.totalTurns - a.totalTurns || a.model.localeCompare(b.model))
    .slice(0, 10);

  const stats = {
    users: usersCount,
    totalVisits: totalVisitsCount,
    recentChats,
    perUserApiCalls,
    perUserVisits,
    totalInjections,
    perUserInjections,
    avgTurnsPerDuel,
    completionRatePct,
    completedDuels,
    interruptedDuels,
    analyzedDuels: analyzedForCompletion,
    errorRatePct,
    errorTurns,
    totalAiTurns,
    p50TurnLatencyMs,
    p95TurnLatencyMs,
    modelErrorRates,
    generatedAt: nowIso(),
  };

  await db.collection('admin').doc('analytics').set({
    stats,
    generatedAt: nowIso(),
  });

  return stats;
}
