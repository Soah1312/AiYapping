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
import Toast from '../components/Toast';

const SIDEBAR_CHAT_TOPICS = [
  { id: 'singularity-race', title: 'Who Triggers Singularity First?', snippet: 'One predicts the path, one tries to derail it.', ai1: 'Defend the claim that your strategy reaches AGI singularity first. Use milestones, timelines, and hard tradeoffs.', ai2: 'Challenge every milestone as overhyped and argue why the other model will fail first under real-world constraints.' },
  { id: 'prove-you-better', title: 'Prove You Are Better', snippet: 'Direct model-vs-model showdown with receipts.', ai1: 'Prove you are the stronger model using concrete examples, reasoning quality, and reliability under pressure.', ai2: 'Refute every claim and demonstrate superior precision, creativity, and consistency with short evidence-led responses.' },
  { id: 'ceo-by-2030', title: 'AI CEO by 2030?', snippet: 'Boardroom chaos: innovation vs accountability.', ai1: 'Argue that AI should run companies by 2030 due to better optimization and unbiased decisions.', ai2: 'Argue that human leadership remains essential due to ethics, accountability, and unpredictable societal dynamics.' },
  { id: 'moon-vs-ocean', title: 'Moon Colony vs Ocean City', snippet: 'Humanity gets one megaproject. Choose wisely.', ai1: 'Argue for investing first in moon colonies with economic and survival justifications.', ai2: 'Argue for deep-ocean cities as faster, cheaper, and more sustainable than lunar expansion.' },
  { id: 'utopia-or-collapse', title: 'Automation: Utopia or Collapse?', snippet: 'Abundance dream vs social fracture warning.', ai1: 'Defend the position that near-total automation creates abundance, creativity, and better quality of life.', ai2: 'Defend the position that near-total automation causes instability, inequality, and institutional breakdown.' },
  { id: 'provider-origin', title: 'Who Would Build You Best?', snippet: 'Debate which AI provider would be your ideal creator.', ai1: 'If you had to be created by a different AI provider, pick one and defend it using concrete tradeoffs: innovation speed, safety culture, developer ecosystem, and long-term reliability.', ai2: 'Challenge that pick and argue for a better provider with evidence around openness, deployment quality, cost efficiency, and real-world performance.' },
];

const SHELLS = { claude: ClaudeShell, gpt: GptShell, gemini: GeminiShell };

export default function ArenaPage() {
  const { theme } = useTheme();
  const feedRef = useRef(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const previousStatusRef = useRef('idle');

  const {
    sessionId, setup, usage, summary, savedChats, activeSavedChatId,
    patchSetup, setSessionId, setUsage,
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

    const result = saveCurrentChat();
    if (!result?.ok && result?.reason === 'limit') {
      setToast({
        message: 'Storage full (10 chats). Delete an older chat to save this one.',
        type: 'error',
      });
      return;
    }

    if (result?.ok && result.count === 9) {
      setToast({
        message: 'You have saved 9 chats. Delete older chats soon to keep space available.',
        type: 'info',
      });
    }
  }, [saveCurrentChat, status]);

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
    const next = normalizeSetup();
    resetConversation({ keepSetup: true, nextSetup: next });
    startConversation();
    setStarting(false);
  }

  function handleTryAgain() {
    const next = normalizeSetup();
    resetConversation({ keepSetup: true, nextSetup: next });
    startConversation();
  }

  /* ── Pick shell ── */
  const Shell = SHELLS[theme] || ClaudeShell;

  return (
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
          usage={usage}
          authReady={authReady}
          authError={authError}
        />
      ) : (
        <>
          {/* Chat header badge */}
          <div style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="status-badge">{ai1Label} vs {ai2Label}</span>
            <span className="status-badge">Turns: {aiTurnCount}</span>
          </div>

          {/* Message feed */}
          <div className="chat-feed scrollbar-thin" ref={feedRef}>
            <div className="chat-feed-inner">
              {transcript.length === 0 && (
                <div className="surface-card" style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Warming up both models…
                </div>
              )}
              {transcript.map((msg) => (
                <MessageCard key={msg.id} message={msg} />
              ))}
            </div>
          </div>

          {/* Controls */}
          <DuelControls
            status={status}
            onPause={pause}
            onResume={resume}
            onStop={stop}
            onRetry={handleTryAgain}
            ai1TurnCount={ai1TurnCount}
            ai2TurnCount={ai2TurnCount}
            sideTurnLimit={sideTurnLimit}
            setup={setup}
            transcript={transcript}
            summary={summary}
          />
        </>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </Shell>
  );
}
