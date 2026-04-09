import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, RotateCcw, Save } from 'lucide-react';
import { useConversationStore } from '../store/conversationStore';
import MessageCard from '../components/MessageCard';
import VerdictCard from '../components/VerdictCard';

async function requestVerdict({ transcript, topic, mode }) {
  const response = await fetch('/api/judge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, topic, mode }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate verdict');
  }

  return response.json();
}

export default function SummaryPage() {
  const navigate = useNavigate();
  const {
    sessionId,
    setup,
    transcript,
    summary,
    shareId,
    setVerdict,
    setShareId,
    resetConversation,
  } = useConversationStore();

  const [saving, setSaving] = useState(false);
  const [judging, setJudging] = useState(false);
  const [shareState, setShareState] = useState('idle');

  const aiTranscript = useMemo(
    () => transcript.filter((message) => message.side === 'ai1' || message.side === 'ai2'),
    [transcript],
  );

  useEffect(() => {
    if (!setup.topic || transcript.length === 0) {
      navigate('/');
    }
  }, [navigate, setup.topic, transcript.length]);

  useEffect(() => {
    let mounted = true;

    async function maybeJudge() {
      if (setup.mode !== 'debate' || summary.verdict || judging) {
        return;
      }

      setJudging(true);
      try {
        const verdict = await requestVerdict({
          transcript,
          topic: setup.topic,
          mode: setup.mode,
        });
        if (mounted) {
          setVerdict(verdict);
        }
      } catch {
        // Keep page usable even if judge endpoint is unavailable.
      } finally {
        if (mounted) {
          setJudging(false);
        }
      }
    }

    void maybeJudge();

    return () => {
      mounted = false;
    };
  }, [judging, setVerdict, setup.mode, setup.topic, summary.verdict, transcript]);

  async function saveConversation() {
    setSaving(true);
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          transcript,
          topic: setup.topic,
          mode: setup.mode,
          models: {
            ai1: setup.ai1Model,
            ai2: setup.ai2Model,
            persona1: setup.persona1 || setup.ai1Model,
            persona2: setup.persona2 || setup.ai2Model,
          },
          turnCount: aiTranscript.length,
          verdict: summary.verdict,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to save conversation');
      }

      const payload = await response.json();
      setShareId(payload.shareId);
      return payload.shareId;
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    setShareState('working');
    try {
      const id = shareId || (await saveConversation());
      const url = `${window.location.origin}/share/${id}`;
      await navigator.clipboard.writeText(url);
      setShareState('done');
    } catch {
      setShareState('error');
    }
  }

  function handleRestart() {
    resetConversation({ keepSetup: true, nextSetup: { ...setup, topic: setup.topic } });
    navigate('/');
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="small-caps text-xs text-[var(--text-muted)]">Post-match</p>
          <h1 className="display-font mt-1 text-3xl">Summary</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{setup.topic}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveConversation()}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--ai1)] px-3 py-2 text-xs font-medium text-black"
          >
            <Copy size={14} />
            {shareState === 'working' ? 'Sharing...' : shareState === 'done' ? 'Copied Link' : 'Share'}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs"
          >
            <RotateCcw size={14} /> Restart
          </button>
        </div>
      </header>

      {setup.mode === 'debate' && (
        <div className="mb-4">
          {judging && !summary.verdict ? (
            <div className="surface-card p-4 text-sm text-[var(--text-muted)]">Generating verdict...</div>
          ) : (
            <VerdictCard verdict={summary.verdict} />
          )}
        </div>
      )}

      {summary.consensus?.consensusTriggered && (
        <section className="surface-card mb-4 p-4">
          <p className="small-caps text-xs text-[var(--text-muted)]">Auto-consensus</p>
          <p className="mt-2 text-sm">
            Triggered at turn {summary.consensus.turn}: {summary.consensus.reason || 'AI-2 conceded or aligned.'}
          </p>
        </section>
      )}

      <section className="grid gap-3 pb-8">
        {transcript.map((message) => (
          <MessageCard key={message.id} message={message} readOnly />
        ))}
      </section>
    </main>
  );
}
