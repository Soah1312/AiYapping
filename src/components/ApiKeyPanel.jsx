import { useMemo, useState } from 'react';
import { ChevronDown, KeyRound } from 'lucide-react';

const PROVIDER_KEY_MAP = [
  {
    provider: 'Groq',
    envKey: 'GROQ_KEY_*',
    models: 'All models under provider = groq',
  },
  {
    provider: 'Hugging Face',
    envKey: 'HUGGINGFACE_KEY_*',
    models: 'All models under provider = huggingface',
  },
  {
    provider: 'NVIDIA',
    envKey: 'NVIDIA_KEY_*',
    models: 'All models under provider = nvidia',
  },
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
          <span className="display-font text-lg">Provider Key Mapping</span>
          {activeCount > 0 && <span className="text-xs text-[var(--text-muted)]">{activeCount} local values</span>}
        </div>
        <ChevronDown
          size={18}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="mt-4 grid gap-3">
          {PROVIDER_KEY_MAP.map((entry) => (
            <div
              key={entry.provider}
              className="rounded-lg border p-3"
              style={{ borderColor: 'var(--border)', background: 'color-mix(in oklab, var(--surface-soft) 62%, transparent)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{entry.provider}</p>
                <span
                  className="rounded-md border px-2 py-0.5 text-[11px]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                >
                  {entry.envKey}
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {entry.models}
              </p>
            </div>
          ))}
          <p className="text-xs text-[var(--text-muted)]">
            Configure these values in your server environment or local `.env` file.
          </p>
        </div>
      )}
    </section>
  );
}
