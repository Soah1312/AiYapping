import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import TypingIndicator from './TypingIndicator';
import { MODEL_BY_ID } from '../lib/modelConfig';

function formatTimestamp(ts) {
  if (!ts) {
    return '';
  }

  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageCard({ message, onRetry, readOnly = false }) {
  if (message.role === 'system') {
    return (
      <div className="mx-auto my-2 max-w-xl rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-muted)]">
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
      initial={{ opacity: 0, x: isLeft ? -18 : 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`w-full ${isLeft ? 'pr-6 md:pr-24' : 'pl-6 md:pl-24'}`}
    >
      <div
        className="surface-card p-3"
        style={{
          borderColor: hasError ? 'var(--danger)' : `${color}66`,
          boxShadow: `0 10px 30px color-mix(in oklab, ${color} 20%, transparent)`,
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {modelMeta?.icon && (
              <img
                src={modelMeta.icon}
                alt={`${modelMeta.label} logo`}
                aria-label={`${modelMeta.label} logo`}
                className="h-8 w-8 rounded-md"
              />
            )}
            <div>
              <p className="small-caps text-xs" style={{ color }}>
                {message.persona}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{modelMeta?.label || message.model}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs">Turn {message.turn}</span>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">{formatTimestamp(message.timestamp)}</p>
          </div>
        </div>

        {message.status === 'streaming' && !message.content && <TypingIndicator color={isLeft ? '#4f9eff' : '#ff7043'} />}

        {hasError && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-[var(--danger)]/50 bg-[var(--danger)]/10 px-2 py-1 text-xs text-[var(--danger)]">
            <AlertTriangle size={14} />
            <span>{message.error || 'Message failed to stream.'}</span>
          </div>
        )}

        {isInterrupted && (
          <p className="mb-2 inline-block rounded border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
            interrupted
          </p>
        )}

        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content || ' '}</p>

        {!readOnly && (hasError || isInterrupted) && onRetry && (
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
            onClick={onRetry}
          >
            <RotateCcw size={13} /> Retry
          </button>
        )}
      </div>
    </motion.article>
  );
}
