import { useMemo, useState } from 'react';
import { Lock, Users, BarChart3, MessageCircle, Zap, Eye } from 'lucide-react';

// Dark Academia Stat Card
function AcademiaStatCard({ label, value, icon }) {
  return (
    <div style={{
      borderRadius: '0.375rem',
      padding: '1.75rem 1.5rem',
      background: 'linear-gradient(135deg, #1a1410 0%, #141110 100%)',
      border: '2px solid #8b7355',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'linear-gradient(135deg, #231a14 0%, #1f1714 100%)';
      e.currentTarget.style.borderColor = '#cd853f';
      e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.02)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'linear-gradient(135deg, #1a1410 0%, #141110 100%)';
      e.currentTarget.style.borderColor = '#8b7355';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.02)';
    }}
    >
      {/* Decorative top border */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, #cd853f, transparent)',
        opacity: 0.4
      }} />
      
      {/* Decorative corner accents */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        width: '20px',
        height: '2px',
        background: '#cd853f',
        opacity: 0.4
      }} />
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        width: '2px',
        height: '20px',
        background: '#cd853f',
        opacity: 0.4
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <p style={{ 
            margin: 0, 
            fontSize: '0.65rem', 
            color: '#a0826d',
            fontWeight: 500, 
            letterSpacing: '0.15em', 
            textTransform: 'uppercase',
            fontFamily: 'Cinzel, "Copperplate", serif'
          }}>{label}</p>
          <p style={{ 
            margin: '1.25rem 0 0', 
            fontSize: '2.5rem', 
            fontWeight: 700, 
            color: '#e8dcc8',
            fontFamily: 'Playfair Display, Lora, "Libre Baskerville", serif',
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
          }}>{value}</p>
        </div>
        {icon && <div style={{ fontSize: '0', opacity: 0.6, marginLeft: '1rem' }}>{icon}</div>}
      </div>
    </div>
  );
}

