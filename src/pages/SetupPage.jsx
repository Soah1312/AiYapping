import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ModelPicker from '../components/ModelPicker';
import ModeToggle from '../components/ModeToggle';
import ApiKeyPanel from '../components/ApiKeyPanel';
import { MODEL_BY_ID } from '../lib/modelConfig';
import { useConversationStore } from '../store/conversationStore';

export default function SetupPage() {
  const navigate = useNavigate();
  const {
    sessionId,
    setup,
    apiKeys,
    usage,
    resetConversation,
    startConversation,
    setApiKeys,
    setUsage,
  } = useConversationStore();

  const [form, setForm] = useState(setup);
  const [localKeys, setLocalKeys] = useState(apiKeys);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    setForm(setup);
  }, [setup]);

  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys]);

  useEffect(() => {
    let mounted = true;

    async function fetchUsage() {
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

  const missingProviderKeys = useMemo(() => {
    const providers = [
      MODEL_BY_ID[form.ai1Model]?.provider,
      MODEL_BY_ID[form.ai2Model]?.provider,
    ];

    return [...new Set(providers)].filter((provider) => provider && !localKeys[provider]);
  }, [form.ai1Model, form.ai2Model, localKeys]);

  const isFreeQuotaBlocked = usage.remaining <= 0 && missingProviderKeys.length > 0;

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

    if (!form.topic.trim() || isFreeQuotaBlocked) {
      return;
    }

    const nextSetup = {
      ...form,
      topic: form.topic.trim().slice(0, 300),
      persona1: form.persona1.trim(),
      persona2: form.persona2.trim(),
    };

    setStarting(true);
    setApiKeys(localKeys);
    resetConversation({ keepSetup: true, nextSetup });
    startConversation();
    navigate('/arena');
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

        <ApiKeyPanel keys={localKeys} onChange={setLocalKeys} />

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
              {isFreeQuotaBlocked && (
                <p className="mt-2 text-xs text-[var(--danger)]">
                  Free turn limit reached. Add keys for: {missingProviderKeys.join(', ')}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!form.topic.trim() || starting || isFreeQuotaBlocked}
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
