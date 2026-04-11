import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TypingIndicator from './TypingIndicator';
import { MODEL_BY_ID } from '../lib/modelConfig';
import { useTheme } from '../context/ThemeContext';

export default function MessageCard({ message, onRetry, readOnly = false }) {
  const { theme } = useTheme();
  const isClaude = theme === 'claude';

  /* ── System / director note ── */
  if (message.role === 'system') {
    return (
      <div
        className="mx-auto my-2 max-w-xl rounded-lg px-3 py-2 text-xs"
        style={{
          background: 'color-mix(in oklab, var(--surface-soft) 70%, transparent)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
          borderRadius: 'var(--radius-card)',
        }}
      >
        Director Note: {message.content}
      </div>
    );
  }

  const isLeft = message.side === 'ai1';
  const color = isLeft ? 'var(--ai1)' : 'var(--ai2)';
  const modelMeta = MODEL_BY_ID[message.model];
  const displayName = modelMeta?.label || message.model;
  const modelIcon = modelMeta?.icon || '';
  const hasError = message.status === 'error';
  const isInterrupted = message.status === 'interrupted';
  const showAvatar = !isClaude || message.side === 'ai1' || message.side === 'ai2';

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`msg-card msg-card--${message.side} ${isClaude ? 'claude-msg-card' : ''}`}
    >
      {/* Header row */}
      <div className="msg-header-row">
        <div className="msg-header-main">
          {showAvatar && (!isClaude || message.side === 'ai1') && (
            isClaude ? (
              <div className="claude-ai-avatar" aria-label={`${displayName} avatar`}>
                <img
                  src={modelIcon}
                  alt=""
                  className="chat-msg-avatar-image"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className={`chat-msg-avatar chat-msg-avatar--${message.side}`} aria-label={`${displayName} avatar`}>
                <img
                  src={modelIcon}
                  alt=""
                  className="chat-msg-avatar-image"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )
          )}
          <div className="msg-author-wrap">
            <span
              className="msg-author-name"
              style={
                isClaude
                  ? undefined
                  : {
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color,
                    fontFamily: 'var(--font-display)',
                  }
              }
            >
              {isClaude ? displayName : message.persona}
            </span>
          </div>
          {showAvatar && isClaude && message.side === 'ai2' && (
            <div className="claude-ai-avatar" aria-label={`${displayName} avatar`}>
              <img
                src={modelIcon}
                alt=""
                className="chat-msg-avatar-image"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

      </div>

      {/* Streaming indicator */}
      {message.status === 'streaming' && !message.content && (
        <TypingIndicator color={isLeft ? 'var(--ai1)' : 'var(--ai2)'} />
      )}

      {/* Error */}
      {hasError && (
        <div
          style={{
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            borderRadius: '8px',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            background: 'color-mix(in oklab, var(--danger) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--danger) 40%, transparent)',
            color: 'var(--danger)',
          }}
        >
          <AlertTriangle size={13} />
          {message.error || 'Stream failed.'}
        </div>
      )}

      {/* Interrupted */}
      {isInterrupted && (
        <p
          style={{
            marginBottom: '0.5rem',
            display: 'inline-block',
            padding: '0.125rem 0.5rem',
            fontSize: '0.75rem',
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.35)',
            color: '#fbbf24',
            borderRadius: '6px',
          }}
        >
          interrupted
        </p>
      )}

      {/* Content */}
      <div className="msg-content-shell">
        <div
          className="msg-markdown text-sm leading-relaxed"
          style={{
            color: 'var(--text-primary)',
            lineHeight: theme === 'claude' ? 1.7 : 1.6,
            fontFamily: theme === 'claude' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' : undefined,
            fontSize: theme === 'claude' ? '0.95rem' : undefined,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ' '}</ReactMarkdown>
        </div>

      </div>

      {/* Retry */}
      {!readOnly && (hasError || isInterrupted) && onRetry && (
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem', minHeight: '28px' }}
          onClick={onRetry}
        >
          <RotateCcw size={12} /> Retry
        </button>
      )}
    </motion.article>
  );
}
