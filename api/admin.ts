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
      return Response.json({ error: 'Invalid password.' }, { status: 401 });
    }

    const stats = await getAdminDashboardStats();
    return Response.json(stats, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: String((error as Error)?.message || 'Admin stats failed') },
      { status: 500 },
    );
  }
}
