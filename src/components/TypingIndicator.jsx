import { motion } from 'framer-motion';

const dotVariants = {
  start: { y: 0, opacity: 0.35 },
  animate: {
    y: [-2, 2, -2],
    opacity: [0.35, 1, 0.35],
  },
};

export default function TypingIndicator({ color = '#4f9eff' }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full px-2 py-1" aria-live="polite" aria-label="Model is typing">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
          variants={dotVariants}
          initial="start"
          animate="animate"
          transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.12 }}
        />
      ))}
    </div>
  );
}
