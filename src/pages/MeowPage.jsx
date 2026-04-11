import { useMemo, useState } from 'react';

function StatCard({ label, value }) {
  return (
    <div className="surface-card" style={{ padding: '0.875rem 1rem' }}>
      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</p>
      <p style={{ margin: '0.35rem 0 0', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

export default function MeowPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const unlocked = Boolean(stats);

  async function fetchStats(event) {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(String(payload?.error || 'Access denied'));
      }

      setStats(payload);
    } catch (nextError) {
      setStats(null);
      setError(String(nextError?.message || 'Access denied'));
    } finally {
      setLoading(false);
    }
  }

  const generatedAt = useMemo(() => {
    if (!stats?.generatedAt) {
      return '';
    }

    const date = new Date(stats.generatedAt);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
  }, [stats]);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-primary)', padding: '1.25rem' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: '1rem' }}>
        <header>
          <h1 className="display-font" style={{ margin: 0, fontSize: '1.8rem' }}>/meow admin</h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>Internal stats dashboard</p>
        </header>

        {!unlocked && (
          <form className="surface-card" onSubmit={fetchStats} style={{ padding: '1rem', display: 'grid', gap: '0.75rem', maxWidth: 460 }}>
            <label htmlFor="meow-password" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password</label>
            <input
              id="meow-password"
              type="password"
              className="theme-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              autoComplete="current-password"
            />
            {error && <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Unlocking...' : 'Unlock /meow'}
            </button>
          </form>
        )}

        {unlocked && (
          <>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <StatCard label="Users" value={stats.users ?? 0} />
              <StatCard label="Total Visits" value={stats.totalVisits ?? 0} />
              <StatCard label="Recent Chats Tracked" value={Array.isArray(stats.recentChats) ? stats.recentChats.length : 0} />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button type="button" className="btn-secondary" onClick={fetchStats} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh stats'}
              </button>
              {generatedAt && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Updated {generatedAt}</span>}
            </div>

            <section className="surface-card" style={{ padding: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Recent Chats</h2>
              <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
                {(stats.recentChats || []).map((chat) => (
                  <div key={chat.id} style={{ border: '1px solid var(--border)', borderRadius: '0.6rem', padding: '0.65rem 0.75rem' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{chat.topic}</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      user: {chat.ownerId} | turns: {chat.turnCount} | updated: {chat.updatedAt || chat.createdAt || 'n/a'}
                    </p>
                  </div>
                ))}
                {(stats.recentChats || []).length === 0 && (
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>No chats found yet.</p>
                )}
              </div>
            </section>

            <section className="surface-card" style={{ padding: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Per User API Calls</h2>
              <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.75rem' }}>
                {(stats.perUserApiCalls || []).map((row) => (
                  <div key={row.userId} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{row.userId}</span>
                    <strong>{row.totalApiCalls}</strong>
                  </div>
                ))}
                {(stats.perUserApiCalls || []).length === 0 && (
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>No API usage data yet.</p>
                )}
              </div>
            </section>

            <section className="surface-card" style={{ padding: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>Per User Visits</h2>
              <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.75rem' }}>
                {(stats.perUserVisits || []).map((row) => (
                  <div key={row.userId} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{row.userId}</span>
                    <strong>{row.visits}</strong>
                  </div>
                ))}
                {(stats.perUserVisits || []).length === 0 && (
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>No visit data yet.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
