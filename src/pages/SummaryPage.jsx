import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, RotateCcw, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { useConversationStore } from '../store/conversationStore';
import { useTheme } from '../context/ThemeContext';
import MessageCard from '../components/MessageCard';
import VerdictCard from '../components/VerdictCard';

async function requestVerdict({ transcript, topic, mode }) {
  const response = await fetch('/api/judge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, topic, mode }),
  });
  if (!response.ok) throw new Error('Failed to generate verdict');
  return response.json();
}

export default function SummaryPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const {
    sessionId,
    conversationId,
    setup,
    transcript,
    summary,
    shareId,
    setVerdict,
    setShareId,
    setConversationId,
    resetConversation,
  } = useConversationStore();

  const [saving, setSaving] = useState(false);
  const [judging, setJudging] = useState(false);
  const [shareState, setShareState] = useState('idle');

  useEffect(() => {
    if (!setup.topic || transcript.length === 0) navigate('/');
  }, [navigate, setup.topic, transcript.length]);

  useEffect(() => {
    let mounted = true;
    async function maybeJudge() {
      if (setup.mode !== 'debate' || summary.verdict || judging) return;
      setJudging(true);
      try {
        const verdict = await requestVerdict({ transcript, topic: setup.topic, mode: setup.mode });
        if (mounted) setVerdict(verdict);
      } catch { /* keep page usable */ } finally {
        if (mounted) setJudging(false);
      }
    }
    void maybeJudge();
    return () => { mounted = false; };
  }, [judging, setVerdict, setup.mode, setup.topic, summary.verdict, transcript]);

  async function saveConversation() {
    setSaving(true);
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          conversationId,
          transcript,
          topic: setup.topic,
          config: {
            model1: setup.ai1Model,
            model2: setup.ai2Model,
            mode: setup.mode,
          },
          verdict: summary.verdict,
        }),
      });
      if (!res.ok) throw new Error('Unable to save');
      const payload = await res.json();
      setShareId(payload.shareId);
      setConversationId(payload.conversationId || conversationId || null);
      return payload.shareId;
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    setShareState('working');
    try {
      const id = shareId || (await saveConversation());
      await navigator.clipboard.writeText(`${window.location.origin}/share/${id}`);
      setShareState('done');
    } catch {
      setShareState('error');
    }
  }

  function handleRestart() {
    resetConversation({ keepSetup: true, nextSetup: { ...setup, topic: setup.topic } });
    navigate('/');
  }

  const verdictSection = setup.mode === 'debate' && (
    <div className="mb-5">
      {judging && !summary.verdict ? (
        <div
          className="surface-card p-4 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          {theme === 'gemini' ? 'Gemini is judging… ✦' : 'Summoning the verdict…'}
        </div>
      ) : (
        <VerdictCard verdict={summary.verdict} />
      )}
    </div>
  );

  const actionButtons = (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void saveConversation()}
        disabled={saving}
        className="btn-secondary"
        style={{ fontSize: '0.75rem' }}
      >
        <Save size={13} /> {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => void handleShare()}
        className="btn-primary"
        style={{ fontSize: '0.75rem' }}
      >
        <Copy size={13} />
        {shareState === 'working' ? 'Sharing…' : shareState === 'done' ? 'Copied!' : 'Share'}
      </button>
      <button
        type="button"
        onClick={handleRestart}
        className="btn-secondary"
        style={{ fontSize: '0.75rem' }}
      >
        <RotateCcw size={13} /> Restart
      </button>
    </div>
  );

  return (
    <main
      className="mx-auto min-h-screen w-full px-4 py-8 md:px-6"
      style={{ maxWidth: theme === 'gpt' ? '48rem' : '64rem' }}
    >
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <p className="small-caps text-xs" style={{ color: 'var(--text-muted)' }}>Post-match</p>
          <h1
            className={`display-font mt-1 ${theme === 'gemini' ? 'gemini-gradient-text' : ''}`}
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
              color: theme === 'gemini' ? undefined : 'var(--text-primary)',
            }}
          >
            {theme === 'claude' ? 'The Verdict Is In.' : theme === 'gpt' ? 'Summary' : 'Session Complete ✦'}
          </h1>
          <p className="mt-2 text-sm max-w-xl" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {setup.topic}
          </p>
        </div>
        {actionButtons}
      </motion.header>

      {verdictSection}

      {summary.consensus?.consensusTriggered && (
        <section
          className="surface-card mb-5 p-4"
          style={{ borderLeft: `3px solid var(--ai1)` }}
        >
          <p className="small-caps text-xs" style={{ color: 'var(--text-muted)' }}>Auto-consensus</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            Triggered at turn {summary.consensus.turn}: {summary.consensus.reason || 'AI-2 conceded or aligned.'}
          </p>
        </section>
      )}

      <section className="grid gap-3 pb-10">
        {transcript.map((message) => (
          <MessageCard key={message.id} message={message} readOnly />
        ))}
      </section>
    </main>
  );
}
