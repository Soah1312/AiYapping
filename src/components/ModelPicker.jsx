import { MODEL_BY_ID, MODEL_OPTIONS } from '../lib/modelConfig';

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
      if (item.provider === 'huggingface') {
        acc.huggingface.push(item);
      } else {
        acc.groq.push(item);
      }
      return acc;
    },
    { groq: [], huggingface: [] },
  );

  return (
    <section className="surface-card p-4" style={{ borderColor: `${accent}66` }}>
      <p className="small-caps text-xs text-[var(--text-muted)]">{title}</p>
      <div className="mt-3 flex items-center gap-3 rounded-lg bg-black/20 p-3">
        <img
          src={activeModel.icon}
          alt={`${activeModel.label} logo`}
          aria-label={`${activeModel.label} logo`}
          className="h-9 w-9 rounded-md object-cover"
        />
        <div>
          <p className="text-sm font-medium">{activeModel.label}</p>
          <p className="text-xs text-[var(--text-muted)]">{activeModel.flavor}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            Provider: {activeModel.provider === 'huggingface' ? 'Hugging Face' : 'Groq'}
          </p>
        </div>
      </div>

      <label className="mt-4 block text-xs text-[var(--text-muted)]" htmlFor={`${title}-model`}>
        Model
      </label>
      <select
        id={`${title}-model`}
        className="theme-input theme-select mt-1"
        value={model}
        onChange={(event) => onModelChange(event.target.value)}
      >
        <optgroup label="Groq">
          {grouped.groq.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Hugging Face">
          {grouped.huggingface.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </optgroup>
      </select>

      <label className="mt-4 block text-xs text-[var(--text-muted)]" htmlFor={`${title}-seed`}>
        {seedLabel || 'Prompt (required)'}
      </label>
      <textarea
        id={`${title}-seed`}
        className="theme-input mt-1 min-h-20 resize-none"
        value={seedValue}
        onChange={(event) => handleSeedChange?.(event.target.value.slice(0, 200))}
        placeholder={seedPlaceholder || 'Describe how this AI should start speaking'}
      />
    </section>
  );
}
