import ModelPicker from './ModelPicker';
import { MODEL_OPTIONS } from '../lib/modelConfig';
import { useTheme } from '../context/ThemeContext';
import { QUICK_PROMPTS } from '../lib/prompts';
import { useConversationStore } from '../store/conversationStore';

export default function SetupForm({ setup, patchSetup, onRun, starting, canRun, usage, authReady, authError, onOpenSettings }) {
  const { theme } = useTheme();
  const { chaosMode, setChaosMode } = useConversationStore();

  const headingText = theme === 'claude'
    ? 'Let the chaos begin.'
    : theme === 'chatgpt'
      ? 'Pick a fight. We\'re ready.'
      : '✦ Time to settle this.'; 

  const subText = theme === 'claude'
    ? "Pick two AIs, give them a prompt. Buckle up for the roast."
    : theme === 'chatgpt'
      ? 'Two models. One prompt. Who wins? Only one way to find out.'
      : 'Set the stage. Let the models decide who\'s right.';

  function handleChipClick(prompt) {
    patchSetup({
      topic: prompt.title,
      openingSeed1: prompt.ai1Prompt,
      openingSeed2: prompt.ai2Prompt,
    });
  }

  return (
    <div className="setup-hero">
      <div className="setup-hero-inner" style={{ position: 'relative' }}>
        {/* Heading */}
        <h1
          className={`main-heading display-font ${theme === 'gemini' ? 'gemini-gradient-text' : ''}`}
          style={{
            fontSize: 'clamp(1.75rem, 4.5vw, 3rem)',
            lineHeight: 1.15,
            color: theme === 'gemini' ? undefined : 'var(--text-primary)',
            marginBottom: '0.5rem',
          }}
        >
          {headingText}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '32rem', margin: '0 auto' }}>
          {subText}
        </p>

        <div className="suggestion-chips">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              className="suggestion-chip"
              onClick={() => handleChipClick(prompt)}
            >
              <strong style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{prompt.title}</strong>
            </button>
          ))}
        </div>

        {/* Chaos Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 8px' }}>
          <button
            type="button"
            className={`chaos-toggle${chaosMode ? ' active' : ''}`}
            onClick={() => setChaosMode(!chaosMode)}
          >
            <div className="chaos-toggle-track">
              <div className="chaos-toggle-knob" />
            </div>
            <span className="chaos-toggle-label">
              {chaosMode ? 'CHAOS MODE' : 'Chaos Mode'}
            </span>
            <span className="chaos-toggle-flame">{chaosMode ? '🔥' : '💤'}</span>
          </button>
        </div>

        {/* Setup form */}
        <form onSubmit={onRun} className="setup-form-grid">
          <ModelPicker
            title="AI-1"
            accent="var(--ai1)"
            model={setup.ai1Model}
            openingSeed={setup.openingSeed1 || ''}
            seedLabel="Prompt for AI-1"
            seedPlaceholder="Prime the pump. What's your vibe and stance?"
            onModelChange={(ai1Model) => patchSetup({ ai1Model })}
            onOpeningSeedChange={(openingSeed1) => patchSetup({ openingSeed1 })}
          />
          <ModelPicker
            title="AI-2"
            accent="var(--ai2)"
            model={setup.ai2Model}
            openingSeed={setup.openingSeed2 || ''}
            seedLabel="Prompt for AI-2"
            seedPlaceholder="Your turn. What's the counter-move?"
            onModelChange={(ai2Model) => patchSetup({ ai2Model })}
            onOpeningSeedChange={(openingSeed2) => patchSetup({ openingSeed2 })}
          />

          <div className="col-span-full flex flex-wrap items-center justify-between gap-3 mt-2">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Free duels left: <strong>{usage.remaining}</strong> / {usage.limit}
              </p>
              {!authReady && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Warming up the neurons...</p>}
              {authError && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{authError}</p>}
            </div>

            <button type="submit" className="btn-primary" disabled={!canRun || starting}>
              {starting ? 'Igniting...' : 'Let\'s go'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
