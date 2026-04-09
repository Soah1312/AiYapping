import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import TypingIndicator from './TypingIndicator';
import { MODEL_BY_ID } from '../lib/modelConfig';
import { useTheme } from '../context/ThemeContext';

function formatTimestamp(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageCard({ message, onRetry, readOnly = false }) {
  const { theme } = useTheme();

  /* ── System / director note ─────────────────────────────── */
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

  /* ── GPT layout: avatar left, text floats, different per side */
  if (theme === 'gpt') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`msg-card msg-card--${message.side} w-full px-4 py-4`}
      >
        <div className="gpt-arena-layout mx-auto flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0 pt-0.5">
            {modelMeta?.icon ? (
              <img
                src={modelMeta.icon}
                alt={`${modelMeta.label} logo`}
                className="h-7 w-7 rounded-full"
                style={{ background: 'var(--surface-soft)', padding: '3px' }}
              />
            ) : (
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: 'var(--surface-soft)', color }}
              >
                {isLeft ? '1' : '2'}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-sm font-semibold" style={{ color, fontFamily: 'var(--font-display)' }}>
                {message.persona}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {modelMeta?.label || message.model}
              </span>
              <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                {formatTimestamp(message.timestamp)}
              </span>
            </div>

            {message.status === 'streaming' && !message.content && (
              <TypingIndicator color={isLeft ? '#10a37f' : '#8e8ea0'} />
            )}
            {hasError && (
              <div className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertTriangle size={13} />
                {message.error || 'Stream failed.'}
              </div>
            )}
            {isInterrupted && (
              <p className="mb-2 text-xs px-2 py-1 rounded" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
                interrupted
              </p>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
              {message.content || ' '}
            </p>
            {!readOnly && (hasError || isInterrupted) && onRetry && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'transparent', cursor: 'pointer' }}
                onClick={onRetry}
              >
                <RotateCcw size={12} /> Retry
              </button>
            )}
          </div>
        </div>
      </motion.article>
    );
  }

  /* ── Claude & Gemini: card layout with slide-in animation ── */
  return (
    <motion.article
      initial={{ opacity: 0, x: isLeft ? -14 : 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`w-full ${isLeft ? 'pr-4 md:pr-16' : 'pl-4 md:pl-16'}`}
    >
      <div
        className={`msg-card msg-card--${message.side} p-4`}
        style={{
          borderColor: hasError
            ? 'var(--danger)'
            : theme === 'gemini'
              ? undefined  /* gemini border set in CSS */
              : `color-mix(in oklab, ${color} 30%, var(--border))`,
        }}
      >
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {modelMeta?.icon && (
              <img
                src={modelMeta.icon}
                alt={`${modelMeta.label} logo`}
                className="h-8 w-8 rounded-lg"
                style={{
                  background: theme === 'claude' ? '#f0eee6' : 'var(--surface-soft)',
                  padding: '4px',
                }}
              />
            )}
            <div>
              <p
                className="small-caps text-xs font-medium"
                style={{ color, fontFamily: 'var(--font-display)' }}
              >
                {message.persona}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {modelMeta?.label || message.model}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span
              className="text-xs px-2 py-0.5"
              style={{
                border: '1px solid var(--border)',
                borderRadius: '999px',
                color: 'var(--text-muted)',
              }}
            >
              Turn {message.turn}
            </span>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {formatTimestamp(message.timestamp)}
            </p>
          </div>
        </div>

        {/* Streaming indicator */}
        {message.status === 'streaming' && !message.content && (
          <TypingIndicator color={isLeft ? 'var(--ai1)' : 'var(--ai2)'} />
        )}

        {/* Error */}
        {hasError && (
          <div
            className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1 text-xs"
            style={{
              background: 'color-mix(in oklab, var(--danger) 10%, transparent)',
              border: '1px solid color-mix(in oklab, var(--danger) 40%, transparent)',
              color: 'var(--danger)',
              borderRadius: '8px',
            }}
          >
            <AlertTriangle size={13} />
            {message.error || 'Message failed to stream.'}
          </div>
        )}

        {/* Interrupted */}
        {isInterrupted && (
          <p
            className="mb-2 inline-block px-2 py-1 text-xs"
            style={{
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
        <p
          className="whitespace-pre-wrap text-sm leading-relaxed"
          style={{
            color: 'var(--text-primary)',
            lineHeight: theme === 'claude' ? 1.7 : 1.6,
            fontFamily: theme === 'claude' ? 'var(--font-body)' : undefined,
          }}
        >
          {message.content || ' '}
        </p>

        {/* Retry */}
        {!readOnly && (hasError || isInterrupted) && onRetry && (
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs px-2.5 py-1.5"
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-btn)',
              color: 'var(--text-muted)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
            onClick={onRetry}
          >
            <RotateCcw size={12} /> Retry
          </button>
        )}
      </div>
    </motion.article>
  );
}
