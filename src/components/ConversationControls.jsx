import { Pause, Play, Square, CornerDownLeft } from 'lucide-react';

export default function ConversationControls({
  status,
  turnCount,
  allowManualStop = true,
  onPause,
  onResume,
  onStop,
  onOpenRedirect,
}) {
  const paused = status === 'paused';

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-6"
      style={{
        background: 'color-mix(in oklab, var(--bg) 94%, transparent)',
        backdropFilter: 'blur(14px)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2">
        <div
          className="px-3 py-1 text-xs"
          style={{
            border: '1px solid var(--border)',
            borderRadius: '999px',
            color: 'var(--text-muted)',
          }}
        >
          Turns: {turnCount}
        </div>

        <div className="flex items-center gap-2">
          {paused ? (
            <button
              type="button"
              onClick={onResume}
              className="btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.875rem' }}
            >
              <Play size={13} /> Keep going
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
            >
              <Pause size={13} /> Hold up
            </button>
          )}

          <button
            type="button"
            onClick={onOpenRedirect}
            className="btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
          >
            <CornerDownLeft size={13} /> Redirect
          </button>

          {allowManualStop && (
            <button
              type="button"
              onClick={onStop}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                background: 'var(--danger)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-btn)',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.375rem 0.875rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Square size={13} /> Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
