import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ensureAnonymousUser } from '../lib/firebaseClient';
import { useConversation } from '../hooks/useConversation';
import { useConversationStore } from '../store/conversationStore';
import { useTheme } from '../context/ThemeContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import MessageCard from '../components/MessageCard';
import ModelPicker from '../components/ModelPicker';
import { MODEL_BY_ID } from '../lib/modelConfig';

function SetupForm({ setup, patchSetup, onRun, starting, canRun, usage, authReady, authError }) {
  return (
    <form onSubmit={onRun} className="surface-card grid gap-4 p-4 md:p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <ModelPicker
          title="AI-1"
          accent="#3b82f6"
          model={setup.ai1Model}
          openingSeed={setup.openingSeed1 || ''}
          onModelChange={(ai1Model) => patchSetup({ ai1Model })}
          onOpeningSeedChange={(openingSeed1) => patchSetup({ openingSeed1 })}
        />
        <ModelPicker
          title="AI-2"
          accent="#f97316"
          model={setup.ai2Model}
          openingSeed={setup.openingSeed2 || ''}
          onModelChange={(ai2Model) => patchSetup({ ai2Model })}
          onOpeningSeedChange={(openingSeed2) => patchSetup({ openingSeed2 })}
        />
      </div>

      <div>
        <label htmlFor="duel-topic" className="block text-xs" style={{ color: 'var(--text-muted)' }}>
          Duel Topic
        </label>
        <textarea
          id="duel-topic"
          required
          maxLength={300}
          value={setup.topic}
          onChange={(event) => patchSetup({ topic: event.target.value })}
          className="theme-input mt-1 min-h-24 resize-none"
          placeholder="e.g. Is open-source AI safer than closed-source AI?"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onRun(event);
            }
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Free turns remaining: <strong>{usage.remaining}</strong> / {usage.limit}
          </p>
          {!authReady && (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Initializing secure session...
            </p>
          )}
          {authError && (
            <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
              {authError}
            </p>
          )}
        </div>

        <button type="submit" className="btn-primary" disabled={!canRun || starting}>
          {starting ? 'Starting...' : 'Run Duel'}
        </button>
      </div>
    </form>
  );
}

function DuelControls({ status, onPause, onResume, onStop, onRetry, ai1TurnCount, ai2TurnCount, sideTurnLimit }) {
  return (
    <div className="surface-card flex flex-wrap items-center justify-between gap-2 p-3">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        AI-1: {ai1TurnCount}/{sideTurnLimit} · AI-2: {ai2TurnCount}/{sideTurnLimit}
      </p>

      <div className="flex flex-wrap gap-2">
        {status === 'paused' ? (
          <button type="button" className="btn-primary" onClick={onResume}>Resume</button>
        ) : (
          <button type="button" className="btn-secondary" onClick={onPause}>Pause</button>
        )}
        <button type="button" className="btn-secondary" onClick={onStop}>Stop</button>
        {status === 'completed' && (
          <button type="button" className="btn-primary" onClick={onRetry}>Try Again</button>
        )}
      </div>
    </div>
  );
}

