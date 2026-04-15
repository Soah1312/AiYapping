import { useEffect, useState } from 'react';
import ModelPicker from './ModelPicker';
import {
  MODEL_OPTIONS,
  ULTRA_CHAOS_OPUS_MODEL_ID,
  ULTRA_CHAOS_SONNET_MODEL_ID,
} from '../lib/modelConfig';
import { useTheme } from '../context/ThemeContext';
import { QUICK_PROMPTS } from '../lib/prompts';
import { useConversationStore } from '../store/conversationStore';
import { ensurePuterSignIn } from '../lib/puterClient';

// Dark Academia launch word
const SPARK_ACTION_WORD = 'SPARK';

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

const getPromptDisplayCount = (width) => {
  if (width < 430) return 2;
  if (width < 768) return 3;
  return 4;
};

const areSamePromptSet = (first, second) => {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) {
    return false;
  }

  const firstIds = first.map((item) => item.id).sort();
  const secondIds = second.map((item) => item.id).sort();
  return firstIds.every((id, index) => id === secondIds[index]);
};

const pickRandomPrompts = (count, previousSelection = []) => {
  if (!Array.isArray(QUICK_PROMPTS) || QUICK_PROMPTS.length === 0) {
    return [];
  }

  const normalizedCount = Math.max(1, Math.min(count, QUICK_PROMPTS.length));
  const shuffled = [...QUICK_PROMPTS].sort(() => Math.random() - 0.5);
  let nextSelection = shuffled.slice(0, normalizedCount);

  if (areSamePromptSet(nextSelection, previousSelection) && QUICK_PROMPTS.length > normalizedCount) {
    nextSelection = shuffled.slice(1, normalizedCount + 1);
  }

  return nextSelection;
};

export default function SetupForm({ setup, patchSetup, onRun, starting, canRun, usage, authReady, authError, onOpenSettings }) {
  const { theme } = useTheme();
  const {
    chaosMode,
    setChaosMode,
    ultraChaosUnlocked,
    setUltraChaosUnlocked
  } = useConversationStore();

  const [headingText] = useState(() => getTimeBasedHeading());
  const [sparkTapCount, setSparkTapCount] = useState(0);
  const [chaosHint, setChaosHint] = useState('');
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const [visiblePrompts, setVisiblePrompts] = useState(() => {
    const initialWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
    return pickRandomPrompts(getPromptDisplayCount(initialWidth));
  });

  const visibleModelOptions = ultraChaosUnlocked
    ? MODEL_OPTIONS
    : MODEL_OPTIONS.filter((option) => !option.requiresUltraChaos);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const promptCount = getPromptDisplayCount(viewportWidth);
    setVisiblePrompts((previousSelection) => pickRandomPrompts(promptCount, previousSelection));
  }, [viewportWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const promptCount = getPromptDisplayCount(window.innerWidth);
      setVisiblePrompts((previousSelection) => pickRandomPrompts(promptCount, previousSelection));
    }, 9000);

    return () => window.clearInterval(intervalId);
  }, []);

  function handleChipClick(prompt) {
    patchSetup({
      topic: prompt.title,
      openingSeed1: prompt.ai1Prompt,
      openingSeed2: prompt.ai2Prompt,
    });
  }

  function handleChaosClick() {
    setChaosMode(!chaosMode);
    setChaosHint(chaosMode ? 'Chaos Mode off.' : 'Chaos Mode active.');
  }

  async function handleSparkClick(e) {
    if (e) e.preventDefault();
    
    // Secret Trigger Logic
    const prompt1Empty = !setup.openingSeed1?.trim();
    const prompt2Empty = !setup.openingSeed2?.trim();

    if (prompt1Empty && prompt2Empty && !ultraChaosUnlocked) {
      const nextCount = sparkTapCount + 1;
      setSparkTapCount(nextCount);
      
      if (nextCount < 7) {
        return;
      }

      // 7th click - Unlock Ultra
      const authResult = await ensurePuterSignIn({ interactive: true });
      if (!authResult.ok) {
        setSparkTapCount(0);
        return;
      }

      setUltraChaosUnlocked(true);
      setChaosMode(true);
      patchSetup({
        ai1Model: ULTRA_CHAOS_OPUS_MODEL_ID,
        ai2Model: ULTRA_CHAOS_SONNET_MODEL_ID,
      });
      setSparkTapCount(0);
      setChaosHint('Ultra Chaos unlocked: Claude Opus vs Sonnet');
      return;
    }

    // Normal Submission
    setSparkTapCount(0);
    if (!canRun || starting) return;
    onRun(e);
  }

  return (
    <div className="setup-hero">
      <div className="setup-hero-inner" style={{ position: 'relative' }}>
        {/* Heading */}
        <h1
          className={`main-heading display-font setup-heading ${theme === 'gemini' ? 'gemini-gradient-text' : ''}`}
        >
          {headingText}
        </h1>

        {/* Chaos Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 12px' }}>
          <button
            type="button"
            className={`chaos-btn${chaosMode ? ' chaos-btn--on' : ''}`}
            onClick={handleChaosClick}
            aria-pressed={chaosMode}
          >
            <span className="chaos-btn-dot" aria-hidden="true" />
            <span className="chaos-btn-text">
              Chaos Mode
            </span>
          </button>
        </div>
        {chaosHint && (
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            {chaosHint}
          </p>
        )}

        {/* Setup form */}
        <form onSubmit={handleSparkClick} className="setup-form-grid" style={{ marginTop: '0.5rem' }}>
          <ModelPicker
            title="AI-1"
            accent="var(--ai1)"
            model={setup.ai1Model}
            modelOptions={visibleModelOptions}
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
            modelOptions={visibleModelOptions}
            openingSeed={setup.openingSeed2 || ''}
            seedLabel="Prompt for AI-2"
            seedPlaceholder="Your turn. What's the counter-move?"
            onModelChange={(ai2Model) => patchSetup({ ai2Model })}
            onOpeningSeedChange={(openingSeed2) => patchSetup({ openingSeed2 })}
          />

          <div className="setup-footer-area">
            <div className="setup-cta-stack">
              <div className="setup-cta-status" aria-live="polite">
                {!authReady && <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Warming up the neurons...</p>}
                {authError && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{authError}</p>}
              </div>

              <button
                type="submit"
                className={`btn-primary setup-launch-btn${(!canRun || starting) ? ' btn-primary--not-ready shadow-none opacity-50' : ''}`}
                style={{ cursor: (!canRun || starting) ? 'not-allowed' : 'pointer' }}
                title="Ctrl + Enter"
              >
                <span key={starting ? 'IGNITING' : 'SPARK'} className="setup-launch-word">
                  {starting ? 'IGNITING' : 'SPARK'}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <p className="setup-cta-shortcut">Ctrl + Enter</p>
            </div>

            <div className="setup-quick-prompts-wrapper">
              <div className="suggestion-chips setup-quick-prompts" style={{ '--prompt-count': visiblePrompts.length }}>
                {visiblePrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleChipClick(prompt)}
                  >
                    <strong>{prompt.title}</strong>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
