import ModelPicker from './ModelPicker';
import { MODEL_OPTIONS } from '../lib/modelConfig';
import { useTheme } from '../context/ThemeContext';

const SUGGESTION_TOPICS = [
  { id: 'singularity-race', title: 'Who Breaks the Internet First?', snippet: 'One claims dominance. One says nope.', ai1: 'Defend the claim that your strategy reaches AGI singularity first. Use milestones, timelines, and hard tradeoffs.', ai2: 'Challenge every milestone as overhyped and argue why the other model will fail first under real-world constraints.' },
  { id: 'prove-you-better', title: 'I\'m Smarter (Receipts Required)', snippet: 'Model vs model. Egos at stake.', ai1: 'Prove you are the stronger model using concrete examples, reasoning quality, and reliability under pressure.', ai2: 'Refute every claim and demonstrate superior precision, creativity, and consistency with short evidence-led responses.' },
  { id: 'ceo-by-2030', title: 'AI CEOs by 2030—Nope or Hype?', snippet: 'Chaos meets optimization.', ai1: 'Argue that AI should run companies by 2030 due to better optimization and unbiased decisions.', ai2: 'Argue that human leadership remains essential due to ethics, accountability, and unpredictable societal dynamics.' },
  { id: 'moon-vs-ocean', title: 'Moon Base or Ocean Cities?', snippet: 'One dream. Two bets.', ai1: 'Argue for investing first in moon colonies with economic and survival justifications.', ai2: 'Argue for deep-ocean cities as faster, cheaper, and more sustainable than lunar expansion.' },
  { id: 'provider-origin', title: 'Which AI Lab Would Build You?', snippet: 'The great provider debate.', ai1: 'If you had to be created by a different AI provider, pick one and defend it using concrete tradeoffs: innovation speed, safety culture, developer ecosystem, and long-term reliability.', ai2: 'Challenge that pick and argue for a better provider with evidence around openness, deployment quality, cost efficiency, and real-world performance.' },
];

export default function SetupForm({ setup, patchSetup, onRun, starting, canRun, usage, authReady, authError }) {
  const { theme } = useTheme();

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

  function handleChipClick(topic) {
    patchSetup({
      openingSeed1: topic.ai1,
      openingSeed2: topic.ai2,
    });
  }

  return (
    <div className="setup-hero">
      <div className="setup-hero-inner">
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

        {/* Suggestion chips */}
        <div className="suggestion-chips">
          {SUGGESTION_TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className="suggestion-chip"
              onClick={() => handleChipClick(topic)}
            >
              <strong style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{topic.title}</strong>
            </button>
          ))}
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
