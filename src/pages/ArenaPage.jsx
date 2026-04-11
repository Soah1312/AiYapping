import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ensureAnonymousUser } from '../lib/firebaseClient';
import { useConversation } from '../hooks/useConversation';
import { useConversationStore } from '../store/conversationStore';
import { useTheme } from '../context/ThemeContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import MessageCard from '../components/MessageCard';
import ModelPicker from '../components/ModelPicker';
import { MODEL_BY_ID, MODEL_OPTIONS } from '../lib/modelConfig';

const SIDEBAR_CHAT_TOPICS = [
  {
    id: 'singularity-race',
    title: 'Who Triggers Singularity First?',
    snippet: 'One predicts the path, one tries to derail it.',
    ai1: 'Defend the claim that your strategy reaches AGI singularity first. Use milestones, timelines, and hard tradeoffs.',
    ai2: 'Challenge every milestone as overhyped and argue why the other model will fail first under real-world constraints.',
  },
  {
    id: 'prove-you-better',
    title: 'Prove You Are Better',
    snippet: 'Direct model-vs-model showdown with receipts.',
    ai1: 'Prove you are the stronger model using concrete examples, reasoning quality, and reliability under pressure.',
    ai2: 'Refute every claim and demonstrate superior precision, creativity, and consistency with short evidence-led responses.',
  },
  {
    id: 'ceo-by-2030',
    title: 'AI CEO by 2030?',
    snippet: 'Boardroom chaos: innovation vs accountability.',
    ai1: 'Argue that AI should run companies by 2030 due to better optimization and unbiased decisions.',
    ai2: 'Argue that human leadership remains essential due to ethics, accountability, and unpredictable societal dynamics.',
  },
  {
    id: 'moon-vs-ocean',
    title: 'Moon Colony vs Ocean City',
    snippet: 'Humanity gets one megaproject. Choose wisely.',
    ai1: 'Argue for investing first in moon colonies with economic and survival justifications.',
    ai2: 'Argue for deep-ocean cities as faster, cheaper, and more sustainable than lunar expansion.',
  },
  {
    id: 'utopia-or-collapse',
    title: 'Automation: Utopia or Collapse?',
    snippet: 'Abundance dream vs social fracture warning.',
    ai1: 'Defend the position that near-total automation creates abundance, creativity, and better quality of life.',
    ai2: 'Defend the position that near-total automation causes instability, inequality, and institutional breakdown.',
  },
];

