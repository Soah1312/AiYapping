import { getAdminDashboardStats } from './_lib/firebase.js';
import { getAdminDashboardStatsPrivileged, hasFirebaseAdminEnv } from './_lib/firebaseAdmin.js';

export const config = {
  runtime: 'nodejs',
};

type AdminRequestBody = {
  password?: string;
};

function normalizePassword(value: unknown) {
  return String(value || '').trim();
}

function resolveExpectedPassword() {
  return normalizePassword(process.env.MEOW_PASSWORD || process.env.ADMIN_MEOW_PASSWORD || '');
}

function sendJson(request: any, response: any, payload: Record<string, unknown>, status: number) {
  if (response && typeof response.status === 'function' && typeof response.json === 'function') {
    response.status(status).json(payload);
    return;
  }

  return Response.json(payload, { status });
}

async function parseRequestBody(request: any): Promise<AdminRequestBody> {
  if (request && typeof request.json === 'function') {
    return (await request.json()) as AdminRequestBody;
  }

  if (request && typeof request.body === 'object' && request.body !== null) {
    return request.body as AdminRequestBody;
  }

  if (request && typeof request.body === 'string') {
    try {
      return JSON.parse(request.body) as AdminRequestBody;
    } catch {
      return {};
    }
  }

  if (request && typeof request.on === 'function') {
    const raw = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      });
      request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      request.on('error', (error: unknown) => reject(error));
    });

    if (!raw.trim()) {
      return {};
    }

    try {
      return JSON.parse(raw) as AdminRequestBody;
    } catch {
      return {};
    }
  }

  return {};
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Admin stats request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export default async function handler(request: any, response?: any): Promise<Response | void> {
  if (request.method !== 'POST') {
    return sendJson(request, response, { error: 'Method not allowed' }, 405);
  }

  try {
    const body = await parseRequestBody(request);
    const providedPassword = normalizePassword(body?.password);
    const expectedPassword = resolveExpectedPassword();

    if (!providedPassword || providedPassword !== expectedPassword) {
      console.warn('[admin] Invalid password attempt', {
        at: new Date().toISOString(),
        hasPassword: Boolean(providedPassword),
      });
      return sendJson(request, response, { error: 'Invalid password.' }, 401);
    }

    const statsPromise = hasFirebaseAdminEnv()
      ? getAdminDashboardStatsPrivileged()
      : getAdminDashboardStats();
    const stats = await withTimeout(statsPromise, 15000);
    console.info('[admin] Dashboard stats generated', {
      at: stats.generatedAt,
      users: stats.users,
      totalVisits: stats.totalVisits,
      recentChats: stats.recentChats?.length || 0,
      perUserApiCalls: stats.perUserApiCalls?.length || 0,
      perUserVisits: stats.perUserVisits?.length || 0,
      avgTurnsPerDuel: stats.avgTurnsPerDuel,
      completionRatePct: stats.completionRatePct,
      errorRatePct: stats.errorRatePct,
      p95TurnLatencyMs: stats.p95TurnLatencyMs,
      modelErrorRows: stats.modelErrorRates?.length || 0,
    });
    return sendJson(request, response, stats, 200);
  } catch (error) {
    console.error('[admin] Stats request failed', {
      error: String((error as Error)?.message || error),
      at: new Date().toISOString(),
    });
    return sendJson(
      request,
      response,
      { error: String((error as Error)?.message || 'Admin stats failed') },
      500,
    );
  }
}
