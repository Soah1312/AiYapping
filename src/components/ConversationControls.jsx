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
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0b0b12]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2">
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-[var(--text-muted)]">
          Turns: {turnCount}
        </div>

        <div className="flex items-center gap-2">
          {paused ? (
            <button
              type="button"
              onClick={onResume}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--ai1)] px-3 py-2 text-xs font-medium text-black"
            >
              <Play size={14} /> Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs"
            >
              <Pause size={14} /> Pause
            </button>
          )}

          <button
            type="button"
            onClick={onOpenRedirect}
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs"
          >
            <CornerDownLeft size={14} /> Redirect
          </button>

          {allowManualStop && (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--danger)] px-3 py-2 text-xs font-medium text-white"
            >
              <Square size={14} /> Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
