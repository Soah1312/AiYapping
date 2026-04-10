import { MODEL_BY_ID, MODEL_OPTIONS } from '../lib/modelConfig';

export default function ModelPicker({
  title,
  accent,
  model,
  persona,
  onModelChange,
  onPersonaChange,
}) {
  const activeModel = MODEL_BY_ID[model] || MODEL_OPTIONS[0];
  const groupedModels = MODEL_OPTIONS.reduce(
    (acc, option) => {
      const key = option.provider || 'other';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(option);
      return acc;
    },
    { groq: [], huggingface: [], other: [] },
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
        </div>
      </div>

      <label className="mt-4 block text-xs text-[var(--text-muted)]" htmlFor={`${title}-model`}>
        Model
      </label>
      <select
        id={`${title}-model`}
        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0f16] p-2 text-sm"
        value={model}
        onChange={(event) => onModelChange(event.target.value)}
      >
        {groupedModels.groq.length > 0 && (
          <optgroup label="Groq">
            {groupedModels.groq.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </optgroup>
        )}
        {groupedModels.huggingface.length > 0 && (
          <optgroup label="Hugging Face">
            {groupedModels.huggingface.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </optgroup>
        )}
        {groupedModels.other.length > 0 &&
          groupedModels.other.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
      </select>

      <label className="mt-4 block text-xs text-[var(--text-muted)]" htmlFor={`${title}-persona`}>
        Persona Label (optional)
      </label>
      <input
        id={`${title}-persona`}
        className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f0f16] p-2 text-sm"
        value={persona}
        onChange={(event) => onPersonaChange(event.target.value.slice(0, 60))}
        placeholder="e.g. The Optimist"
      />
    </section>
  );
}
