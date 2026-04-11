import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TypingIndicator from './TypingIndicator';
import ModelAvatar from './ModelAvatar';
import { MODEL_BY_ID } from '../lib/modelConfig';
import { useTheme } from '../context/ThemeContext';

function formatTimestamp(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageCard({ message, onRetry, readOnly = false }) {
  const { theme } = useTheme();

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
  const hasError = message.status === 'error';
  const isInterrupted = message.status === 'interrupted';

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`msg-card msg-card--${message.side}`}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
        <ModelAvatar
          provider={modelMeta?.provider || 'groq'}
          label={modelMeta?.label || message.model}
          size={28}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color,
              fontFamily: 'var(--font-display)',
            }}
          >
            {message.persona}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            {modelMeta?.label || message.model}
          </span>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {message.turn && (
            <span className="status-badge" style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem' }}>
              T{message.turn}
            </span>
          )}
          <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
            {formatTimestamp(message.timestamp)}
          </span>
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
      <div
        className="msg-markdown text-sm leading-relaxed"
        style={{
          color: 'var(--text-primary)',
          lineHeight: theme === 'claude' ? 1.7 : 1.6,
          fontFamily: theme === 'claude' ? 'var(--font-body)' : undefined,
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || ' '}</ReactMarkdown>
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
