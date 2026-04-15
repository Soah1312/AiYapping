import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Users, BarChart3, MessageCircle, Zap, Eye, AlertTriangle } from 'lucide-react';

function AcademiaStatCard({ label, value, icon }) {
  return (
    <div className="relative overflow-hidden rounded-md p-5 bg-gradient-to-br from-academia-bg-light to-academia-bg border-2 border-academia-gold-muted shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-300 hover:from-academia-bg-hover hover:to-[#1f1714] hover:border-academia-gold hover:shadow-[0_12px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.02)] group">
      
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-academia-gold to-transparent opacity-40" />
      
      {/* Decorative corner accents */}
      <div className="absolute top-4 right-4 w-5 h-[2px] bg-academia-gold opacity-40" />
      <div className="absolute top-4 right-4 w-[2px] h-5 bg-academia-gold opacity-40" />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="m-0 text-[0.6rem] text-academia-gold-light font-medium tracking-[0.15em] uppercase font-academia-label">
            {label}
          </p>
          <p className="mt-3 mb-0 text-3xl font-bold text-academia-parchment font-academia-display leading-tight tracking-[-0.02em]">
            {value}
          </p>
        </div>
        {icon && <div className="text-[0] opacity-60 ml-4 group-hover:opacity-100 transition-opacity duration-300">{icon}</div>}
      </div>
    </div>
  );
}

