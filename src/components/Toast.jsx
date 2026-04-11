import { useEffect } from 'react';
import { Check, AlertCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  const bgColor = type === 'success' ? 'var(--ai1)' : type === 'error' ? '#DC2626' : 'var(--ai2)';
  const Icon = type === 'success' ? Check : type === 'error' ? AlertCircle : AlertCircle;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-4 py-3 rounded-lg flex items-center gap-2 text-black font-medium text-sm"
      style={{ background: bgColor, animation: 'slideUp 0.3s ease-out' }}
    >
      <Icon size={16} />
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:opacity-70 transition-opacity"
        aria-label="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}
