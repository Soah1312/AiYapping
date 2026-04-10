import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ModelPicker from '../components/ModelPicker';
import ModeToggle from '../components/ModeToggle';
import ApiKeyPanel from '../components/ApiKeyPanel';
import { ensureAnonymousUser } from '../lib/firebaseClient';
import { useConversationStore } from '../store/conversationStore';
import { useTheme } from '../context/ThemeContext';
import ThemeSwitcher from '../components/ThemeSwitcher';

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
    usage,
    resetConversation,
    startConversation,
    setSessionId,
    setConversationId,
    setUsage,
  } = useConversationStore();

  const [form, setForm] = useState(setup);
  const [localKeys, setLocalKeys] = useState({ anthropic: '', openai: '', google: '' });
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [starting, setStarting] = useState(false);
  
  const [showGptModelPicker, setShowGptModelPicker] = useState(false);
  const [showGeminiModelPicker, setShowGeminiModelPicker] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState(false);

  useEffect(() => { setForm(setup); }, [setup]);

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

  const isFreeQuotaBlocked = usage.remaining <= 0;
  const canStart = Boolean(form.topic.trim()) && !isFreeQuotaBlocked && authReady && Boolean(sessionId);

  function patchForm(patch) {
    setForm((prev) => ({
      ...prev,
      ...patch,
      endConditions: { ...prev.endConditions, ...(patch.endConditions || {}) },
    }));
  }

  async function handleStart(event) {
    event.preventDefault();
    if (!canStart) return;

    const nextSetup = {
      ...form,
      topic: form.topic.trim().slice(0, 300),
      persona1: form.persona1.trim(),
      persona2: form.persona2.trim(),
    };

    setStarting(true);

    try {
      resetConversation({ keepSetup: true, nextSetup });

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
      } else {
        setConversationId(null);
      }

      startConversation();
      navigate('/arena');
    } finally {
      setStarting(false);
    }
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
            {!authReady && (
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Initializing session...
              </p>
            )}
            {authError && (
              <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                {authError}
              </p>
            )}
            {isFreeQuotaBlocked && (
              <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                Daily free turn limit reached.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canStart || starting}
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
      <div className="flex h-screen w-full bg-[#212121] text-[#ececec]">
        {/* ChatGPT Sidebar */}
        <aside className="flex w-[260px] flex-col bg-[#171717] px-3 py-4 text-sm font-medium">
          <div className="flex flex-col gap-2 flex-grow">
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#ececec] hover:bg-[#2f2f2f] transition-colors">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
              New chat
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#ececec] hover:bg-[#2f2f2f] transition-colors">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Search chats
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#ececec] hover:bg-[#2f2f2f] transition-colors">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              Images
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#ececec] hover:bg-[#2f2f2f] transition-colors">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Apps
            </button>
            <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#ececec] hover:bg-[#2f2f2f] transition-colors">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              Codex
            </button>
          </div>
          
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <div className="px-3 pb-2 pt-1 flex justify-start">
              <ThemeSwitcher />
            </div>
            <button className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[#2f2f2f] transition-colors w-full">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full bg-[#2f2f2f] flex items-center justify-center text-xs">U</div>
                User Profile
              </div>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex flex-1 flex-col relative items-center justify-center p-4">
          {/* Header dropdowns disguised as GPT model selector */}
          <div className="absolute top-4 left-4">
            <button 
              onClick={() => setShowGptModelPicker(!showGptModelPicker)}
              className="flex items-center gap-2 text-lg font-semibold text-[#ececec] hover:text-white rounded-lg px-2 py-1"
            >
              ChatGPT <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {showGptModelPicker && (
              <div className="absolute top-full left-0 mt-2 min-w-[320px] bg-[#2f2f2f] rounded-2xl shadow-xl p-4 border border-white/10 z-50">
                <div className="text-sm font-semibold mb-4 text-[#ececec]">Arena Setup</div>
                
                <ModelPicker
                  title="First Contender"
                  accent="#10a37f"
                  model={form.ai1Model}
                  persona={form.persona1}
                  onModelChange={(ai1Model) => patchForm({ ai1Model })}
                  onPersonaChange={(persona1) => patchForm({ persona1 })}
                />
                
                <div className="my-4" />
                
                <ModelPicker
                  title="Second Contender"
                  accent="#8e8ea0"
                  model={form.ai2Model}
                  persona={form.persona2}
                  onModelChange={(ai2Model) => patchForm({ ai2Model })}
                  onPersonaChange={(persona2) => patchForm({ persona2 })}
                />

                <div className="my-4 border-t border-white/10 pt-4" />
                <p className="mb-2 text-xs text-[#8e8ea0]">Format</p>
                <div className="bg-[#171717] rounded-xl">
                  <ModeToggle value={form.mode} onChange={(mode) => patchForm({ mode })} />
                </div>
              </div>
            )}
          </div>
          
          <div className="absolute top-4 right-4 flex gap-3 text-[#b0b0bf]">
             <button onClick={() => setShowApiKeys(!showApiKeys)} className="hover:text-white transition-colors" title="API Keys">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
             </button>
             {showApiKeys && (
               <div className="absolute top-full right-0 mt-2 min-w-[300px] z-50">
                 <ApiKeyPanel keys={localKeys} onChange={setLocalKeys} />
               </div>
             )}
          </div>

          <h1 className="mb-8 text-3xl font-semibold text-[#ececec]">What can I help with?</h1>

          <div className="relative w-full max-w-3xl">
            {/* Input Pill */}
            <div className="flex flex-col bg-[#2f2f2f] rounded-3xl p-3 shadow-[0_0_15px_rgba(0,0,0,0.1)] focus-within:bg-[#3a3a3a] transition-colors">
              <div className="flex items-center gap-3 px-2">
                <button className="text-[#ececec] hover:text-white rounded-full p-1 bg-[#212121] transition-colors flex items-center justify-center h-8 w-8">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <input
                  type="text"
                  required
                  value={form.topic}
                  onChange={(e) => patchForm({ topic: e.target.value })}
                  placeholder="Ask anything"
                  className="flex-1 bg-transparent text-base text-[#ececec] outline-none placeholder-[#8e8ea0] py-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleStart(e);
                    }
                  }}
                />
                <button className="text-[#ececec] hover:text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line><line x1="8" y1="22" x2="16" y2="22"></line></svg>
                </button>
                <button 
                  onClick={handleStart}
                  disabled={!canStart || starting}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ececec] text-black disabled:bg-[#4a4a4a] disabled:text-[#ececec]/50 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                </button>
              </div>
            </div>
            {isFreeQuotaBlocked && (
              <p className="mt-4 text-center text-xs text-[#ef4444]">
                Daily free turn limit reached.
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* ── Gemini layout: dark, wider, gradient hero strip ───── */
  return (
    <div className="flex h-screen w-full flex-col bg-[#131314] text-[#e3e3e3] font-['Google_Sans']">
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button className="text-[#e3e3e3] p-2 hover:bg-[#1e1f20] rounded-full transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <span className="text-xl font-medium tracking-tight">Gemini</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-[#1e1f20] px-2 py-1 text-xs">
            ✨ <span className="font-medium mr-1">PRO</span>
          </div>
          <div className="h-8 w-8 rounded-full overflow-hidden border border-white/10">
            <img src="https://ui-avatars.com/api/?name=User&background=random" alt="Avatar" className="h-full w-full object-cover" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-4xl space-y-12">
          {/* Greeting */}
          <div className="space-y-1">
            <h1 className="text-5xl font-medium tracking-tight">
              <span className="gemini-gradient-text">✨ Hi User</span>
            </h1>
            <h2 className="text-5xl font-medium text-[#9aa0a6] tracking-tight">
              Where should we start?
            </h2>
          </div>

          <div className="relative w-full">
            {/* Input Container */}
            <div className="flex flex-col bg-[#1e1f20] rounded-[32px] p-4 pt-5 shadow-lg border border-white/5 transition-colors focus-within:bg-[#282a2c]">
              <input
                type="text"
                required
                value={form.topic}
                onChange={(e) => patchForm({ topic: e.target.value })}
                placeholder="Ask Gemini"
                className="flex-1 bg-transparent text-lg text-[#e3e3e3] outline-none placeholder-[#9aa0a6] px-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleStart(e);
                  }
                }}
              />
              
              <div className="flex items-center justify-between mt-6">
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-[#131314] transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-8M5 12h14"></path></svg>
                    Tools
                  </button>
                </div>
                
                <div className="flex items-center gap-2 relative">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setShowGeminiModelPicker(!showGeminiModelPicker);
                    }}
                    className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-[#131314] transition-colors"
                  >
                    Arena Settings <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                  {showGeminiModelPicker && (
                    <div className="absolute bottom-full right-0 mb-4 min-w-[340px] bg-[#1e1f20] rounded-3xl shadow-2xl p-5 text-left border border-white/10 z-50">
                      <div className="text-base font-medium mb-4 text-[#e3e3e3]">Arena Configuration</div>
                      
                      <ModelPicker
                        title="Fighter One"
                        accent="#4285f4"
                        model={form.ai1Model}
                        persona={form.persona1}
                        onModelChange={(ai1Model) => patchForm({ ai1Model })}
                        onPersonaChange={(persona1) => patchForm({ persona1 })}
                      />
                      
                      <div className="my-4" />
                      
                      <ModelPicker
                        title="Fighter Two"
                        accent="#a142f4"
                        model={form.ai2Model}
                        persona={form.persona2}
                        onModelChange={(ai2Model) => patchForm({ ai2Model })}
                        onPersonaChange={(persona2) => patchForm({ persona2 })}
                      />

                      <div className="my-4 border-t border-white/10 pt-4" />
                      <p className="mb-2 text-xs text-[#9aa0a6]">Mode</p>
                      <div className="bg-[#131314] rounded-xl">
                        <ModeToggle value={form.mode} onChange={(mode) => patchForm({ mode })} />
                      </div>
                    </div>
                  )}
                  <button onClick={(e) => { e.preventDefault(); setShowApiKeys(!showApiKeys); }} className="relative p-2 rounded-full hover:bg-[#131314] transition-colors text-white" aria-label="API Keys">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                  </button>
                  {showApiKeys && (
                     <div className="absolute bottom-full right-10 mb-4 min-w-[300px] z-50 p-0 rounded-2xl overflow-hidden shadow-2xl">
                       <ApiKeyPanel keys={localKeys} onChange={setLocalKeys} />
                     </div>
                  )}
                  <button 
                    onClick={handleStart}
                    disabled={!canStart || starting}
                    className="p-2 rounded-full bg-[#131314] disabled:opacity-50 disabled:bg-[#131314] hover:bg-black transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
            
            {isFreeQuotaBlocked && (
              <p className="mt-4 text-center text-xs text-[#ea4335]">
                Daily free turn limit reached.
              </p>
            )}
          </div>
          
          {/* Quick Action Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button 
              onClick={() => patchForm({ topic: "Is AGI coming next year?" })}
              className="flex items-center gap-2 rounded-full bg-[#1e1f20] px-4 py-3 text-sm font-medium hover:bg-[#282a2c] transition-colors border border-white/5"
            >
              🤖 Discuss AGI
            </button>
            <button 
              onClick={() => patchForm({ topic: "Tabs vs Spaces" })}
              className="flex items-center gap-2 rounded-full bg-[#1e1f20] px-4 py-3 text-sm font-medium hover:bg-[#282a2c] transition-colors border border-white/5"
            >
              💻 Dev holy war
            </button>
            <button 
              onClick={() => patchForm({ topic: "Explain quantum computing to a child" })}
              className="flex items-center gap-2 rounded-full bg-[#1e1f20] px-4 py-3 text-sm font-medium hover:bg-[#282a2c] transition-colors border border-white/5"
            >
              ⚛️ Explain Quantum
            </button>
            <button 
              onClick={() => patchForm({ topic: "Should pineapple be on pizza?" })}
              className="flex items-center gap-2 rounded-full bg-[#1e1f20] px-4 py-3 text-sm font-medium hover:bg-[#282a2c] transition-colors border border-white/5"
            >
              🍕 Food debate
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
