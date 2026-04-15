import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ensureAnonymousUser } from '../lib/firebaseClient';
import { useConversation } from '../hooks/useConversation';
import { useConversationStore } from '../store/conversationStore';
import { useTheme } from '../context/ThemeContext';
import {
  MODEL_BY_ID,
  ULTRA_CHAOS_OPUS_MODEL_ID,
  ULTRA_CHAOS_SONNET_MODEL_ID,
} from '../lib/modelConfig';

import ClaudeShell from '../components/shells/ClaudeShell';
import GptShell from '../components/shells/GptShell';
import GeminiShell from '../components/shells/GeminiShell';
import SetupForm from '../components/SetupForm';
import DuelControls from '../components/DuelControls';
import MessageCard from '../components/MessageCard';
import ShareButton from '../components/ShareButton';
import Toast from '../components/Toast';
import VerdictCard from '../components/VerdictCard';
import VerdictButton from '../components/VerdictButton';
import TypingIndicator from '../components/TypingIndicator';

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
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [verdictByConversation, setVerdictByConversation] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const previousStatusRef = useRef('idle');
  const titleRequestConversationRef = useRef('');
  const titleAppliedConversationRef = useRef('');
  const backendPersistedConversationRef = useRef('');

  const {
    sessionId,
    conversationId,
    conversationKey,
    setup,
    summary,
    savedChats,
    activeSavedChatId,
    generatedChatTitle,
    chaosMode,
    ultraChaosMode,
    patchSetup, setSessionId, setGeneratedChatTitle, setConversationId, applyGeneratedTitleToSavedChat,
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
      const titleDebug = {
        conversationKey: requestedConversationKey,
        topicLength: String(setup.topic || '').length,
        prompt1Length: String(setup.openingSeed1 || '').length,
        prompt2Length: String(setup.openingSeed2 || '').length,
      };

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

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          console.error('[arena/title] Request failed before payload parse.', {
            ...titleDebug,
            status: response.status,
          });
          return;
        }

        const payload = await response.json();
        const title = String(payload?.title || '').trim();

        console.info('[arena/title] Title generation result', {
          ...titleDebug,
          requestId: payload?.requestId || null,
          source: payload?.source || 'unknown',
          fallback: Boolean(payload?.fallback),
          hasTitle: Boolean(title),
          upstreamError: payload?.error || null,
        });

        if (title && !cancelled) {
          setGeneratedChatTitle(title);
          applyGeneratedTitleToSavedChat(requestedConversationKey, title);
        }
      } catch (error) {
        console.error('[arena/title] Title generation threw client-side error.', {
          ...titleDebug,
          error: String(error?.message || error),
        });
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

  const canRun = Boolean(setup.openingSeed1?.trim()) && Boolean(setup.openingSeed2?.trim()) && authReady && Boolean(sessionId);
  const inSetup = status === 'idle';
  const isDuelComplete = status === 'completed' && transcript.length > 0;
  const activeVerdict = conversationKey ? verdictByConversation[conversationKey] : null;
  const hasActiveVerdict = Boolean(
    typeof activeVerdict === 'string'
      ? activeVerdict.trim()
      : String(activeVerdict?.verdict || '').trim(),
  );

  useEffect(() => {
    if (inSetup) {
      setShowJumpButton(false);
      return;
    }

    const el = feedRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowJumpButton(distanceFromBottom > 300);
    };

    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [inSetup]);

  useEffect(() => {
    if (inSetup) return;
    const el = feedRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpButton(distanceFromBottom > 300);
  }, [inSetup, transcript.length, isStreaming]);

  const ai1Label = MODEL_BY_ID[setup.ai1Model]?.label || 'AI-1';
  const ai2Label = MODEL_BY_ID[setup.ai2Model]?.label || 'AI-2';
  const activeSavedChat = activeSavedChatId ? savedChats.find((chat) => chat.id === activeSavedChatId) : null;
  const shareChatTitle = String(activeSavedChat?.title || generatedChatTitle || setup.topic || 'Untitled Arena').trim();
  const conversationDisplayTitle = shareChatTitle || 'Untitled Arena';

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
    const topic = String(setup.topic || '').trim().slice(0, 120);
    return {
      ...setup,
      topic,
      openingSeed1: s1,
      openingSeed2: s2,
      mode: 'chat',
      ai1Model: ultraChaosMode ? ULTRA_CHAOS_OPUS_MODEL_ID : setup.ai1Model,
      ai2Model: ultraChaosMode ? ULTRA_CHAOS_SONNET_MODEL_ID : setup.ai2Model,
    };
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

  function handleVerdictReceived(result) {
    if (!conversationKey) {
      return;
    }

    const verdictText = String(result?.verdict || '').trim();
    if (!verdictText) {
      return;
    }

    const parsedScores = Array.isArray(result?.scores)
      ? result.scores
          .map((score) => ({
            name: String(score?.name || '').trim(),
            score: Number(score?.score),
          }))
          .filter((score) => score.name && Number.isFinite(score.score))
      : [];

    setVerdictByConversation((state) => ({
      ...state,
      [conversationKey]: {
        verdict: verdictText,
        winner: String(result?.winner || '').trim(),
        scores: parsedScores,
      },
    }));
  }

  function jumpToLatest() {
    const el = feedRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth',
    });
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
          margin-top: auto;
          padding: 12px;
          border-top: 1px solid var(--border-color);
          flex-shrink: 0;
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
    >
      {inSetup ? (
        <SetupForm
          setup={setup}
          patchSetup={patchSetup}
          onRun={handleRun}
          starting={starting}
          canRun={canRun}
          authReady={authReady}
          authError={authError}
        />
      ) : (
        <>
          {/* Chat header badge */}
          <div className="claude-chat-header">
            <div className="claude-chat-header-left">
              <span className="status-badge claude-chat-pill">{ai1Label} vs {ai2Label}</span>
              {ultraChaosMode
                ? <span className="chaos-badge chaos-badge--ultra">ULTRA CHAOS</span>
                : chaosMode && <span className="chaos-badge">CHAOS</span>}
              <span className="status-badge claude-chat-pill">Turns: {aiTurnCount}</span>
            </div>
            {theme === 'claude' && !activeSavedChatId && (
              <div className="claude-chat-header-right">
                <ShareButton setup={setup} transcript={transcript} summary={summary} chatTitle={shareChatTitle} />
              </div>
            )}
          </div>

          {/* Message feed */}
          <div className="chat-feed chat-scroll scrollbar-thin" ref={feedRef}>
            <div className="chat-feed-inner">
              <div className="conversation-title-strip" title={conversationDisplayTitle}>
                <span className="conversation-title-kicker">Chat name</span>
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={conversationDisplayTitle}
                    initial={{ opacity: 0, filter: 'blur(4px)', y: 2 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    exit={{ opacity: 0, filter: 'blur(4px)', y: -2 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="conversation-title-text"
                  >
                    {conversationDisplayTitle}
                  </motion.h2>
                </AnimatePresence>
              </div>
              {transcript.length === 0 && (
                <motion.div layout className="surface-card flex items-center gap-2" style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <span className="font-medium">Initializing Arena</span>
                  <TypingIndicator color="var(--text-muted)" />
                </motion.div>
              )}
              {transcript.map((msg) => (
                <MessageCard key={msg.id} message={msg} />
              ))}
              {isDuelComplete && (
                <>
                  <p className="session-end-note">That's all the horsepower we can give you for free</p>
                  <div className="post-duel-actions">
                    <VerdictButton
                      transcript={transcript}
                      ai1Name={ai1Label}
                      ai2Name={ai2Label}
                      topic={setup.topic || generatedChatTitle || 'Untitled Arena'}
                      onVerdictReceived={handleVerdictReceived}
                      hasVerdict={hasActiveVerdict}
                    />
                    <ShareButton setup={setup} transcript={transcript} summary={summary} chatTitle={shareChatTitle} />
                  </div>
                  {hasActiveVerdict && <VerdictCard verdict={activeVerdict} />}
                </>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showJumpButton && !isDuelComplete && (
              <motion.div
                className="jump-to-latest-anchor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  onClick={jumpToLatest}
                  className="jump-to-latest"
                >
                  ↓ Latest
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
