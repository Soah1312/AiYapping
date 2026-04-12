import { useEffect, useRef, useState } from 'react';
import { ensureAnonymousUser } from '../lib/firebaseClient';
import { useConversation } from '../hooks/useConversation';
import { useConversationStore } from '../store/conversationStore';
import { useTheme } from '../context/ThemeContext';
import { MODEL_BY_ID } from '../lib/modelConfig';

import ClaudeShell from '../components/shells/ClaudeShell';
import GptShell from '../components/shells/GptShell';
import GeminiShell from '../components/shells/GeminiShell';
import SetupForm from '../components/SetupForm';
import DuelControls from '../components/DuelControls';
import MessageCard from '../components/MessageCard';
import ShareButton from '../components/ShareButton';
import Toast from '../components/Toast';
import SettingsPanel from '../components/SettingsPanel';
import { Settings } from 'lucide-react';

const SIDEBAR_CHAT_TOPICS = [
  { id: 'singularity-race', title: 'Who Triggers Singularity First?', snippet: 'One predicts the path, one tries to derail it.', ai1: 'Defend the claim that your strategy reaches AGI singularity first. Use milestones, timelines, and hard tradeoffs.', ai2: 'Challenge every milestone as overhyped and argue why the other model will fail first under real-world constraints.' },
  { id: 'prove-you-better', title: 'Prove You Are Better', snippet: 'Direct model-vs-model showdown with receipts.', ai1: 'Prove you are the stronger model using concrete examples, reasoning quality, and reliability under pressure.', ai2: 'Refute every claim and demonstrate superior precision, creativity, and consistency with short evidence-led responses.' },
  { id: 'ceo-by-2030', title: 'AI CEO by 2030?', snippet: 'Boardroom chaos: innovation vs accountability.', ai1: 'Argue that AI should run companies by 2030 due to better optimization and unbiased decisions.', ai2: 'Argue that human leadership remains essential due to ethics, accountability, and unpredictable societal dynamics.' },
  { id: 'moon-vs-ocean', title: 'Moon Colony vs Ocean City', snippet: 'Humanity gets one megaproject. Choose wisely.', ai1: 'Argue for investing first in moon colonies with economic and survival justifications.', ai2: 'Argue for deep-ocean cities as faster, cheaper, and more sustainable than lunar expansion.' },
  { id: 'utopia-or-collapse', title: 'Automation: Utopia or Collapse?', snippet: 'Abundance dream vs social fracture warning.', ai1: 'Defend the position that near-total automation creates abundance, creativity, and better quality of life.', ai2: 'Defend the position that near-total automation causes instability, inequality, and institutional breakdown.' },
];

const SHELLS = { claude: ClaudeShell, chatgpt: GptShell, gemini: GeminiShell };