function AcademiaChat({ chat }) {
  return (
    <Link 
      to={`/share/${chat.id}`} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block decoration-transparent rounded-md p-4 bg-gradient-to-br from-[#141110]/40 to-[#1a1410]/60 border border-academia-gold-muted border-l-[3px] border-l-academia-gold transition-all duration-200 relative hover:from-[#201a15]/60 hover:to-[#201a15]/80 hover:border-academia-gold-light hover:border-l-academia-gold"
    >
      <p className="m-0 font-semibold text-[0.95rem] text-academia-parchment font-academia-body">
        {chat.topic || 'Untitled Conversation'}
      </p>
      <div className="mt-2.5 flex gap-5 flex-wrap text-xs text-academia-gold-muted">
        <span className="font-academia-mono">ID: {chat.ownerId?.slice(0, 8)}...</span>
        <span className="font-academia-label tracking-[0.05em]">{chat.turnCount} turns</span>
        {chat.updatedAt && <span>{new Date(chat.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
      </div>
    </Link>
  );
}

function AcademiaMetric({ labelId, value, highlight }) {
  return (
    <div className="flex justify-between items-center py-3.5 px-4 rounded-md bg-gradient-to-r from-academia-bg/30 to-academia-bg/50 border border-academia-gold-muted/30 transition-all duration-200 font-academia-body hover:from-academia-bg-hover/50 hover:to-academia-bg-hover/50 hover:border-academia-gold-muted">
      <span className={`text-xs text-academia-gold-light font-academia-mono shrink-0 max-w-[200px] overflow-hidden text-ellipsis ${highlight ? 'text-red-400' : ''}`}>
        {labelId}
      </span>
      <div className="text-right">
        <span className="font-bold text-base text-academia-parchment">{value}</span>
      </div>
    </div>
  );
}

export default function MeowPage() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('meow_key') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState(null);

  // Auto-polling
  const timerRef = useRef(null);

  async function fetchStats(providedPassword = password, checkAuth = true) {
    if (!providedPassword) {
        setError('Password required.');
        return;
    }

    setLoading(true);
    if (checkAuth) setError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: providedPassword }),
        signal: controller.signal,
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(String(payload?.error || 'Access denied'));
      }

      setStats(payload);
      if (!isAuthenticated) {
        setIsAuthenticated(true);
        sessionStorage.setItem('meow_key', providedPassword);
      }
      setError('');
    } catch (nextError) {
      if (!isAuthenticated || checkAuth) {
        setStats(null);
        setIsAuthenticated(false);
        sessionStorage.removeItem('meow_key');
        
        if (nextError?.name === 'AbortError') {
          setError('Admin request timed out. Please try again.');
        } else {
          setError(String(nextError?.message || 'Access denied'));
        }
      } else {
        // We are authenticated but bg poll failed
        console.warn('[meow] Background polling failed', nextError);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  const handleLogin = (e) => {
    e?.preventDefault?.();
    fetchStats(password, true);
  };

  useEffect(() => {
    if (password && !isAuthenticated && !loading && !error) {
       // Auto-login on mount if key exists
       fetchStats(password, true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
        timerRef.current = setInterval(() => {
            fetchStats(password, false);
        }, 30000);
    } else if (timerRef.current) {
        clearInterval(timerRef.current);
    }
    
    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthenticated, password]);

  const generatedAt = useMemo(() => {
    if (!stats?.generatedAt) return '';
    const date = new Date(stats.generatedAt);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
  }, [stats]);

  const metricCards = useMemo(() => {
    if (!stats) return [];

    const asNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);
    const avgTurns = asNumber(stats.avgTurnsPerDuel);
    const completionRate = asNumber(stats.completionRatePct);
    const errorRate = asNumber(stats.errorRatePct);
    const p95Latency = asNumber(stats.p95TurnLatencyMs);

    return [
      { label: 'Avg Turns / Duel', value: avgTurns === null ? '--' : avgTurns.toFixed(1) },
      { label: 'Completion Rate', value: completionRate === null ? '--' : `${completionRate.toFixed(1)}%` },
      { label: 'Error Rate', value: errorRate === null ? '--' : `${errorRate.toFixed(1)}%` },
      { label: 'P95 Turn Latency', value: p95Latency === null ? '--' : `${(p95Latency / 1000).toFixed(2)}s` },
    ];
  }, [stats]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f0c0a] via-academia-bg-light to-academia-bg text-text">
      <div className="w-full mx-auto px-4 py-6">
        {!isAuthenticated ? (
          <div className="flex items-center justify-center min-h-[80vh] p-4">
            <div className="rounded-md p-8 bg-gradient-to-br from-academia-bg-light to-[#232320] border-2 border-academia-gold-muted shadow-[0_12px_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.02)] w-full max-w-[360px]">
              <h2 className="m-0 text-xl font-semibold text-center mb-1 font-academia-display text-academia-parchment">
                Admin Access
              </h2>
              <p className="text-center text-sm text-academia-gold-muted m-0 mb-6 font-academia-body">
                Enter password
              </p>

              <form onSubmit={handleLogin} className="grid gap-5">
                <div>
                  <label htmlFor="meow-password" className="block text-[0.7rem] font-semibold text-academia-gold-light uppercase tracking-[0.1em] font-academia-label mb-2">
                    Password
                  </label>
                  <input
                    id="meow-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full px-4 py-3.5 rounded-md border border-academia-gold-muted bg-gradient-to-br from-academia-bg to-academia-bg-light shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.1)] text-[0.95rem] font-academia-body text-academia-parchment transition-all duration-200 outline-none focus:border-academia-gold focus:shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2),0_0_6px_rgba(205,133,63,0.2)]"
                  />
                </div>

                {error && (
                  <div className="py-3 px-4 rounded-md bg-academia-gold-muted/10 border border-academia-gold-muted text-red-400 text-sm font-academia-body">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="py-3.5 px-5 rounded-md font-semibold text-sm font-academia-body bg-gradient-to-br from-academia-gold-muted to-academia-gold-light text-academia-parchment border-none cursor-pointer disabled:opacity-65 transition-all duration-200 w-full shadow-[0_4px_12px_rgba(0,0,0,0.2)] tracking-[0.03em] hover:not-disabled:from-[#9d8a75] hover:not-disabled:to-[#b39687] hover:not-disabled:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          stats ? (
            <>
              {/* Control Bar */}
              <div className="flex justify-between items-center gap-4 mb-8 flex-wrap">
                <div>
                  <h2 className="m-0 text-2xl font-bold font-academia-display text-academia-parchment">Admin Dashboard</h2>
                  {generatedAt && (
                    <p className="m-0 mt-1.5 text-sm text-academia-gold-muted font-academia-body">
                      Last sync: {generatedAt} {loading && <span className="ml-2 animate-pulse text-academia-gold-light">Polling...</span>}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fetchStats(password, true)}
                  disabled={loading}
                  className="py-3 px-5 rounded-md font-semibold text-sm font-academia-body bg-gradient-to-br from-academia-gold-muted to-academia-gold-light text-academia-parchment border-none cursor-pointer disabled:opacity-65 transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:not-disabled:from-[#9d8a75] hover:not-disabled:to-[#b39687] hover:not-disabled:shadow-[0_6px_16px_rgba(0,0,0,0.2)]"
                >
                  {loading ? 'Syncing...' : 'Force Refresh'}
                </button>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 mb-8">
                <AcademiaStatCard label="Total Users" value={stats.users ?? 0} icon={<Users size={28} strokeWidth={1.5} className="text-academia-gold opacity-60" />} />
                <AcademiaStatCard label="Total Visits" value={stats.totalVisits ?? 0} icon={<BarChart3 size={28} strokeWidth={1.5} className="text-academia-gold opacity-60" />} />
                <AcademiaStatCard label="Recent Chats" value={Array.isArray(stats.recentChats) ? stats.recentChats.length : 0} icon={<MessageCircle size={28} strokeWidth={1.5} className="text-academia-gold opacity-60" />} />
                {metricCards.map((metric) => (
                  <AcademiaStatCard key={metric.label} label={metric.label} value={metric.value} />
                ))}
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
                
                {/* Recent Chats */}
                <div className="flex flex-col">
                  <div className="rounded-md p-6 bg-gradient-to-br from-academia-bg-light to-academia-bg border-2 border-academia-gold-muted flex flex-col flex-1 shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <div className="flex items-center gap-2 mb-5">
                      <MessageCircle size={18} strokeWidth={1.5} className="text-academia-gold opacity-70 shrink-0" />
                      <h3 className="m-0 text-base font-bold font-academia-display text-academia-parchment">Recent Active Chats</h3>
                    </div>

                    <div className="grid gap-3 flex-1">
                      {(stats.recentChats || []).slice(0, 8).map((chat) => (
                        <AcademiaChat key={chat.id} chat={chat} />
                      ))}
                      {(stats.recentChats || []).length === 0 && (
                        <div className="text-center py-8 px-4 text-academia-gold-muted">
                          <p className="m-0 text-[0.85rem] font-academia-body">The records are silent.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* API Usage */}
                <div className="flex flex-col">
                  <div className="rounded-md p-6 bg-gradient-to-br from-academia-bg-light to-academia-bg border-2 border-academia-gold-muted flex flex-col flex-1 shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <div className="flex items-center gap-2 mb-5">
                      <Zap size={18} strokeWidth={1.5} className="text-academia-gold opacity-70 shrink-0" />
                      <h3 className="m-0 text-base font-bold font-academia-display text-academia-parchment">API Usage (Leaderboard)</h3>
                    </div>

                    <div className="grid gap-3 flex-1">
                      {(stats.perUserApiCalls || []).slice(0, 8).map((row) => (
                        <AcademiaMetric key={row.userId} labelId={row.userId} value={row.totalApiCalls} />
                      ))}
                      {(stats.perUserApiCalls || []).length === 0 && (
                        <div className="text-center py-8 px-4 text-academia-gold-muted">
                          <p className="m-0 text-[0.85rem] font-academia-body">No API traces detected.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Visits */}
                <div className="flex flex-col">
                  <div className="rounded-md p-6 bg-gradient-to-br from-academia-bg-light to-academia-bg border-2 border-academia-gold-muted flex flex-col flex-1 shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <div className="flex items-center gap-2 mb-5">
                      <Eye size={18} strokeWidth={1.5} className="text-academia-gold opacity-70 shrink-0" />
                      <h3 className="m-0 text-base font-bold font-academia-display text-academia-parchment">Frequent Scholars</h3>
                    </div>

                    <div className="grid gap-3 flex-1">
                      {(stats.perUserVisits || []).slice(0, 8).map((row) => (
                        <AcademiaMetric key={row.userId} labelId={row.userId} value={row.visits} />
                      ))}
                      {(stats.perUserVisits || []).length === 0 && (
                        <div className="text-center py-8 px-4 text-academia-gold-muted">
                          <p className="m-0 text-[0.85rem] font-academia-body">The library is empty.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Model Error Rates */}
                <div className="flex flex-col">
                  <div className="rounded-md p-6 bg-gradient-to-br from-academia-bg-light to-academia-bg border-2 border-academia-gold-muted flex flex-col flex-1 shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <div className="flex items-center gap-2 mb-5">
                      <AlertTriangle size={18} strokeWidth={1.5} className="text-academia-gold opacity-70 shrink-0" />
                      <h3 className="m-0 text-base font-bold font-academia-display text-academia-parchment">Model Instability Core</h3>
                    </div>

                    <div className="grid gap-3 flex-1">
                      {(stats.modelErrorRates || []).slice(0, 8).map((row) => {
                         const pct = Number.isFinite(Number(row.errorRatePct)) ? Number(row.errorRatePct).toFixed(1) : '0.0';
                         const isHighErr = parseFloat(pct) > 5;
                         return (
                           <AcademiaMetric
                             key={row.model}
                             labelId={row.model}
                             value={`${pct}% (${row.errorTurns}/${row.totalTurns})`}
                             highlight={isHighErr}
                           />
                         );
                      })}
                      {(stats.modelErrorRates || []).length === 0 && (
                        <div className="text-center py-8 px-4 text-academia-gold-muted">
                          <p className="m-0 text-[0.85rem] font-academia-body">No anomalies detected.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="text-academia-gold-muted animate-pulse font-academia-body tracking-wider uppercase text-sm">
                Compiling Records...
              </div>
            </div>
          )
        )}
      </div>
    </main>
  );
}
