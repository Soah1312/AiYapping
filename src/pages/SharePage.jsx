import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import MessageCard from '../components/MessageCard';

export default function SharePage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, data: null, notFound: false });

  useEffect(() => {
    let mounted = true;

    async function fetchShare() {
      setState({ loading: true, data: null, notFound: false });
      try {
        const response = await fetch(`/api/share?id=${encodeURIComponent(id || '')}`);

        if (response.status === 404) {
          if (mounted) {
            setState({ loading: false, data: null, notFound: true });
          }
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load share');
        }

        const payload = await response.json();
        if (mounted) {
          setState({ loading: false, data: payload, notFound: false });
        }
      } catch {
        if (mounted) {
          setState({ loading: false, data: null, notFound: true });
        }
      }
    }

    void fetchShare();

    return () => {
      mounted = false;
    };
  }, [id]);

  if (state.loading) {
    return (
      <main className="h-screen overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
          <div className="surface-card p-4 text-sm text-[var(--text-muted)]">Pulling up the receipt...</div>
        </div>
      </main>
    );
  }

  if (state.notFound || !state.data) {
    return (
      <main className="h-screen overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
          <div className="surface-card p-5">
            <h1 className="display-font text-3xl">Link Expired or Never Existed</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Either the share link got nuked or you\'re looking for something that was never here.
            </p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--ai1)] px-4 py-2 text-sm font-medium text-black"
            >
              <Plus size={14} />
              Start Your Own Duel
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { topic, config, turnCount, transcript } = state.data;

  return (
    <main className="h-screen overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
        <header className="sticky top-0 z-20 mb-5 border-b border-[var(--border)] bg-[var(--bg)]/95 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="small-caps text-xs text-[var(--text-muted)]">Battle Transcript</p>
              <h1 className="display-font mt-1 text-2xl md:text-3xl">{topic}</h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Mode: {config?.mode} | {config?.model1} vs {config?.model2} | Turns: {turnCount}
              </p>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
            >
              <Plus size={14} />
              Start New Chat
            </Link>
          </div>
        </header>

        <section className="grid gap-3">
          {(transcript || []).map((message) => (
            <MessageCard key={message.id || `${message.turn}-${message.timestamp}`} message={message} readOnly />
          ))}
        </section>

        <div className="mt-8 pb-8 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--ai2)] px-4 py-2 text-sm font-medium text-black"
          >
            <ArrowLeft size={14} />
            Back to the Arena
          </Link>
        </div>
      </div>
    </main>
  );
}