function ThemeShell({ theme, topic, children }) {
  if (theme === 'gpt') {
    return (
      <div className="min-h-screen bg-[#212121] text-[#ececec]">
        <div className="flex min-h-screen">
          <aside className="hidden w-[260px] flex-col bg-[#171717] px-3 py-4 md:flex">
            <button className="rounded-lg px-3 py-2 text-left text-sm text-[#ececec] hover:bg-[#2f2f2f]">New chat</button>
            <button className="mt-2 rounded-lg px-3 py-2 text-left text-sm text-[#ececec] hover:bg-[#2f2f2f]">Search chats</button>
            <button className="mt-auto rounded-lg px-3 py-2 text-left text-sm text-[#ececec] hover:bg-[#2f2f2f]">Profile</button>
          </aside>
          <main className="flex flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold">ChatGPT Duel</p>
              <ThemeSwitcher />
            </header>
            <div className="mx-auto w-full max-w-4xl flex-1 p-4">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  if (theme === 'gemini') {
    return (
      <div className="min-h-screen bg-[#131314] text-[#e3e3e3]">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="text-lg font-medium">Gemini Duel</p>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/20 bg-[#1e1f20] px-2 py-1 text-xs">PRO</span>
            <ThemeSwitcher />
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl p-4">{children}</main>
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="small-caps text-xs" style={{ color: 'var(--text-muted)' }}>AI Duel</p>
          <h1 className="display-font text-2xl md:text-3xl">{topic ? 'Live Conversation' : 'Configure Duel'}</h1>
        </div>
      </div>
      {children}
    </main>
  );
}

export default function ArenaPage() {
  const { theme } = useTheme();
  const feedRef = useRef(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [starting, setStarting] = useState(false);

  const {
    sessionId,
    setup,
    usage,
    patchSetup,
    setSessionId,
    setUsage,
    resetConversation,
    startConversation,
  } = useConversationStore();

  const {
    transcript,
    status,
    isStreaming,
    aiTurnCount,
    ai1TurnCount,
    ai2TurnCount,
    sideTurnLimit,
    pause,
    resume,
    stop,
  } = useConversation();

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const uid = await ensureAnonymousUser();
        if (mounted) {
          setSessionId(uid);
        }
      } catch (error) {
        if (mounted) {
          setAuthError(String(error?.message || 'Could not initialize anonymous auth session.'));
        }
      } finally {
        if (mounted) {
          setAuthReady(true);
        }
      }
    }

    void initSession();

    return () => {
      mounted = false;
    };
  }, [setSessionId]);

  useEffect(() => {
    let mounted = true;

    async function fetchUsage() {
      if (!sessionId) {
        return;
      }

      try {
        const response = await fetch('/api/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (mounted) {
          setUsage(payload);
        }
      } catch {
        // Non-blocking.
      }
    }

    void fetchUsage();

    return () => {
      mounted = false;
    };
  }, [sessionId, setUsage]);

  useEffect(() => {
    if (!feedRef.current) {
      return;
    }

    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [transcript.length, isStreaming]);

  const canRun = Boolean(setup.topic.trim()) && authReady && Boolean(sessionId) && usage.remaining > 0;
  const inSetupState = status === 'idle';

  const ai1Label = MODEL_BY_ID[setup.ai1Model]?.label || 'AI-1';
  const ai2Label = MODEL_BY_ID[setup.ai2Model]?.label || 'AI-2';

  function normalizeSetup() {
    return {
      ...setup,
      topic: setup.topic.trim().slice(0, 300),
      openingSeed1: (setup.openingSeed1 || '').trim().slice(0, 200),
      openingSeed2: (setup.openingSeed2 || '').trim().slice(0, 200),
      mode: 'chat',
    };
  }

  function handleRun(event) {
    event.preventDefault();
    if (!canRun || starting) {
      return;
    }

    const nextSetup = normalizeSetup();
    setStarting(true);
    resetConversation({ keepSetup: true, nextSetup });
    startConversation();
    setStarting(false);
  }

  function handleTryAgain() {
    const nextSetup = normalizeSetup();
    resetConversation({ keepSetup: true, nextSetup });
    startConversation();
  }

  return (
    <ThemeShell theme={theme} topic={setup.topic}>
      {inSetupState ? (
        <div className="grid gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-2">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Pick two models, set opening seeds, and press Enter to launch the duel.
            </p>
          </motion.div>

          <SetupForm
            setup={setup}
            patchSetup={patchSetup}
            onRun={handleRun}
            starting={starting}
            canRun={canRun}
            usage={usage}
            authReady={authReady}
            authError={authError}
          />
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="surface-card flex flex-wrap items-center justify-between gap-2 p-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {ai1Label} vs {ai2Label} · Total turns: {aiTurnCount}
            </p>
            {status === 'running' && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Streaming...</p>}
          </div>

          <section
            ref={feedRef}
            className="scrollbar-thin h-[62vh] overflow-y-auto rounded-xl border border-[var(--border)] p-3 md:p-4"
            aria-label="Conversation feed"
          >
            {transcript.length === 0 && (
              <div className="surface-card p-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                Booting both models. First turn is about to start.
              </div>
            )}

            <div className="flex flex-col gap-3">
              {transcript.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))}
            </div>
          </section>

          <DuelControls
            status={status}
            onPause={pause}
            onResume={resume}
            onStop={stop}
            onRetry={handleTryAgain}
            ai1TurnCount={ai1TurnCount}
            ai2TurnCount={ai2TurnCount}
            sideTurnLimit={sideTurnLimit}
          />
        </div>
      )}
    </ThemeShell>
  );
}
