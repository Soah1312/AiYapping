import { useMemo, useState } from 'react';
import { ChevronDown, KeyRound } from 'lucide-react';

const KEY_FIELDS = [
  { id: 'anthropic', label: 'Anthropic API Key' },
  { id: 'openai', label: 'OpenAI API Key' },
  { id: 'google', label: 'Google API Key' },
];

export default function ApiKeyPanel({ keys, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const activeCount = useMemo(
    () => Object.values(keys || {}).filter((value) => Boolean(value)).length,
    [keys],
  );

  return (
    <section className="surface-card p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <KeyRound size={16} />
          <span className="display-font text-lg">API Keys (Optional)</span>
          {activeCount > 0 && <span className="text-xs text-[var(--text-muted)]">{activeCount} saved</span>}
        </div>
        <ChevronDown
          size={18}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="mt-4 grid gap-3">
          {KEY_FIELDS.map((field) => (
            <label key={field.id} className="grid gap-1 text-xs text-[var(--text-muted)]" htmlFor={field.id}>
              {field.label}
              <input
                id={field.id}
                type="password"
                autoComplete="off"
                value={keys[field.id] || ''}
                onChange={(event) => onChange({ ...keys, [field.id]: event.target.value.trim() })}
                className="rounded-lg border border-white/10 bg-[#0f0f16] p-2 text-sm text-[var(--text-primary)]"
                placeholder="Enter key"
              />
            </label>
          ))}
          <p className="text-xs text-[var(--text-muted)]">
            Keys stay in localStorage and are used only for direct proxied model requests.
          </p>
        </div>
      )}
    </section>
  );
}
