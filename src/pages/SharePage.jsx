import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MessageCard from '../components/MessageCard';

export default function SharePage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, data: null, notFound: false });

  useEffect(() => {
    let mounted = true;

    async function fetchShare() {
      setState({ loading: true, data: null, notFound: false });
      try {
        const response = await fetch(`/api/share/${id}`);

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
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 md:px-6">
        <div className="surface-card p-4 text-sm text-[var(--text-muted)]">Loading shared transcript...</div>
      </main>
    );
  }

  if (state.notFound || !state.data) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 md:px-6">
        <div className="surface-card p-5">
          <h1 className="display-font text-3xl">Transcript Not Found</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            This share link is unavailable or has been removed.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-lg bg-[var(--ai1)] px-4 py-2 text-sm font-medium text-black"
          >
            Start your own
          </Link>
        </div>
      </main>
    );
  }

  const { topic, mode, models, turn_count: turnCount, transcript } = state.data;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-6">
      <header className="mb-5">
        <p className="small-caps text-xs text-[var(--text-muted)]">Shared Arena</p>
        <h1 className="display-font mt-1 text-3xl">{topic}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Mode: {mode} | {models?.ai1} vs {models?.ai2} | Turns: {turnCount}
        </p>
      </header>

      <section className="grid gap-3">
        {(transcript || []).map((message) => (
          <MessageCard key={message.id || `${message.turn}-${message.timestamp}`} message={message} readOnly />
        ))}
      </section>

      <div className="mt-8 pb-8 text-center">
        <Link
          to="/"
          className="inline-block rounded-lg bg-[var(--ai2)] px-4 py-2 text-sm font-medium text-black"
        >
          Start your own
        </Link>
      </div>
    </main>
  );
}
