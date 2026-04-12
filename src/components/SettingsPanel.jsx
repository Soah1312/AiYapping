import React from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { PERSONALITY_PRESETS, QUICK_PAIRINGS } from '../lib/presets';

export default function SettingsPanel({ open, onClose }) {
  const {
    turns,
    setTurns,
    ai1PresetId,
    ai2PresetId,
    ai1Temperature,
    ai2Temperature,
    ai1MaxTokens,
    ai2MaxTokens,
    applyPresetToAI1,
    applyPresetToAI2,
    applyQuickPairing,
    setAI1Temperature,
    setAI2Temperature,
    setAI1MaxTokens,
    setAI2MaxTokens
  } = useSettingsStore();

  const handleQuickPairing = (pairing) => {
    applyQuickPairing(pairing);
  };

  const presetList = Object.values(PERSONALITY_PRESETS);

  return (
    <>
      <div 
        onClick={onClose} 
        style={{
          display: open ? 'block' : 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          backgroundColor: 'rgba(0,0,0,0.3)'
        }}
      />
      <div 
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: '380px',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-color)',
          zIndex: 1000,
          padding: '24px',
          overflowY: 'auto',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease'
        }}
        className="settings-panel scrollbar-thin"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>⚙ Duel Settings</h2>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              fontSize: '1.5rem', 
              cursor: 'pointer' 
            }}
          >
            ×
          </button>
        </div>

        <div style={{ 
          fontSize: '0.7rem', 
          letterSpacing: '0.08em', 
          textTransform: 'uppercase', 
          color: 'var(--text-secondary)', 
          marginBottom: '12px', 
          marginTop: '20px' 
        }}>
          QUICK PAIRINGS
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {QUICK_PAIRINGS.map((pairing, i) => (
            <button
              key={i}
              onClick={() => handleQuickPairing(pairing)}
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              {pairing.emoji} {pairing.name}
            </button>
          ))}
        </div>

        <div style={{ 
          fontSize: '0.7rem', 
          letterSpacing: '0.08em', 
          textTransform: 'uppercase', 
          color: 'var(--text-secondary)', 
          marginBottom: '12px', 
          marginTop: '24px' 
        }}>
          TURNS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>4</span>
          <input 
            type="range" 
            min="4" 
            max="30" 
            value={turns} 
            onChange={(e) => setTurns(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
          />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>30</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 'bold', width: '28px', textAlign: 'right' }}>[{turns}]</span>
        </div>

        <div style={{ display: 'flex', marginTop: '32px', gap: '20px' }}>
          {/* AI-1 Section */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
              AI-1
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Preset</label>
              <select 
                value={ai1PresetId} 
                onChange={(e) => applyPresetToAI1(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-hover)',
                  border: ai1PresetId !== 'custom' ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              >
                <option value="custom">Custom Parameters</option>
                {presetList.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                ))}
              </select>
              {ai1PresetId !== 'custom' && PERSONALITY_PRESETS[ai1PresetId] && (
                <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  "{PERSONALITY_PRESETS[ai1PresetId].description}"
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Temp <span style={{ float: 'right', color: 'var(--text-primary)' }}>[{ai1Temperature}]</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>0</span>
                <input 
                  type="range" 
                  min="0" max="2" step="0.1" 
                  value={ai1Temperature} 
                  onChange={(e) => setAI1Temperature(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>2</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Max Tokens <span style={{ float: 'right', color: 'var(--text-primary)' }}>[{ai1MaxTokens}]</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>256</span>
                <input 
                  type="range" 
                  min="256" max="4096" step="64" 
                  value={ai1MaxTokens} 
                  onChange={(e) => setAI1MaxTokens(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent)' }}
                />
              </div>
            </div>
          </div>

          {/* AI-2 Section */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>
              AI-2
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Preset</label>
              <select 
                value={ai2PresetId} 
                onChange={(e) => applyPresetToAI2(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-hover)',
                  border: ai2PresetId !== 'custom' ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              >
                <option value="custom">Custom Parameters</option>
                {presetList.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                ))}
              </select>
              {ai2PresetId !== 'custom' && PERSONALITY_PRESETS[ai2PresetId] && (
                <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  "{PERSONALITY_PRESETS[ai2PresetId].description}"
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Temp <span style={{ float: 'right', color: 'var(--text-primary)' }}>[{ai2Temperature}]</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>0</span>
                <input 
                  type="range" 
                  min="0" max="2" step="0.1" 
                  value={ai2Temperature} 
                  onChange={(e) => setAI2Temperature(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>2</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Max Tokens <span style={{ float: 'right', color: 'var(--text-primary)' }}>[{ai2MaxTokens}]</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>256</span>
                <input 
                  type="range" 
                  min="256" max="4096" step="64" 
                  value={ai2MaxTokens} 
                  onChange={(e) => setAI2MaxTokens(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent)' }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
