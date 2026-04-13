import { MODEL_BY_ID, MODEL_OPTIONS } from '../lib/modelConfig';
import ModelAvatar from './ModelAvatar';

export default function ModelPicker({
  title,
  accent,
  model,
  modelOptions,
  openingSeed,
  onOpeningSeedChange,
  seedLabel,
  seedPlaceholder,
  persona,
  onModelChange,
  onPersonaChange,
}) {
  const availableOptions = Array.isArray(modelOptions) && modelOptions.length > 0 ? modelOptions : MODEL_OPTIONS;
  const selectedFromVisibleOptions = availableOptions.find(
    (option) => option.id === model || option.model === model,
  );
  const activeModel = selectedFromVisibleOptions || MODEL_BY_ID[model] || availableOptions[0] || MODEL_OPTIONS[0];
  const selectedValue = selectedFromVisibleOptions?.id || activeModel.id;
  const seedValue = typeof openingSeed === 'string' ? openingSeed : (persona || '');
  const handleSeedChange = onOpeningSeedChange || onPersonaChange;
  const activeProviderLabel =
    activeModel.provider === 'huggingface'
      ? 'Hugging Face'
      : activeModel.provider === 'nvidia'
        ? 'NVIDIA'
        : activeModel.provider === 'openrouter'
          ? 'OpenRouter'
          : activeModel.provider === 'puter'
            ? 'Puter'
          : activeModel.provider === 'github-models'
            ? 'GitHub Models'
          : 'Groq';

  const grouped = availableOptions.reduce(
    (acc, item) => {
      if (item.provider === 'huggingface') acc.huggingface.push(item);
      else if (item.provider === 'nvidia') acc.nvidia.push(item);
      else if (item.provider === 'openrouter') acc.openrouter.push(item);
      else if (item.provider === 'puter') acc.puter.push(item);
      else if (item.provider === 'github-models') acc.githubModels.push(item);
      else acc.groq.push(item);
      return acc;
    },
    { groq: [], huggingface: [], nvidia: [], openrouter: [], puter: [], githubModels: [] },
  );

  return (
    <section className="surface-card" style={{ padding: '1rem', borderColor: accent ? `color-mix(in oklab, ${accent} 40%, var(--border))` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
        <ModelAvatar icon={activeModel.icon} label={activeModel.label} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '1px' }}>{activeModel.label} · {activeProviderLabel}</p>
        </div>
      </div>

      <label style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }} htmlFor={`${title}-model`}>
        Model
      </label>
      <select
        id={`${title}-model`}
        className="theme-input"
        style={{ fontSize: '0.8125rem', padding: '0.5rem 0.625rem', marginBottom: '0.75rem' }}
        value={selectedValue}
        onChange={(e) => onModelChange(e.target.value)}
      >
        {grouped.groq.length > 0 && (
          <optgroup label="Groq">
            {grouped.groq.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </optgroup>
        )}
        {grouped.openrouter.length > 0 && (
          <optgroup label="OpenRouter">
            {grouped.openrouter.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </optgroup>
        )}
        {grouped.githubModels.length > 0 && (
          <optgroup label="GitHub Models">
            {grouped.githubModels.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </optgroup>
        )}
        {grouped.puter.length > 0 && (
          <optgroup label="Puter">
            {grouped.puter.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </optgroup>
        )}
        {grouped.huggingface.length > 0 && (
          <optgroup label="Hugging Face">
            {grouped.huggingface.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </optgroup>
        )}
        {grouped.nvidia.length > 0 && (
          <optgroup label="NVIDIA">
            {grouped.nvidia.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </optgroup>
        )}
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