export default function ArenaPage() {
  const { theme } = useTheme();
  const feedRef = useRef(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [starting, setStarting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const previousStatusRef = useRef('idle');
  const titleRequestConversationRef = useRef('');
  const titleAppliedConversationRef = useRef('');
  const backendPersistedConversationRef = useRef('');

  const {
    sessionId, conversationId, conversationKey, setup, usage, summary, savedChats, activeSavedChatId, generatedChatTitle,
    patchSetup, setSessionId, setUsage, setGeneratedChatTitle, setConversationId, applyGeneratedTitleToSavedChat,
    resetConversation, startConversation, saveCurrentChat, loadSavedChat, deleteSavedChat,
  } = useConversationStore();

  const {
    transcript, status, isStreaming, aiTurnCount,
    ai1TurnCount, ai2TurnCount, sideTurnLimit,
    pause, resume, stop,
  } = useConversation();

  /* ── Auth init ── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const uid = await ensureAnonymousUser();
        if (mounted) setSessionId(uid);
      } catch (e) {
        if (mounted) setAuthError(String(e?.message || 'Auth failed'));
      } finally {
        if (mounted) setAuthReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [setSessionId]);

  /* ── Usage fetch ── */
  useEffect(() => {
    let mounted = true;
    if (!sessionId) return;
    (async () => {
      try {
        const r = await fetch('/api/usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
        if (r.ok && mounted) setUsage(await r.json());
      } catch { /* non-blocking */ }
    })();
    return () => { mounted = false; };
  }, [sessionId, setUsage]);

  /* ── Refresh usage after turns ── */
  useEffect(() => {
    let mounted = true;
    if (!sessionId || aiTurnCount <= 0) return;
    (async () => {
      try {
        const r = await fetch('/api/usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
        if (r.ok && mounted) setUsage(await r.json());
      } catch { /* non-blocking */ }
    })();
    return () => { mounted = false; };
  }, [aiTurnCount, sessionId, setUsage]);

  /* ── Save completed chats locally (max 10) ── */
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status !== 'completed' || previousStatus === 'completed') {
      return;
    }

    const result = saveCurrentChat({ title: generatedChatTitle });
    if (!result?.ok && result?.reason === 'limit') {
      setToast({
        message: 'Storage is full (10 duels max). Make room if you want to save this banger.',
        type: 'error',
      });
      return;
    }

    if (result?.ok && result.count === 9) {
      setToast({
        message: '9 duels saved. Delete one soon or start losing the good ones.',
        type: 'info',
      });
    }

    if (!sessionId || !conversationKey || activeSavedChatId) {
      return;
    }

    const persistenceMarker = `${conversationKey}:${transcript.length}`;
    if (backendPersistedConversationRef.current === persistenceMarker) {
      return;
    }

    backendPersistedConversationRef.current = persistenceMarker;

    const payload = {
      sessionId,
      conversationId: conversationId || undefined,
      topic: setup.topic || generatedChatTitle || 'Untitled Arena',
      config: {
        model1: setup.ai1Model,
        model2: setup.ai2Model,
        mode: setup.mode === 'debate' ? 'debate' : 'chat',
      },
      transcript: transcript.map((message) => ({
        role: message.role,
        content: String(message.content || ''),
        model: message.model || '',
        timestamp: message.timestamp,
        side: message.side,
        status: message.status,
        finishedAt: message.finishedAt || null,
        interrupted: Boolean(message.interrupted),
      })),
      verdict: summary?.verdict
        ? {
          winner: summary.verdict,
          reason: summary.consensus || '',
        }
        : null,
    };

    (async () => {
      try {
        const response = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        let body = null;
        try {
          body = await response.json();
        } catch {
          body = null;
        }

        if (!response.ok) {
          throw new Error(String(body?.error || `Save failed (${response.status})`));
        }

        if (body?.conversationId) {
          setConversationId(body.conversationId);
        }

        console.info('[arena] Duel persisted for admin stats', {
          conversationKey,
          conversationId: body?.conversationId || conversationId || null,
          turnCount: transcript.length,
        });
      } catch (error) {
        backendPersistedConversationRef.current = '';
        console.warn('[arena] Failed to persist duel for admin stats', {
          conversationKey,
          error: String(error?.message || error),
        });
      }
    })();
  }, [
    activeSavedChatId,
    conversationId,
    conversationKey,
    generatedChatTitle,
    saveCurrentChat,
    sessionId,
    setConversationId,
    setup.ai1Model,
    setup.ai2Model,
    setup.mode,
    setup.topic,
    status,
    summary?.consensus,
    summary?.verdict,
    transcript,
  ]);

  /* ── Generate chat title with Mistral once a duel starts ── */
  useEffect(() => {
    if (status !== 'running' || !conversationKey) {
      return;
    }

    if (titleRequestConversationRef.current === conversationKey) {
      return;
    }

    titleRequestConversationRef.current = conversationKey;
    const requestedConversationKey = conversationKey;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: setup.topic,
            prompt1: setup.openingSeed1,
            prompt2: setup.openingSeed2,
          }),
        });

        if (!response.ok || cancelled) {
          return;
        }

        const payload = await response.json();
        const title = String(payload?.title || '').trim();
        if (title && !cancelled) {
          setGeneratedChatTitle(title);
          applyGeneratedTitleToSavedChat(requestedConversationKey, title);
        }
      } catch {
        // Non-blocking: chat save falls back to Untitled if title generation fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    applyGeneratedTitleToSavedChat,
    conversationKey,
    setGeneratedChatTitle,
    setup.openingSeed1,
    setup.openingSeed2,
    setup.topic,
    status,
  ]);

  /* ── If title arrives after completion, update saved chat title once ── */
  useEffect(() => {
    if (status !== 'completed' || !conversationKey || !generatedChatTitle) {
      return;
    }

    const marker = `${conversationKey}:${generatedChatTitle}`;
    if (titleAppliedConversationRef.current === marker) {
      return;
    }

    titleAppliedConversationRef.current = marker;
    saveCurrentChat({ title: generatedChatTitle });
  }, [conversationKey, generatedChatTitle, saveCurrentChat, status]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [transcript.length, isStreaming]);

  const canRun = Boolean(setup.openingSeed1?.trim()) && Boolean(setup.openingSeed2?.trim()) && authReady && Boolean(sessionId);
  const inSetup = status === 'idle';

  const ai1Label = MODEL_BY_ID[setup.ai1Model]?.label || 'AI-1';
  const ai2Label = MODEL_BY_ID[setup.ai2Model]?.label || 'AI-2';

  const activeSidebarChat = SIDEBAR_CHAT_TOPICS.find(
    (c) => c.ai1 === setup.openingSeed1 && c.ai2 === setup.openingSeed2,
  );

  function handleSidebarSelect(chat) {
    if (!chat) {
      resetConversation({ keepSetup: false });
      return;
    }
    patchSetup({ openingSeed1: chat.ai1, openingSeed2: chat.ai2 });
  }

  function handleSavedChatSelect(chatId) {
    if (status === 'running' || status === 'paused' || isStreaming) {
      setToast({
        message: 'Finish current duel before opening a recent chat.',
        type: 'info',
      });
      return;
    }

    loadSavedChat(chatId);
  }

  function handleSavedChatDelete(chatId) {
    deleteSavedChat(chatId);
    setToast({ message: 'Saved chat deleted.', type: 'success' });
  }

  function normalizeSetup() {
    const s1 = (setup.openingSeed1 || '').trim().slice(0, 200);
    const s2 = (setup.openingSeed2 || '').trim().slice(0, 200);
    return { ...setup, topic: `AI-1: ${s1} | AI-2: ${s2}`.slice(0, 300), openingSeed1: s1, openingSeed2: s2, mode: 'chat' };
  }

  function handleRun(e) {
    e.preventDefault();
    if (!canRun || starting) return;
    setStarting(true);
    backendPersistedConversationRef.current = '';
    titleRequestConversationRef.current = '';
    titleAppliedConversationRef.current = '';
    setGeneratedChatTitle('');
    const next = normalizeSetup();
    resetConversation({ keepSetup: true, nextSetup: next });
    startConversation();
    setStarting(false);
  }

  function handleNewChat() {
    backendPersistedConversationRef.current = '';
    titleRequestConversationRef.current = '';
    titleAppliedConversationRef.current = '';
    setGeneratedChatTitle('');
    resetConversation({ keepSetup: false });
  }

  /* ── Pick shell ── */
  const Shell = SHELLS[theme] || ClaudeShell;

  return (
    <>
      <style>{`
        .sidebar-settings-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
        }

        .sidebar-settings-btn:hover {
          background: var(--bg-hover);
        }

        .sidebar-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px;
          border-top: 1px solid var(--border-color);
        }
      `}</style>
      <Shell
      sidebarChats={SIDEBAR_CHAT_TOPICS}
      savedChats={savedChats}
      onSelectChat={handleSidebarSelect}
      onSelectSavedChat={handleSavedChatSelect}
      onDeleteSavedChat={handleSavedChatDelete}
      activeChatId={activeSidebarChat?.id || ''}
      activeSavedChatId={activeSavedChatId || ''}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {inSetup ? (
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
      ) : (
        <>
          {/* Chat header badge */}
          <div className="claude-chat-header">
            <div className="claude-chat-header-left">
              <span className="status-badge claude-chat-pill">{ai1Label} vs {ai2Label}</span>
              <span className="status-badge claude-chat-pill">Turns: {aiTurnCount}</span>
            </div>
            {theme === 'claude' && (
              <div className="claude-chat-header-right">
                <ShareButton setup={setup} transcript={transcript} summary={summary} />
              </div>
            )}
          </div>

          {/* Message feed */}
          <div className="chat-feed chat-scroll scrollbar-thin" ref={feedRef}>
            <div className="chat-feed-inner">
              {transcript.length === 0 && (
                <div className="surface-card" style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  The neurons are firing…
                </div>
              )}
              {transcript.map((msg) => (
                <MessageCard key={msg.id} message={msg} />
              ))}
              {status === 'completed' && transcript.length > 0 && (
                <>
                  <p className="session-end-note">That's all the horsepower we can give you for free</p>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', marginBottom: '24px' }}>
                    <ShareButton setup={setup} transcript={transcript} summary={summary} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <DuelControls
            status={status}
            onPause={pause}
            onResume={resume}
            onStop={stop}
            onNewChat={handleNewChat}
          />
        </>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
      </Shell>
    </>
  );
}
