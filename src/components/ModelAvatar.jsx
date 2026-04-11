export default function ModelAvatar({ icon, label, size = 32 }) {
  const isKimiIcon = typeof icon === 'string' && icon.includes('/icons/kimi-color.svg');

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size > 28 ? 10 : 8,
        background: isKimiIcon ? '#0f172a' : 'transparent',
        border: isKimiIcon ? '1px solid rgba(15, 23, 42, 0.12)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
      title={label}
      aria-label={`${label} avatar`}
    >
      <img
        src={icon}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
