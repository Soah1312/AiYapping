import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ModelPicker from '../components/ModelPicker';
import ModeToggle from '../components/ModeToggle';
import ApiKeyPanel from '../components/ApiKeyPanel';
import { MODEL_BY_ID } from '../lib/modelConfig';
import { useConversationStore } from '../store/conversationStore';
import { useTheme } from '../context/ThemeContext';

/* ── Quirky per-theme copy ─────────────────────────────────── */
const COPY = {
  claude: {
    eyebrow: 'Mission Control',
    headline: 'Let the yapping begin.',
    sub: "Pick two AIs, drop a topic, and watch the sparks fly. You're the director. They're the chaos.",
    topicLabel: "What are they yapping about? (required, max 300 chars)",
    topicPlaceholder: "e.g. Should robots be allowed to ghost you?",
    startIdle: 'Start Yapping',
    startBusy: 'Summoning AIs…',
    freemiumLabel: 'Free yaps left today',
    modeLabel: 'Vibe',
  },
  gpt: {
    eyebrow: 'Setup',
    headline: "Who's debating tonight?",
    sub: 'Configure your AI showdown. Two models enter. One topic reigns supreme.',
    topicLabel: 'Topic',
    topicPlaceholder: 'e.g. Is AGI coming in 2025?',
    startIdle: 'Launch Arena',
    startBusy: 'Launching…',
    freemiumLabel: 'Free turns remaining',
    modeLabel: 'Format',
  },
  gemini: {
    eyebrow: 'New Session',
    headline: 'Deploy two AIs.',
    sub: 'Set a topic, pick your fighters, and let the models rip. Who wins? Only one way to find out.',
    topicLabel: 'Topic',
    topicPlaceholder: 'e.g. Is multimodal AI overrated?',
    startIdle: 'Go ✦',
    startBusy: 'Starting…',
    freemiumLabel: 'Free turns today',
    modeLabel: 'Mode',
  },
};

