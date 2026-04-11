import { MODEL_BY_ID, MODEL_OPTIONS } from '../lib/modelConfig';
import ModelAvatar from './ModelAvatar';

export default function ModelPicker({
  title,
  accent,
  model,
  openingSeed,
  onOpeningSeedChange,
  seedLabel,
  seedPlaceholder,
  persona,
  onModelChange,
  onPersonaChange,
}) {
  const activeModel = MODEL_BY_ID[model] || MODEL_OPTIONS[0];
  const seedValue = typeof openingSeed === 'string' ? openingSeed : (persona || '');
  const handleSeedChange = onOpeningSeedChange || onPersonaChange;

  const grouped = MODEL_OPTIONS.reduce(
    (acc, item) => {
      if (item.provider === 'huggingface') acc.huggingface.push(item);
      else if (item.provider === 'nvidia') acc.nvidia.push(item);
      else acc.groq.push(item);
      return acc;
    },
    { groq: [], huggingface: [], nvidia: [] },
  );

  return (
    <section className="surface-card" style={{ padding: '1rem', borderColor: accent ? `color-mix(in oklab, ${accent} 40%, var(--border))` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
        <ModelAvatar icon={activeModel.icon} label={activeModel.label} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '1px' }}>{activeModel.label} · {activeModel.provider === 'huggingface' ? 'Hugging Face' : activeModel.provider === 'nvidia' ? 'NVIDIA' : 'Groq'}</p>
        </div>
      </div>

      <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }} htmlFor={`${title}-model`}>
        Model
      </label>
      <select
        id={`${title}-model`}
        className="theme-input"
        style={{ fontSize: '0.8125rem', padding: '0.5rem 0.625rem', marginBottom: '0.75rem' }}
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
      >
        <optgroup label="Groq">
          {grouped.groq.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </optgroup>
        <optgroup label="Hugging Face">
          {grouped.huggingface.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </optgroup>
        <optgroup label="NVIDIA">
          {grouped.nvidia.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </optgroup>
      </select>

      <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }} htmlFor={`${title}-seed`}>
        {seedLabel || 'Prompt (required)'}
      </label>
      <textarea
        id={`${title}-seed`}
        className="theme-input"
        style={{ minHeight: '5rem', resize: 'none', fontSize: '0.8125rem', padding: '0.5rem 0.625rem' }}
        value={seedValue}
        onChange={(e) => handleSeedChange?.(e.target.value.slice(0, 200))}
        placeholder={seedPlaceholder || 'Describe how this AI should start speaking'}
      />
    </section>
  );
}
