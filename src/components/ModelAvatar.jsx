const PROVIDER_COLORS = {
  groq: '#F55036',
  huggingface: '#FFD21E',
  nvidia: '#76B900',
};

const PROVIDER_LABELS = {
  groq: 'G',
  huggingface: 'HF',
  nvidia: 'NV',
};

export default function ModelAvatar({ provider, label, size = 32 }) {
  const bg = PROVIDER_COLORS[provider] || '#666';
  const letter = PROVIDER_LABELS[provider] || '?';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size > 28 ? 10 : 8,
        background: `linear-gradient(135deg, ${bg}, ${bg}cc)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 700,
        color: provider === 'huggingface' ? '#1A1A1A' : '#FFFFFF',
        flexShrink: 0,
        letterSpacing: '-0.02em',
      }}
      title={label}
      aria-label={`${label} avatar`}
    >
      {letter}
    </div>
  );
}