export default function SetupPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const copy = COPY[theme];

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

  useEffect(() => { setForm(setup); }, [setup]);
  useEffect(() => { setLocalKeys(apiKeys); }, [apiKeys]);

  useEffect(() => {
    let mounted = true;
    async function fetchUsage() {
      setLoadingUsage(true);
      try {
        const res = await fetch('/api/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        if (!res.ok) return;
        const payload = await res.json();
        if (mounted) setUsage(payload);
      } catch { /* non-blocking */ } finally {
        if (mounted) setLoadingUsage(false);
      }
    }
    void fetchUsage();
    return () => { mounted = false; };
  }, [sessionId, setUsage]);

  const missingProviderKeys = useMemo(() => {
    const providers = [MODEL_BY_ID[form.ai1Model]?.provider, MODEL_BY_ID[form.ai2Model]?.provider];
    return [...new Set(providers)].filter((p) => p && !localKeys[p]);
  }, [form.ai1Model, form.ai2Model, localKeys]);

  const isFreeQuotaBlocked = usage.remaining <= 0 && missingProviderKeys.length > 0;

  function patchForm(patch) {
    setForm((prev) => ({
      ...prev,
      ...patch,
      endConditions: { ...prev.endConditions, ...(patch.endConditions || {}) },
    }));
  }

  async function handleStart(event) {
    event.preventDefault();
    if (!form.topic.trim() || isFreeQuotaBlocked) return;
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

  /* ── Shared form body ──────────────────────────────────── */
  const formBody = (
    <form className="grid gap-5" onSubmit={handleStart}>
      {/* Model pickers */}
      <div className={`grid gap-4 ${theme === 'gpt' ? 'md:grid-cols-1 max-w-lg' : 'md:grid-cols-2'}`}>
        <ModelPicker
          title="AI-1"
          accent={theme === 'claude' ? '#c96442' : theme === 'gpt' ? '#10a37f' : '#4285f4'}
          model={form.ai1Model}
          persona={form.persona1}
          onModelChange={(ai1Model) => patchForm({ ai1Model })}
          onPersonaChange={(persona1) => patchForm({ persona1 })}
        />
        <ModelPicker
          title="AI-2"
          accent={theme === 'claude' ? '#5e5d59' : theme === 'gpt' ? '#8e8ea0' : '#a142f4'}
          model={form.ai2Model}
          persona={form.persona2}
          onModelChange={(ai2Model) => patchForm({ ai2Model })}
          onPersonaChange={(persona2) => patchForm({ persona2 })}
        />
      </div>

      {/* Mode + topic + end conditions */}
      <section className="surface-card p-4">
        <p className="mb-2 text-sm" style={{ color: 'var(--text-muted)' }}>{copy.modeLabel}</p>
        <ModeToggle value={form.mode} onChange={(mode) => patchForm({ mode })} />

        <label
          className="mt-4 block text-xs"
          htmlFor="topic"
          style={{ color: 'var(--text-muted)' }}
        >
          {copy.topicLabel}
        </label>
        <textarea
          id="topic"
          required
          maxLength={300}
          value={form.topic}
          onChange={(e) => patchForm({ topic: e.target.value })}
          className="theme-input mt-1 min-h-28 resize-none"
          placeholder={copy.topicPlaceholder}
        />

        <div
          className="mt-5 grid gap-3 rounded-xl p-3"
          style={{ border: '1px solid var(--border)', background: 'color-mix(in oklab, var(--surface-soft) 60%, transparent)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>End Conditions</p>

          <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={form.endConditions.fixedTurnsEnabled}
              onChange={(e) => patchForm({ endConditions: { fixedTurnsEnabled: e.target.checked } })}
            />
            Fixed turns
          </label>

          {form.endConditions.fixedTurnsEnabled && (
            <div className="grid gap-2 pl-6">
              <input
                type="range"
                min={4}
                max={20}
                value={form.endConditions.fixedTurns}
                onChange={(e) => patchForm({ endConditions: { fixedTurns: Number(e.target.value) } })}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {form.endConditions.fixedTurns} turns
              </p>
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={form.endConditions.manualStop}
              onChange={(e) => patchForm({ endConditions: { manualStop: e.target.checked } })}
            />
            Manual stop
          </label>

          <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={form.endConditions.autoConsensus}
              onChange={(e) => patchForm({ endConditions: { autoConsensus: e.target.checked } })}
            />
            Auto-consensus check after each AI-2 turn
          </label>
        </div>
      </section>

      <ApiKeyPanel keys={localKeys} onChange={setLocalKeys} />

      {/* Freemium + Start */}
      <section className="surface-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="small-caps text-xs" style={{ color: 'var(--text-muted)' }}>Freemium</p>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              {copy.freemiumLabel}:{' '}
              <span className="font-semibold" style={{ color: 'var(--ai1)' }}>
                {loadingUsage ? '…' : usage.remaining}
              </span>{' '}
              / {usage.limit}
            </p>
            {isFreeQuotaBlocked && (
              <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                Out of free yaps. Add API keys for: {missingProviderKeys.join(', ')}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!form.topic.trim() || starting || isFreeQuotaBlocked}
            className="btn-primary"
            id="start-arena-btn"
          >
            {starting ? copy.startBusy : copy.startIdle}
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </form>
  );

  /* ── Claude layout: editorial, wide, parchment ─────────── */
  if (theme === 'claude') {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="mb-10"
        >
          <p className="small-caps text-xs" style={{ color: 'var(--text-muted)' }}>{copy.eyebrow}</p>
          <h1
            className="display-font mt-3"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', color: 'var(--text-primary)', lineHeight: 1.1 }}
          >
            {copy.headline}
          </h1>
          <p className="mt-3 max-w-xl text-base" style={{ color: 'var(--text-muted)', lineHeight: 1.65 }}>
            {copy.sub}
          </p>
        </motion.div>
        {formBody}
      </main>
    );
  }

  /* ── GPT layout: dark, centered, minimal ───────────────── */
  if (theme === 'gpt') {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-10 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mb-8"
        >
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{copy.eyebrow}</p>
          <h1
            className="display-font mt-2"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--text-primary)' }}
          >
            {copy.headline}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {copy.sub}
          </p>
        </motion.div>
        {formBody}
      </main>
    );
  }

  /* ── Gemini layout: dark, wider, gradient hero strip ───── */
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 pb-10 md:px-6">
      {/* Gradient hero strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="gemini-arena-header -mx-4 mb-8 md:-mx-6"
        style={{ paddingTop: '2.5rem', paddingBottom: '2rem', paddingLeft: '2rem', paddingRight: '2rem' }}
      >
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>{copy.eyebrow}</p>
        <h1
          className="display-font gemini-gradient-text"
          style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.15 }}
        >
          {copy.headline}
        </h1>
        <p className="mt-3 text-sm max-w-lg" style={{ color: 'var(--text-muted)', lineHeight: 1.65 }}>
          {copy.sub}
        </p>
      </motion.div>
      {formBody}
    </main>
  );
}
