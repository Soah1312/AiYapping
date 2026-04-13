import { useEffect, useState } from 'react';
import ModelPicker from './ModelPicker';
import { MODEL_OPTIONS } from '../lib/modelConfig';
import { useTheme } from '../context/ThemeContext';
import { QUICK_PROMPTS } from '../lib/prompts';
import { useConversationStore } from '../store/conversationStore';

const getTimeBasedHeading = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 10) return 'Rise and yap.';
  if (hour >= 10 && hour < 18) return 'Let the chaos begin.';
  if (hour >= 18 && hour < 22) return 'Prime time yapping.';
  if (hour >= 22 || hour === 0) return 'Getting late. Getting unhinged.';
  if (hour === 1) return "Shouldn't you be sleeping?";
  if (hour >= 2 && hour < 5) return 'Bro. Go to bed.';

  return 'Let the chaos begin.';
};

export default function SetupForm({ setup, patchSetup, onRun, starting, canRun, usage, authReady, authError, onOpenSettings }) {
  const { theme } = useTheme();
  const { chaosMode, setChaosMode } = useConversationStore();

  const [headingText] = useState(() => getTimeBasedHeading());
  const subText = 'Pick two AIs, give them a prompt. Buckle up for the roast.';
  const remainingText = `${usage.remaining} yaps remaining. Use them wisely.`;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        onRun({ preventDefault: () => {} });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRun]);

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
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '32rem', margin: '0 auto', marginBottom: '1rem' }}>
          {subText}
        </p>

        {/* Chaos Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 12px' }}>
          <button
            type="button"
            className={`chaos-btn${chaosMode ? ' chaos-btn--on' : ''}`}
            onClick={() => setChaosMode(!chaosMode)}
            aria-pressed={chaosMode}
          >
            <span className="chaos-btn-dot" aria-hidden="true" />
            <span className="chaos-btn-text">
              Chaos Mode
            </span>
          </button>
        </div>

        {/* Setup form */}
        <form onSubmit={onRun} className="setup-form-grid" style={{ marginBottom: '1.5rem', marginTop: '0.5rem' }}>
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
              {!authReady && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Warming up the neurons...</p>}
              {authError && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{authError}</p>}
            </div>

            <button type="submit" className="btn-primary" disabled={!canRun || starting} title="Ctrl + Enter">
              {starting ? 'Igniting...' : 'Let\'s go'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </form>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            Or pick a quick scenario:
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
        </div>
      </div>
    </div>
  );
}
