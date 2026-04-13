import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';

const VerdictCard = ({ verdict }) => {
  if (!verdict) {
    return null;
  }

  return (
    <motion.div
      className="verdict-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="verdict-header">
        <Scale className="verdict-gavel" aria-hidden="true" size={18} />
        <h3 className="verdict-title">The Verdict</h3>
        <span className="verdict-badge">GPT-4.1</span>
      </div>
      <div className="verdict-body">
        <pre className="verdict-text">{verdict}</pre>
      </div>
    </motion.div>
  );
};

export default VerdictCard;
