import { hapticMedium } from '../lib/haptics';

export default function DuelControls({ 
  status, 
  onPause, 
  onResume, 
  onStop, 
  onNewChat,
}) {
  return (
    <div className="bottom-bar">
      <div className="bottom-bar-inner">
        {status === 'running' && (
          <span className="status-badge" style={{ borderColor: 'var(--ai1)', color: 'var(--ai1)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ai1)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            Streaming
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {status === 'paused' ? (
            <button type="button" className="btn-primary" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', minHeight: '36px' }} onClick={(e) => { hapticMedium(); onResume(e); }}>Keep going</button>
          ) : status === 'running' ? (
            <button type="button" className="btn-secondary" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', minHeight: '36px' }} onClick={(e) => { hapticMedium(); onPause(e); }}>Hold up</button>
          ) : null}
          {(status === 'running' || status === 'paused') && (
            <button type="button" className="btn-secondary" style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', minHeight: '36px' }} onClick={(e) => { hapticMedium(); onStop(e); }}>Abort</button>
          )}
          {status === 'completed' && (
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', minHeight: '36px' }}
              onClick={(e) => { hapticMedium(); onNewChat(e); }}
            >
              Round 2
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