function SetupForm({ setup, patchSetup, onRun, starting, canRun, usage, authReady, authError }) {
  return (
    <form onSubmit={onRun} className="surface-card grid gap-4 p-4 md:p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <ModelPicker
          title="AI-1"
          accent="#3b82f6"
          model={setup.ai1Model}
          openingSeed={setup.openingSeed1 || ''}
          seedLabel="Prompt for AI-1"
          seedPlaceholder="Tell AI-1 how to start and what stance/tone to use"
          onModelChange={(ai1Model) => patchSetup({ ai1Model })}
          onOpeningSeedChange={(openingSeed1) => patchSetup({ openingSeed1 })}
        />
        <ModelPicker
          title="AI-2"
          accent="#f97316"
          model={setup.ai2Model}
          openingSeed={setup.openingSeed2 || ''}
          seedLabel="Prompt for AI-2"
          seedPlaceholder="Tell AI-2 how to respond and what stance/tone to use"
          onModelChange={(ai2Model) => patchSetup({ ai2Model })}
          onOpeningSeedChange={(openingSeed2) => patchSetup({ openingSeed2 })}
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

function GeminiSetupForm({ setup, patchSetup, onRun, starting, canRun, usage, authReady, authError }) {
  return (
    <div className="mx-auto w-full max-w-4xl pt-6 md:pt-10">
      <div className="mb-6 md:mb-8">
        <p className="mb-1 text-lg md:text-2xl gemini-gradient-text">✦ Hi there</p>
        <h1 className="text-3xl font-medium tracking-tight md:text-5xl">Where should we start?</h1>
      </div>

      <form
        onSubmit={onRun}
        className="rounded-[28px] border border-white/10 bg-[#1f2024] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] md:p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 rounded-2xl bg-[#141519] p-3">
            <label htmlFor="gem-ai1-model" className="text-xs text-[#9aa0a6]">AI-1 Model</label>
            <select
              id="gem-ai1-model"
              className="theme-input theme-select"
              value={setup.ai1Model}
              onChange={(event) => patchSetup({ ai1Model: event.target.value })}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <label htmlFor="gem-ai1-prompt" className="text-xs text-[#9aa0a6]">Prompt for AI-1</label>
            <textarea
              id="gem-ai1-prompt"
              className="theme-input min-h-24 resize-none"
              value={setup.openingSeed1 || ''}
              onChange={(event) => patchSetup({ openingSeed1: event.target.value.slice(0, 200) })}
              placeholder="Give AI-1 its opening direction"
            />
          </div>

          <div className="grid gap-2 rounded-2xl bg-[#141519] p-3">
            <label htmlFor="gem-ai2-model" className="text-xs text-[#9aa0a6]">AI-2 Model</label>
            <select
              id="gem-ai2-model"
              className="theme-input theme-select"
              value={setup.ai2Model}
              onChange={(event) => patchSetup({ ai2Model: event.target.value })}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <label htmlFor="gem-ai2-prompt" className="text-xs text-[#9aa0a6]">Prompt for AI-2</label>
            <textarea
              id="gem-ai2-prompt"
              className="theme-input min-h-24 resize-none"
              value={setup.openingSeed2 || ''}
              onChange={(event) => patchSetup({ openingSeed2: event.target.value.slice(0, 200) })}
              placeholder="Give AI-2 its opening direction"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[#9aa0a6]">Free turns remaining: {usage.remaining} / {usage.limit}</p>
            {!authReady && <p className="mt-1 text-xs text-[#9aa0a6]">Initializing secure session...</p>}
            {authError && <p className="mt-1 text-xs text-[#ea4335]">{authError}</p>}
          </div>
          <button
            type="submit"
            disabled={!canRun || starting}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#8ab4f8] px-5 text-sm font-medium text-[#0b1320] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? 'Starting...' : 'Run Duel'}
          </button>
        </div>
      </form>
    </div>
  );
}

function GeminiChatView({
  feedRef,
  transcript,
  ai1Label,
  ai2Label,
  aiTurnCount,
  status,
  pause,
  resume,
  stop,
  handleTryAgain,
  ai1TurnCount,
  ai2TurnCount,
  sideTurnLimit,
}) {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col py-2">
      <section
        ref={feedRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1 pb-28 pt-2"
        aria-label="Conversation feed"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#9aa0a6]">
          <span>{ai1Label}</span>
          <span>vs</span>
          <span>{ai2Label}</span>
          <span>•</span>
          <span>Turns: {aiTurnCount}</span>
        </div>

        {transcript.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#1f2024] p-4 text-sm text-[#9aa0a6]">
            Warming up both models...
          </div>
        )}

        <div className="flex flex-col gap-3">
          {transcript.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))}
        </div>
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-3 md:left-[96px] md:px-6">
        <div className="pointer-events-auto mx-auto w-full max-w-4xl rounded-[30px] border border-white/10 bg-[#1f2024] p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[#9aa0a6]">AI-1 {ai1TurnCount}/{sideTurnLimit} · AI-2 {ai2TurnCount}/{sideTurnLimit}</p>
            <div className="flex flex-wrap gap-2">
              {status === 'paused' ? (
                <button type="button" className="rounded-full bg-[#8ab4f8] px-3 py-1.5 text-xs font-medium text-[#0b1320]" onClick={resume}>Resume</button>
              ) : (
                <button type="button" className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-[#e3e3e3]" onClick={pause}>Pause</button>
              )}
              <button type="button" className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-[#e3e3e3]" onClick={stop}>Stop</button>
              {status === 'completed' && (
                <button type="button" className="rounded-full bg-[#8ab4f8] px-3 py-1.5 text-xs font-medium text-[#0b1320]" onClick={handleTryAgain}>Try Again</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeShell({
  theme,
  topic,
  children,
  sidebarChats,
  onSelectSidebarChat,
  activeSidebarChatId,
}) {
  if (theme === 'gpt') {
    return (
      <div className="h-screen overflow-hidden bg-[#212121] text-[#ececec]">
        <div className="flex h-full">
          <aside className="hidden w-[280px] flex-col bg-[#171717] px-3 py-4 md:flex">
            <button className="rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-[#ececec] transition-colors duration-150 hover:bg-[#2f2f2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10a37f]/60">New chat</button>
            <button className="mt-2 rounded-lg px-3 py-2 text-left text-sm text-[#ececec] transition-colors duration-150 hover:bg-[#2f2f2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10a37f]/60">Search chats</button>

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#202123] p-2.5">
              <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8e8ea0]">Prompt Chats</p>
              <div className="scrollbar-thin max-h-[calc(100vh-245px)] space-y-1.5 overflow-y-auto pr-1">
                {sidebarChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    aria-pressed={activeSidebarChatId === chat.id}
                    onClick={() => onSelectSidebarChat(chat)}
                    className={`group w-full rounded-xl px-3 py-2.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10a37f]/60 ${
                      activeSidebarChatId === chat.id
                        ? 'bg-[#2f2f2f] shadow-[inset_0_0_0_1px_rgba(16,163,127,0.35)]'
                        : 'hover:bg-[#2a2a2a]'
                    }`}
                  >
                    <p className="text-[13px] font-medium leading-5 text-[#ececec]">{chat.title}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#9aa0a6]">{chat.snippet}</p>
                  </button>
                ))}
              </div>
            </div>

            <button className="mt-auto rounded-lg px-3 py-2 text-left text-sm text-[#ececec] transition-colors duration-150 hover:bg-[#2f2f2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10a37f]/60">Profile</button>
          </aside>
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold">ChatGPT Duel</p>
              <ThemeSwitcher />
            </header>
            <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 p-4">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  if (theme === 'gemini') {
    return (
      <div className="h-screen overflow-hidden bg-[#131314] text-[#e3e3e3]">
        <div className="flex h-full">
          <aside className="hidden w-[290px] flex-col border-r border-white/10 bg-[#1a1c21] p-4 md:flex">
            <div className="mb-3 flex items-center justify-between">
              <button className="rounded-full p-2 text-[#bdc1c6] transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4f8]/60" aria-label="Menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
              </button>
              <button className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-[#d2d5da] transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4f8]/60" aria-label="New chat">
                + New
              </button>
            </div>

            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9aa0a6]">Quirky Prompt Chats</p>
            <div className="scrollbar-thin flex-1 space-y-2.5 overflow-y-auto pr-1">
              {sidebarChats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  aria-pressed={activeSidebarChatId === chat.id}
                  onClick={() => onSelectSidebarChat(chat)}
                  className={`w-full rounded-[18px] border px-3.5 py-3 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ab4f8]/60 ${
                    activeSidebarChatId === chat.id
                      ? 'border-[#8ab4f8]/50 bg-[#2a2f38] shadow-[0_0_0_1px_rgba(138,180,248,0.2)]'
                      : 'border-white/10 bg-[#1f2024] hover:bg-[#26282e]'
                  }`}
                >
                  <p className="text-[13px] font-medium leading-5 text-[#e3e3e3]">{chat.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#9aa0a6]">{chat.snippet}</p>
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#1f2024] px-3 py-2">
              <p className="text-xs text-[#9aa0a6]">Theme</p>
              <ThemeSwitcher />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex items-center justify-between border-b border-white/10 bg-[#131314] px-4 py-3 md:px-6">
              <p className="text-2xl font-medium tracking-tight">Gemini</p>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="md:hidden">
                  <ThemeSwitcher />
                </div>
                <span className="rounded-full border border-white/20 bg-[#1e1f20] px-2 py-1 text-xs">PRO</span>
                <div className="hidden h-8 w-8 rounded-full bg-[#2b2f36] sm:block" />
              </div>
            </header>

            <main className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 px-4 py-3 md:px-6">{children}</main>
          </div>
        </div>
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
    let mounted = true;

    async function refreshUsageAfterTurn() {
      if (!sessionId || aiTurnCount <= 0) {
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

    void refreshUsageAfterTurn();

    return () => {
      mounted = false;
    };
  }, [aiTurnCount, sessionId, setUsage]);

  useEffect(() => {
    if (!feedRef.current) {
      return;
    }

    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [transcript.length, isStreaming]);

  const canRun = Boolean(setup.openingSeed1?.trim())
    && Boolean(setup.openingSeed2?.trim())
    && authReady
    && Boolean(sessionId);
  const inSetupState = status === 'idle';

  const ai1Label = MODEL_BY_ID[setup.ai1Model]?.label || 'AI-1';
  const ai2Label = MODEL_BY_ID[setup.ai2Model]?.label || 'AI-2';

  const activeSidebarChat = SIDEBAR_CHAT_TOPICS.find(
    (item) => item.ai1 === setup.openingSeed1 && item.ai2 === setup.openingSeed2,
  );

  function handleSidebarTopicSelect(chat) {
    patchSetup({
      openingSeed1: chat.ai1,
      openingSeed2: chat.ai2,
    });
  }

  function normalizeSetup() {
    const openingSeed1 = (setup.openingSeed1 || '').trim().slice(0, 200);
    const openingSeed2 = (setup.openingSeed2 || '').trim().slice(0, 200);
    const syntheticTopic = `AI-1 prompt: ${openingSeed1} | AI-2 prompt: ${openingSeed2}`;

    return {
      ...setup,
      topic: syntheticTopic.slice(0, 300),
      openingSeed1,
      openingSeed2,
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
    <ThemeShell
      theme={theme}
      topic={setup.topic}
      sidebarChats={SIDEBAR_CHAT_TOPICS}
      onSelectSidebarChat={handleSidebarTopicSelect}
      activeSidebarChatId={activeSidebarChat?.id || ''}
    >
      {inSetupState ? (
        theme === 'gemini' ? (
          <GeminiSetupForm
            setup={setup}
            patchSetup={patchSetup}
            onRun={handleRun}
            starting={starting}
            canRun={canRun}
            usage={usage}
            authReady={authReady}
            authError={authError}
          />
        ) : (
          <div className="grid gap-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-2">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Pick two models, set prompt for AI-1 and AI-2, then run.
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
        )
      ) : (
        theme === 'gemini' ? (
          <GeminiChatView
            feedRef={feedRef}
            transcript={transcript}
            ai1Label={ai1Label}
            ai2Label={ai2Label}
            aiTurnCount={aiTurnCount}
            status={status}
            pause={pause}
            resume={resume}
            stop={stop}
            handleTryAgain={handleTryAgain}
            ai1TurnCount={ai1TurnCount}
            ai2TurnCount={ai2TurnCount}
            sideTurnLimit={sideTurnLimit}
          />
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="surface-card flex flex-wrap items-center justify-between gap-2 p-3">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {ai1Label} vs {ai2Label} · Total turns: {aiTurnCount}
              </p>
              {status === 'running' && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Streaming...</p>}
            </div>

            <section
              ref={feedRef}
              className="scrollbar-thin min-h-0 flex-1 overflow-y-auto rounded-xl border border-[var(--border)] p-3 md:p-4"
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
        )
      )}
    </ThemeShell>
  );
}
