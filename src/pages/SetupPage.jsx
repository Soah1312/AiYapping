import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ModelPicker from '../components/ModelPicker';
import ModeToggle from '../components/ModeToggle';
import { ensureAnonymousUser } from '../lib/firebaseClient';
import { useConversationStore } from '../store/conversationStore';

export default function SetupPage() {
  const navigate = useNavigate();
  const {
    sessionId,
    setup,
    usage,
    resetConversation,
    startConversation,
    setSessionId,
    setConversationId,
    setUsage,
  } = useConversationStore();

  const [form, setForm] = useState(setup);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    setForm(setup);
  }, [setup]);

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
          setAuthError(String(error?.message || 'Failed to initialize anonymous session.'));
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

      setLoadingUsage(true);
      try {
        const response = await fetch('/api/usage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
        // Non-blocking in local dev without backend.
      } finally {
        if (mounted) {
          setLoadingUsage(false);
        }
      }
    }

    void fetchUsage();

    return () => {
      mounted = false;
    };
  }, [sessionId, setUsage]);

  const isFreeQuotaBlocked = usage.remaining <= 0;

  function patchForm(patch) {
    setForm((prev) => ({
      ...prev,
      ...patch,
      endConditions: {
        ...prev.endConditions,
        ...(patch.endConditions || {}),
      },
    }));
  }

  async function handleStart(event) {
    event.preventDefault();

    if (!form.topic.trim() || isFreeQuotaBlocked || !sessionId) {
      return;
    }

    const nextSetup = {
      ...form,
      topic: form.topic.trim().slice(0, 300),
      persona1: form.persona1.trim(),
      persona2: form.persona2.trim(),
    };

    setStarting(true);
    resetConversation({ keepSetup: true, nextSetup });

    try {
      const initResponse = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialize: true,
          sessionId,
          topic: nextSetup.topic,
          config: {
            model1: nextSetup.ai1Model,
            model2: nextSetup.ai2Model,
            mode: nextSetup.mode,
          },
        }),
      });

      if (initResponse.ok) {
        const payload = await initResponse.json();
        setConversationId(payload.conversationId || null);
      }
    } catch {
      setConversationId(null);
    }

    startConversation();
    navigate('/arena');
    setStarting(false);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 md:px-6">
      <div className="mb-10">
        <p className="small-caps text-xs text-[var(--text-muted)]">Mission Control</p>
        <h1 className="display-font mt-2 text-4xl md:text-6xl">AI Arena</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--text-muted)]">
          Watch two AI models debate, challenge, and reason in real time. You set the topic. You direct the flow.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleStart}>
        <div className="grid gap-4 md:grid-cols-2">
          <ModelPicker
            title="AI-1"
            accent="#4f9eff"
            model={form.ai1Model}
            persona={form.persona1}
            onModelChange={(ai1Model) => patchForm({ ai1Model })}
            onPersonaChange={(persona1) => patchForm({ persona1 })}
          />
          <ModelPicker
            title="AI-2"
            accent="#ff7043"
            model={form.ai2Model}
            persona={form.persona2}
            onModelChange={(ai2Model) => patchForm({ ai2Model })}
            onPersonaChange={(persona2) => patchForm({ persona2 })}
          />
        </div>

        <section className="surface-card p-4">
          <p className="mb-2 text-sm text-[var(--text-muted)]">Mode</p>
          <ModeToggle value={form.mode} onChange={(mode) => patchForm({ mode })} />

          <label className="mt-4 block text-xs text-[var(--text-muted)]" htmlFor="topic">
            Topic (required, max 300 chars)
          </label>
          <textarea
            id="topic"
            required
            maxLength={300}
            value={form.topic}
            onChange={(event) => patchForm({ topic: event.target.value })}
            className="mt-1 min-h-28 w-full rounded-lg border border-white/10 bg-[#0f0f16] p-3 text-sm"
            placeholder="e.g. Should autonomous AI systems be granted legal personhood?"
          />

          <div className="mt-5 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-sm text-[var(--text-muted)]">End Conditions</p>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.endConditions.fixedTurnsEnabled}
                onChange={(event) =>
                  patchForm({
                    endConditions: { fixedTurnsEnabled: event.target.checked },
                  })
                }
              />
              Fixed turns
            </label>

            {form.endConditions.fixedTurnsEnabled && (
              <div className="grid gap-2">
                <input
                  type="range"
                  min={4}
                  max={20}
                  value={form.endConditions.fixedTurns}
                  onChange={(event) =>
                    patchForm({
                      endConditions: { fixedTurns: Number(event.target.value) },
                    })
                  }
                />
                <p className="text-xs text-[var(--text-muted)]">{form.endConditions.fixedTurns} turns</p>
              </div>
            )}

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.endConditions.manualStop}
                onChange={(event) =>
                  patchForm({
                    endConditions: { manualStop: event.target.checked },
                  })
                }
              />
              Manual stop enabled
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.endConditions.autoConsensus}
                onChange={(event) =>
                  patchForm({
                    endConditions: { autoConsensus: event.target.checked },
                  })
                }
              />
              Auto-consensus check after each AI-2 turn
            </label>
          </div>
        </section>

        <section className="surface-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="small-caps text-xs text-[var(--text-muted)]">Freemium</p>
              <p className="text-sm">
                Remaining free turns today:{' '}
                <span className="font-semibold text-[var(--ai1)]">
                  {loadingUsage ? '...' : usage.remaining}
                </span>{' '}
                / {usage.limit}
              </p>
              {!authReady && <p className="mt-2 text-xs text-[var(--text-muted)]">Initializing session...</p>}
              {authError && <p className="mt-2 text-xs text-[var(--danger)]">{authError}</p>}
              {isFreeQuotaBlocked && (
                <p className="mt-2 text-xs text-[var(--danger)]">
                  Free turn limit reached for today.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!form.topic.trim() || starting || isFreeQuotaBlocked || !authReady || !sessionId}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--ai1)] px-4 py-2 font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {starting ? 'Starting...' : 'Start Arena'}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