// Dark Academia Chat Item
function AcademiaChat ({ chat }) {
  return (
    <div style={{
      borderRadius: '0.25rem',
      padding: '1rem 1.25rem',
      background: 'linear-gradient(135deg, rgba(20, 17, 16, 0.4) 0%, rgba(26, 20, 16, 0.6) 100%)',
      border: '1px solid #8b7355',
      borderLeft: '3px solid #cd853f',
      transition: 'all 0.2s ease',
      position: 'relative'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(32, 26, 21, 0.6) 0%, rgba(32, 26, 21, 0.8) 100%)';
      e.currentTarget.style.borderColor = '#a0826d';
      e.currentTarget.style.borderLeftColor = '#cd853f';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20, 17, 16, 0.4) 0%, rgba(26, 20, 16, 0.6) 100%)';
      e.currentTarget.style.borderColor = '#8b7355';
    }}
    >
      <p style={{ 
        margin: 0, 
        fontWeight: 600, 
        fontSize: '0.95rem', 
        color: '#e8dcc8',
        fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif'
      }}>
        {chat.topic || 'Untitled Conversation'}
      </p>
      <div style={{ marginTop: '0.625rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#8b7355' }}>
        <span style={{ fontFamily: 'Space Mono, Monaco, Menlo, monospace' }}>ID: {chat.ownerId?.slice(0, 8)}...</span>
        <span style={{ fontFamily: 'Cinzel, "Copperplate", serif', letterSpacing: '0.05em' }}>{chat.turnCount} turns</span>
        {chat.updatedAt && <span>{new Date(chat.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
      </div>
    </div>
  );
}

// Dark Academia Metric Item
function AcademiaMetric({ userId, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.875rem 1rem',
      borderRadius: '0.25rem',
      background: 'linear-gradient(90deg, rgba(20, 17, 16, 0.3) 0%, rgba(26, 20, 16, 0.3) 100%)',
      border: '1px solid rgba(139, 115, 85, 0.3)',
      transition: 'all 0.2s ease',
      fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'linear-gradient(90deg, rgba(32, 26, 21, 0.5) 0%, rgba(32, 26, 21, 0.5) 100%)';
      e.currentTarget.style.borderColor = '#8b7355';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'linear-gradient(90deg, rgba(20, 17, 16, 0.3) 0%, rgba(26, 20, 16, 0.3) 100%)';
      e.currentTarget.style.borderColor = 'rgba(139, 115, 85, 0.3)';
    }}
    >
      <span style={{ fontSize: '0.8rem', color: '#a0826d', fontFamily: 'Space Mono, Monaco, Menlo, monospace', flexShrink: 0, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {userId}
      </span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#e8dcc8' }}>{value}</span>
      </div>
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
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c0a 0%, #1a1410 50%, #141110 100%)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{
        borderBottom: '2px solid #8b7355',
        backgroundImage: 'linear-gradient(135deg, rgba(139, 115, 85, 0.08) 0%, rgba(205, 133, 63, 0.04) 100%)',
        boxShadow: 'inset 0 -1px 4px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ 
              padding: '0.5rem',
              backgroundColor: 'rgba(139, 115, 85, 0.1)',
              borderRadius: '0.5rem',
              border: '1px solid #8b7355',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={28} strokeWidth={1.5} color="#cd853f" style={{ opacity: 0.8 }} />
            </div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'Playfair Display, Lora, "Libre Baskerville", serif', color: '#e8dcc8' }}>/meow admin</h1>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {!unlocked ? (
          <div style={{ maxWidth: '500px', margin: '4rem auto' }}>
            <div style={{
              borderRadius: '0.5rem',
              padding: '3rem 2.5rem',
              background: 'linear-gradient(135deg, #1a1410 0%, #232320 100%)',
              border: '2px solid #8b7355',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative corner accents */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '2px',
                height: '30px',
                background: '#cd853f',
                opacity: 0.5
              }} />
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '30px',
                height: '2px',
                background: '#cd853f',
                opacity: 0.5
              }} />
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '2px',
                height: '30px',
                background: '#cd853f',
                opacity: 0.5
              }} />
              <div style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '30px',
                height: '2px',
                background: '#cd853f',
                opacity: 0.5
              }} />
              
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.75rem', 
                fontWeight: 600, 
                textAlign: 'center', 
                marginBottom: '0.5rem', 
                letterSpacing: '-0.01em', 
                fontFamily: 'Playfair Display, Lora, "Libre Baskerville", serif',
                color: '#e8dcc8'
              }}>
                Admin Access
              </h2>
              <p style={{
                textAlign: 'center',
                fontSize: '0.85rem',
                color: '#8b7355',
                margin: '0 0 2rem 0',
                fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif'
              }}>
                Enter your password
              </p>

              <form onSubmit={fetchStats} style={{ display: 'grid', gap: '1.75rem' }}>
                <div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem'
                  }}>
                    <label htmlFor="meow-password" style={{ 
                      display: 'block', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: '#a0826d', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.12em', 
                      fontFamily: 'Cinzel, "Copperplate", serif'
                    }}>
                      Security Passphrase
                    </label>
                    <div style={{
                      width: '60px',
                      height: '1px',
                      background: 'linear-gradient(90deg, transparent, #8b7355, transparent)',
                      opacity: 0.3
                    }} />
                  </div>
                  <input
                    id="meow-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '1.1rem 1.25rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #8b7355',
                      background: 'linear-gradient(135deg, #141110 0%, #1a1410 100%)',
                      boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -1px -1px 2px rgba(255, 255, 255, 0.02), 0 1px 3px rgba(0, 0, 0, 0.1)',
                      fontSize: '1rem',
                      fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif',
                      color: '#e8dcc8',
                      transition: 'all 0.25s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#cd853f';
                      e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(205, 133, 63, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#8b7355';
                      e.currentTarget.style.boxShadow = 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -1px -1px 2px rgba(255, 255, 255, 0.02), 0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}
                  />
                </div>

                {error && (
                  <div style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '0.375rem',
                    background: 'rgba(139, 115, 85, 0.08)',
                    border: '1px solid #8b7355',
                    color: '#f87171',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}>
                    ✗ {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '1.1rem 1.5rem',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif',
                    background: 'linear-gradient(135deg, #8b7355 0%, #a0826d 100%)',
                    color: '#e8dcc8',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.65 : 1,
                    transition: 'all 0.25s ease',
                    width: '100%',
                    boxShadow: loading ? 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' : '0 8px 20px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(255, 255, 255, 0.05)',
                    transform: loading ? 'translateY(2px)' : 'translateY(0)',
                    letterSpacing: '0.05em'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #9d8a75 0%, #b39687 100%)';
                      e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #8b7355 0%, #a0826d 100%)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {loading ? '⟳ Verifying...' : '→ Enter Portal'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            <div style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #8b7355, transparent)',
              opacity: 0.4,
              marginBottom: '2.5rem'
            }} />
            
            {/* Control Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'Playfair Display, Lora, "Libre Baskerville", serif', color: '#e8dcc8' }}>Dashboard</h2>
                {generatedAt && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#8b7355', fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif' }}>
                    Data updated {generatedAt}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={fetchStats}
                disabled={loading}
                style={{
                  padding: '0.875rem 1.75rem',
                  borderRadius: '0.375rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif',
                  background: 'linear-gradient(135deg, #8b7355 0%, #a0826d 100%)',
                  color: '#e8dcc8',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.65 : 1,
                  transition: 'all 0.25s ease',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(255, 255, 255, 0.05)',
                  letterSpacing: '0.05em'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #9d8a75 0%, #b39687 100%)';
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #8b7355 0%, #a0826d 100%)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? '⟳ Syncing' : '↻ Refresh Data'}
              </button>
            </div>

            {/* Stat Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem'
            }}>
              <AcademiaStatCard label="Total Users" value={stats.users ?? 0} icon={<Users size={40} strokeWidth={1.5} color="#cd853f" style={{ opacity: 0.6 }} />} />
              <AcademiaStatCard label="Total Visits" value={stats.totalVisits ?? 0} icon={<BarChart3 size={40} strokeWidth={1.5} color="#cd853f" style={{ opacity: 0.6 }} />} />
              <AcademiaStatCard label="Recent Chats" value={Array.isArray(stats.recentChats) ? stats.recentChats.length : 0} icon={<MessageCircle size={40} strokeWidth={1.5} color="#cd853f" style={{ opacity: 0.6 }} />} />
            </div>

            <div style={{
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #8b7355, transparent)',
              opacity: 0.4,
              marginBottom: '3rem'
            }} />

            {/* Content Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem'
            }}>
              {/* Recent Chats */}
              <div style={{
                gridColumn: 'span 1',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  borderRadius: '0.375rem',
                  padding: '2rem',
                  background: 'linear-gradient(135deg, #1a1410 0%, #141110 100%)',
                  border: '2px solid #8b7355',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '2rem',
                    right: '2rem',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, #cd853f, transparent)',
                    opacity: 0.3
                  }} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', marginTop: '0.5rem' }}>
                    <div style={{
                      padding: '0.375rem',
                      backgroundColor: 'rgba(139, 115, 85, 0.08)',
                      borderRadius: '0.25rem',
                      border: '1px solid rgba(139, 115, 85, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MessageCircle size={20} strokeWidth={1.5} color="#cd853f" style={{ opacity: 0.7 }} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'Playfair Display, Lora, "Libre Baskerville", serif', color: '#e8dcc8' }}>Recent Chats</h3>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem', flex: 1 }}>
                    {(stats.recentChats || []).slice(0, 12).map((chat) => (
                      <AcademiaChat key={chat.id} chat={chat} />
                    ))}
                    {(stats.recentChats || []).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8b7355' }}>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif' }}>No conversations recorded</p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', opacity: 0.6, fontFamily: 'Cinzel, "Copperplate", serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Awaiting activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* API Usage */}
              <div style={{
                gridColumn: 'span 1',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  borderRadius: '0.375rem',
                  padding: '2rem',
                  background: 'linear-gradient(135deg, #1a1410 0%, #141110 100%)',
                  border: '2px solid #8b7355',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '2rem',
                    right: '2rem',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, #cd853f, transparent)',
                    opacity: 0.3
                  }} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', marginTop: '0.5rem' }}>
                    <div style={{
                      padding: '0.375rem',
                      backgroundColor: 'rgba(139, 115, 85, 0.08)',
                      borderRadius: '0.25rem',
                      border: '1px solid rgba(139, 115, 85, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Zap size={20} strokeWidth={1.5} color="#cd853f" style={{ opacity: 0.7 }} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'Playfair Display, Lora, "Libre Baskerville", serif', color: '#e8dcc8' }}>API Consumption</h3>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem', flex: 1 }}>
                    {(stats.perUserApiCalls || []).slice(0, 10).map((row) => (
                      <AcademiaMetric key={row.userId} userId={row.userId} value={row.totalApiCalls} />
                    ))}
                    {(stats.perUserApiCalls || []).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8b7355' }}>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif' }}>No API calls recorded</p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', opacity: 0.6, fontFamily: 'Cinzel, "Copperplate", serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Standby mode</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User Visits */}
              <div style={{
                gridColumn: 'span 1',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  borderRadius: '0.375rem',
                  padding: '2rem',
                  background: 'linear-gradient(135deg, #1a1410 0%, #141110 100%)',
                  border: '2px solid #8b7355',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '2rem',
                    right: '2rem',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, #cd853f, transparent)',
                    opacity: 0.3
                  }} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem', marginTop: '0.5rem' }}>
                    <div style={{
                      padding: '0.375rem',
                      backgroundColor: 'rgba(139, 115, 85, 0.08)',
                      borderRadius: '0.25rem',
                      border: '1px solid rgba(139, 115, 85, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Eye size={20} strokeWidth={1.5} color="#cd853f" style={{ opacity: 0.7 }} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em', fontFamily: 'Playfair Display, Lora, "Libre Baskerville", serif', color: '#e8dcc8' }}>User Presence</h3>
                  </div>

                  <div style={{ display: 'grid', gap: '0.75rem', flex: 1 }}>
                    {(stats.perUserVisits || []).slice(0, 10).map((row) => (
                      <AcademiaMetric key={row.userId} userId={row.userId} value={row.visits} />
                    ))}
                    {(stats.perUserVisits || []).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8b7355' }}>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', fontFamily: 'Merriweather, "Source Serif Pro", Garamond, serif' }}>No visitor data available</p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', opacity: 0.6, fontFamily: 'Cinzel, "Copperplate", serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Awaiting session</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
