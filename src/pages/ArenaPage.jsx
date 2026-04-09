import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '../hooks/useConversation';
import { useConversationStore } from '../store/conversationStore';
import MessageCard from '../components/MessageCard';
import ConversationControls from '../components/ConversationControls';

export default function ArenaPage() {
  const navigate = useNavigate();
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
    if (!setup.topic) {
      navigate('/');
    }
  }, [navigate, setup.topic]);

  useEffect(() => {
    if (status === 'completed') {
      navigate('/summary');
    }
  }, [navigate, status]);

  useEffect(() => {
    if (!feedRef.current) {
      return;
    }

    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [transcript.length]);

  const modeLabel = useMemo(() => (setup.mode === 'debate' ? 'Debate' : 'Chat'), [setup.mode]);

  function handleRedirectSubmit(event) {
    event.preventDefault();
    if (!redirectDraft.trim()) {
      return;
    }

    injectRedirectNote(redirectDraft.trim());
    setShowRedirect(false);
  }

  function handleStop() {
    stop();
    navigate('/summary');
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b12]/90 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 md:px-6">
          <p className="small-caps text-xs text-[var(--text-muted)]">AI Arena Live</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <h1 className="display-font text-lg md:text-2xl">{setup.topic}</h1>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-white/15 px-2 py-1">{modeLabel}</span>
              <span className="rounded-full border border-white/15 px-2 py-1">Turns: {aiTurnCount}</span>
            </div>
          </div>
        </div>
      </header>

      <section
        ref={feedRef}
        className="scrollbar-thin mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 pb-36 md:px-6"
      >
        {transcript.length === 0 && (
          <div className="surface-card p-4 text-sm text-[var(--text-muted)]">
            Initializing arena. First turn should stream within a couple of seconds.
          </div>
        )}

        {transcript.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            onRetry={retryLatestInterrupted}
          />
        ))}
      </section>

      {showRedirect && (
        <form
          onSubmit={handleRedirectSubmit}
          className="fixed inset-x-0 bottom-[5.25rem] z-20 mx-auto w-[calc(100%-1rem)] max-w-5xl rounded-xl border border-white/10 bg-[#101018] p-3 md:w-[calc(100%-3rem)]"
        >
          <label htmlFor="redirect" className="small-caps text-xs text-[var(--text-muted)]">
            Redirect Note
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="redirect"
              value={redirectDraft}
              onChange={(event) => setRedirectDraft(event.target.value.slice(0, 300))}
              className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm"
              placeholder="Inject a new direction for both AIs"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--ai2)] px-3 py-2 text-xs font-medium text-black"
            >
              Inject
            </button>
          </div>
        </form>
      )}

      <ConversationControls
        status={status}
        turnCount={aiTurnCount}
        allowManualStop={setup.endConditions.manualStop}
        onPause={pause}
        onResume={resume}
        onStop={handleStop}
        onOpenRedirect={() => setShowRedirect((prev) => !prev)}
      />
    </main>
  );
}
