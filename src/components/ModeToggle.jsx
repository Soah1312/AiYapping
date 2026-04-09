import { motion } from 'framer-motion';

const MODES = [
  { id: 'debate', label: 'Debate Mode' },
  { id: 'chat', label: 'Chat Mode' },
];

export default function ModeToggle({ value, onChange }) {
  return (
    <div className="relative grid grid-cols-2 rounded-xl bg-[#0f0f16] p-1">
      <motion.div
        className="absolute inset-y-1 rounded-lg bg-white/10"
        initial={false}
        animate={{
          x: value === 'debate' ? '0%' : '100%',
          width: 'calc(50% - 4px)',
        }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      />
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onChange(mode.id)}
          className={`relative z-10 rounded-lg px-3 py-2 text-sm transition ${
            value === mode.id ? 'text-white' : 'text-[var(--text-muted)]'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
