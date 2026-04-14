import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, ExternalLink } from 'lucide-react';
import { MODEL_BY_ID } from '../lib/modelConfig';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';

/* ── helpers ── */
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function modelLabel(id) {
  return MODEL_BY_ID[id]?.label || id || 'AI';
}

function inferIconPath(id) {
  const t = String(id || '').toLowerCase();
  if (t.includes('llama') || t.includes('meta')) return '/icons/meta-color.svg';
  if (t.includes('qwen')) return '/icons/qwen-color.svg';
  if (t.includes('kimi')) return '/icons/kimi-color.svg';
  if (t.includes('gemma')) return '/icons/gemma-color.svg';
  if (t.includes('mistral') || t.includes('mixtral')) return '/icons/mistral-color.svg';
  if (t.includes('deepseek')) return '/icons/deepseek-color.svg';
  if (t.includes('glm')) return '/icons/glmv-color.svg';
  if (t.includes('gpt') || t.includes('openai') || t.includes('chatgpt')) return '/icons/openai-color.svg';
  if (t.includes('claude') || t.includes('anthropic')) return '/icons/claude-ai-icon.svg';
  if (t.includes('gemini')) return '/icons/gemini-color.svg';
  return '';
}

/* ── single message bubble ── */
function MessageBubble({ msg, label, icon, isLeft, showLabel, delay }) {
  const text = String(msg.content || '').trim();
  const time = formatTime(msg.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut', delay }}
      className={`cl-msg ${isLeft ? 'cl-msg--left' : 'cl-msg--right'}`}
    >
      {/* avatar column */}
      {isLeft && (
        <div className="cl-msg-avatar-col">
          {showLabel && (
            <div className="cl-msg-avatar">
              {icon
                ? <img src={icon} alt={label} className="cl-msg-avatar-img" onError={e => { e.currentTarget.style.display='none'; }} />
                : <span className="cl-msg-avatar-initials">{label.slice(0,2).toUpperCase()}</span>
              }
            </div>
          )}
        </div>
      )}

      <div className="cl-msg-body">
        {showLabel && (
          <span className={`cl-msg-name ${isLeft ? 'cl-msg-name--left' : 'cl-msg-name--right'}`}>{label}</span>
        )}
        <div className={`cl-bubble ${isLeft ? 'cl-bubble--left' : 'cl-bubble--right'}`}>
          <div className="cl-bubble-text">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
          {time && <span className="cl-bubble-time">{time}</span>}
        </div>
      </div>

      {/* right avatar */}
      {!isLeft && (
        <div className="cl-msg-avatar-col cl-msg-avatar-col--right">
          {showLabel && (
            <div className="cl-msg-avatar">
              {icon
                ? <img src={icon} alt={label} className="cl-msg-avatar-img" onError={e => { e.currentTarget.style.display='none'; }} />
                : <span className="cl-msg-avatar-initials">{label.slice(0,2).toUpperCase()}</span>
              }
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ── skeleton ── */
function SkeletonBubble({ right, width }) {
  return (
    <div className={`cl-msg ${right ? 'cl-msg--right' : 'cl-msg--left'}`} style={{ gap: 10 }}>
      {!right && <div className="cl-skeleton-avatar" />}
      <div className="cl-skeleton-bubble" style={{ width }} />
      {right && <div className="cl-skeleton-avatar" />}
    </div>
  );
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#yap-g-share)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <defs><linearGradient id="yap-g-share" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f43f5e"/><stop offset="100%" stopColor="#f97316"/></linearGradient></defs>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function LoadingView() {
  return (
    <div className="cl-shell" data-theme="claude">
      <header className="cl-header">
        <Link to="/" className="cl-back-link"><ArrowLeft size={16} aria-hidden="true" /> Back</Link>
        <div className="cl-header-brand">
          <Logo />
          <span>AiYapping</span>
        </div>
      </header>
      <main className="cl-feed" aria-busy="true">
        <div className="cl-skeleton-header" />
        {[[180,'left'],[240,'right'],[160,'left'],[200,'right'],[140,'left']].map(([w,s],i)=>(
          <SkeletonBubble key={i} right={s==='right'} width={w} />
        ))}
      </main>
    </div>
  );
}

function ErrorView() {
  return (
    <div className="cl-shell" data-theme="claude">
      <header className="cl-header">
        <Link to="/" className="cl-back-link"><ArrowLeft size={16} aria-hidden="true" /> Back</Link>
        <div className="cl-header-brand">
          <Logo />
          <span>AiYapping</span>
        </div>
      </header>
      <main className="cl-feed cl-feed--center">
        <div className="cl-notfound-card">
          <p className="cl-notfound-eyebrow">Error</p>
          <h1 className="cl-notfound-heading">Something went wrong</h1>
          <p className="cl-notfound-body">We couldn't load this conversation due to a network error. Please try again later.</p>
          <Link to="/" className="cl-cta-btn">
            <Plus size={15} aria-hidden="true" /> Start your own Duel
          </Link>
        </div>
      </main>
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="cl-shell" data-theme="claude">
      <header className="cl-header">
        <Link to="/" className="cl-back-link"><ArrowLeft size={16} aria-hidden="true" /> Back</Link>
        <div className="cl-header-brand">
          <Logo />
          <span>AiYapping</span>
        </div>
      </header>
      <main className="cl-feed cl-feed--center">
        <div className="cl-notfound-card">
          <p className="cl-notfound-eyebrow">404</p>
          <h1 className="cl-notfound-heading">Link expired or not found</h1>
          <p className="cl-notfound-body">Either the share link got nuked or you're looking for something that was never here.</p>
          <Link to="/" className="cl-cta-btn">
            <Plus size={15} aria-hidden="true" /> Start your own Duel
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function SharePage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, data: null, notFound: false, error: false });
  const bottomRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function fetchShare() {
      setState({ loading: true, data: null, notFound: false, error: false });
      try {
        const res = await fetch(`/api/share?id=${encodeURIComponent(id || '')}`);
        if (res.status === 404) { if (mounted) setState({ loading: false, data: null, notFound: true, error: false }); return; }
        if (!res.ok) throw new Error('Failed');
        const payload = await res.json();
        if (mounted) {
          setState({ loading: false, data: payload, notFound: false, error: false });
        }
      } catch {
        if (mounted) setState({ loading: false, data: null, notFound: false, error: true });
      }
    }
    void fetchShare();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    if (state.loading || !state.data) {
      document.title = 'AiYapping';
      return;
    }

    const resolvedTitle = String(state.data.title || state.data.topic || 'AI Duel').trim();
    document.title = `${resolvedTitle} - AiYapping`;
  }, [state.data, state.loading]);

  if (state.loading) return <LoadingView />;
  if (state.error) return <ErrorView />;
  if (state.notFound || !state.data) return <NotFoundView />;

  const { title, topic, config, turnCount, transcript } = state.data;
  const displayTitle = String(title || topic || 'AI Duel').trim();
  const displayTopic = String(topic || '').trim();
  const hasUsefulTopic =
    Boolean(displayTopic)
    && displayTopic !== displayTitle
    && displayTopic.toLowerCase() !== 'untitled arena';
  const label1 = modelLabel(config?.model1);
  const label2 = modelLabel(config?.model2);
  const icon1 = MODEL_BY_ID[config?.model1]?.icon || inferIconPath(config?.model1);
  const icon2 = MODEL_BY_ID[config?.model2]?.icon || inferIconPath(config?.model2);

  let prevSide = null;
  let msgIndex = 0;

  return (
    <div className="cl-shell" data-theme="claude">

      {/* ── TOPBAR ── */}
      <header className="cl-header">
        <Link to="/" className="cl-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </Link>
        <div className="cl-header-brand">
          <Logo />
          <span>AiYapping</span>
        </div>
        <Link to="/" className="cl-header-cta">
          <ExternalLink size={13} aria-hidden="true" /> Try it yourself
        </Link>
      </header>

      {/* ── FEED ── */}
      <main className="cl-feed" id="cl-chat-feed">

        {/* conversation meta card */}
        <div className="cl-convo-meta">
          <p className="cl-convo-eyebrow">Shared conversation</p>
          <h1 className="cl-convo-title">{displayTitle}</h1>
          {hasUsefulTopic && (
            <p className="cl-convo-subtitle">{displayTopic}</p>
          )}
          <div className="cl-convo-pills">
            <span className="cl-pill">{label1}</span>
            <span className="cl-pill-vs">vs</span>
            <span className="cl-pill">{label2}</span>
            {turnCount && <span className="cl-pill cl-pill--muted">{turnCount} turns</span>}
            {config?.mode && <span className="cl-pill cl-pill--muted">{config.mode}</span>}
          </div>
        </div>

        {(transcript || []).map((msg, idx) => {
          if (msg.role === 'system') {
            return (
              <div key={msg.id || idx} className="cl-system-note">
                {msg.content}
              </div>
            );
          }

          const isLeft = msg.side === 'ai1';
          const label = isLeft ? label1 : label2;
          const icon  = isLeft ? icon1  : icon2;
          const showLabel = msg.side !== prevSide;
          prevSide = msg.side;
          const delay = Math.min(msgIndex * 0.04, 0.4);
          msgIndex++;

          return (
            <MessageBubble
              key={msg.id || `${msg.turn}-${idx}`}
              msg={msg}
              label={label}
              icon={icon}
              isLeft={isLeft}
              showLabel={showLabel}
              delay={delay}
            />
          );
        })}

        <div ref={bottomRef} style={{ height: 16 }} />
      </main>

      {/* ── BOTTOM CTA ── */}
      <footer className="cl-footer">
        <p className="cl-footer-text">This conversation was shared from AiYapping — watch AI models debate each other in real time.</p>
        <Link to="/" className="cl-cta-btn">
          <Plus size={15} aria-hidden="true" /> Start your own AI Duel
        </Link>
      </footer>

    </div>
  );
}
