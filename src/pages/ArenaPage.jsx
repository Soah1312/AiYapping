import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useConversation } from '../hooks/useConversation';
import { useConversationStore } from '../store/conversationStore';
import { useTheme } from '../context/ThemeContext';
import MessageCard from '../components/MessageCard';
import ConversationControls from '../components/ConversationControls';
import { MODEL_BY_ID } from '../lib/modelConfig';

export default function ArenaPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const {
    setup,
    transcript,
    status,
    aiTurnCount,
    pause,
    resume,
    stop,
    retryLatestInterrupted,
  } = useConversation();

  const { redirectDraft, setRedirectDraft, injectRedirectNote } = useConversationStore();
  const [showRedirect, setShowRedirect] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    if (!setup.topic) navigate('/');
  }, [navigate, setup.topic]);

  useEffect(() => {
    if (status === 'completed') navigate('/summary');
  }, [navigate, status]);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [transcript.length]);

  const modeLabel = useMemo(() => (setup.mode === 'debate' ? 'Debate' : 'Chat'), [setup.mode]);

  const ai1Label = setup.persona1 || MODEL_BY_ID[setup.ai1Model]?.label || 'AI-1';
  const ai2Label = setup.persona2 || MODEL_BY_ID[setup.ai2Model]?.label || 'AI-2';

  function handleRedirectSubmit(e) {
    e.preventDefault();
    if (!redirectDraft.trim()) return;
    injectRedirectNote(redirectDraft.trim());
    setShowRedirect(false);
  }

  function handleStop() {
    stop();
    navigate('/summary');
  }

  /* ── Redirect form (shared) ─────────────────────────────── */
  const redirectForm = showRedirect && (
    <form
      onSubmit={handleRedirectSubmit}
      className="fixed inset-x-0 bottom-[5.25rem] z-30 mx-auto w-[calc(100%-1.5rem)] max-w-3xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '0.875rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}
    >
      <label htmlFor="redirect" className="small-caps text-xs" style={{ color: 'var(--text-muted)' }}>
        Director Note
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="redirect"
          value={redirectDraft}
          onChange={(e) => setRedirectDraft(e.target.value.slice(0, 300))}
          className="theme-input flex-1"
          placeholder="Steer the convo in a new direction…"
        />
        <button type="submit" className="btn-primary px-4">
          Inject
        </button>
      </div>
    </form>
  );

  /* ─────────────────────────────────────────────────────────
     CLAUDE LAYOUT: left sidebar + main feed
  ───────────────────────────────────────────────────────── */
  if (theme === 'claude') {
    return (
      <div className="claude-layout">
        {/* Sidebar */}
        <aside className="claude-sidebar" aria-label="Session info">
          {/* Topic */}
          <div className="claude-sidebar-section">
            <p className="small-caps text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Topic</p>
            <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
              {setup.topic}
            </p>
          </div>

          {/* Participants */}
          <div className="claude-sidebar-section">
            <p className="small-caps text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Participants</p>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: '#c96442' }} />
                <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{ai1Label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: '#5e5d59' }} />
                <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{ai2Label}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="claude-sidebar-section">
            <p className="small-caps text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Stats</p>
            <div className="grid gap-1">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Turns</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{aiTurnCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>Mode</span>
                <span style={{ color: 'var(--text-primary)' }}>{modeLabel}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="claude-sidebar-section flex flex-col gap-2">
            <p className="small-caps text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Controls</p>
            {status === 'paused' ? (
              <button type="button" className="btn-primary w-full justify-center text-xs" onClick={resume}>
                Resume
              </button>
            ) : (
              <button type="button" className="btn-secondary w-full justify-center text-xs" onClick={pause}>
                Pause
              </button>
            )}
            <button
              type="button"
              className="btn-secondary w-full justify-center text-xs"
              onClick={() => setShowRedirect((p) => !p)}
            >
              Redirect
            </button>
            <button
              type="button"
              className="w-full justify-center text-xs rounded-lg px-3 py-2 font-medium"
              style={{
                background: 'var(--danger)',
                color: '#fff',
                fontFamily: 'var(--font-body)',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--radius-btn)',
              }}
              onClick={handleStop}
            >
              Stop
            </button>
          </div>
        </aside>

        {/* Main message feed */}
        <div className="claude-main">
          <section
            ref={feedRef}
            className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5 pb-8 flex flex-col gap-4"
            aria-label="Conversation feed"
          >
            {transcript.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="surface-card p-4 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Warming up the arena… first yap incoming.
              </motion.div>
            )}
            {transcript.map((message) => (
              <MessageCard key={message.id} message={message} onRetry={retryLatestInterrupted} />
            ))}
          </section>
        </div>

        {redirectForm}
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────
     GPT LAYOUT: dark, centered narrow column, no sidebar
  ───────────────────────────────────────────────────────── */
  if (theme === 'gpt') {
    return (
      <main className="flex min-h-[calc(100vh-52px)] flex-col" aria-label="Arena">
        {/* Minimal sticky header */}
        <header
          className="sticky top-[52px] z-20 px-4 py-2.5"
          style={{
            background: 'color-mix(in oklab, var(--bg) 85%, transparent)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="gpt-arena-layout mx-auto flex items-center justify-between">
            <p className="text-xs truncate max-w-[60%]" style={{ color: 'var(--text-muted)' }}>
              {setup.topic}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span
                className="px-2.5 py-1"
                style={{
                  background: 'var(--surface)',
                  borderRadius: '999px',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {modeLabel}
              </span>
              <span
                className="px-2.5 py-1"
                style={{
                  background: 'var(--surface)',
                  borderRadius: '999px',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                Turn {aiTurnCount}
              </span>
            </div>
          </div>
        </header>

        <section
          ref={feedRef}
          className="scrollbar-thin flex-1 overflow-y-auto py-6 pb-36"
          aria-label="Conversation feed"
        >
          {transcript.length === 0 && (
            <div className="gpt-arena-layout mx-auto px-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              Initializing… first response streaming shortly.
            </div>
          )}
          <div className="gpt-arena-layout mx-auto px-4 flex flex-col gap-0">
            {transcript.map((message) => (
              <MessageCard key={message.id} message={message} onRetry={retryLatestInterrupted} />
            ))}
          </div>
        </section>

        {redirectForm}
        <ConversationControls
          status={status}
          turnCount={aiTurnCount}
          allowManualStop={setup.endConditions.manualStop}
          onPause={pause}
          onResume={resume}
          onStop={handleStop}
          onOpenRedirect={() => setShowRedirect((p) => !p)}
        />
      </main>
    );
  }

  /* ─────────────────────────────────────────────────────────
     GEMINI LAYOUT: dark wide, gradient header, card messages
  ───────────────────────────────────────────────────────── */
  return (
    <main className="flex min-h-[calc(100vh-52px)] flex-col" aria-label="Arena">
      {/* Gradient header strip */}
      <header className="gemini-arena-header sticky top-[52px] z-20">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
              {modeLabel} · Turn {aiTurnCount}
            </p>
            <h1
              className="display-font gemini-gradient-text truncate"
              style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', lineHeight: 1.2 }}
            >
              {setup.topic}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs flex-shrink-0">
            <span
              className="px-2 py-1 rounded-full text-xs"
              style={{ background: 'rgba(66,133,244,0.15)', color: '#4285f4', border: '1px solid rgba(66,133,244,0.3)' }}
            >
              {ai1Label}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>vs</span>
            <span
              className="px-2 py-1 rounded-full text-xs"
              style={{ background: 'rgba(161,66,244,0.15)', color: '#a142f4', border: '1px solid rgba(161,66,244,0.3)' }}
            >
              {ai2Label}
            </span>
          </div>
        </div>
      </header>

      <section
        ref={feedRef}
        className="scrollbar-thin flex-1 overflow-y-auto py-6 pb-36"
        aria-label="Conversation feed"
      >
        {transcript.length === 0 && (
          <div className="mx-auto max-w-4xl px-4 text-sm surface-card p-4" style={{ color: 'var(--text-muted)' }}>
            Models loading… first yap on its way ✦
          </div>
        )}
        <div className="mx-auto max-w-4xl px-4 flex flex-col gap-4">
          {transcript.map((message) => (
            <MessageCard key={message.id} message={message} onRetry={retryLatestInterrupted} />
          ))}
        </div>
      </section>

      {redirectForm}
      <ConversationControls
        status={status}
        turnCount={aiTurnCount}
        allowManualStop={setup.endConditions.manualStop}
        onPause={pause}
        onResume={resume}
        onStop={handleStop}
        onOpenRedirect={() => setShowRedirect((p) => !p)}
      />
    </main>
  );
}
