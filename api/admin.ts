import { getAdminDashboardStats } from './_lib/firebase';

export const config = {
  runtime: 'edge',
};

type AdminRequestBody = {
  password?: string;
};

function normalizePassword(value: unknown) {
  return String(value || '').trim();
}

function resolveExpectedPassword() {
  return normalizePassword(process.env.MEOW_PASSWORD || process.env.ADMIN_MEOW_PASSWORD || '1234');
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as AdminRequestBody;
    const providedPassword = normalizePassword(body?.password);
    const expectedPassword = resolveExpectedPassword();

    if (!providedPassword || providedPassword !== expectedPassword) {
      console.warn('[admin] Invalid password attempt', {
        at: new Date().toISOString(),
        hasPassword: Boolean(providedPassword),
      });
      return Response.json({ error: 'Invalid password.' }, { status: 401 });
    }

    const stats = await getAdminDashboardStats();
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
    return Response.json(stats, { status: 200 });
  } catch (error) {
    console.error('[admin] Stats request failed', {
      error: String((error as Error)?.message || error),
      at: new Date().toISOString(),
    });
    return Response.json(
      { error: String((error as Error)?.message || 'Admin stats failed') },
      { status: 500 },
    );
  }
}
