import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';

function normalizeVerdict(verdict) {
  if (!verdict) {
    return { text: '', winner: '', scores: [] };
  }

  if (typeof verdict === 'string') {
    return { text: verdict.trim(), winner: '', scores: [] };
  }

  const scores = Array.isArray(verdict.scores)
    ? verdict.scores
        .map((row) => ({
          name: String(row?.name || '').trim(),
          score: Number(row?.score),
        }))
        .filter((row) => row.name && Number.isFinite(row.score))
    : [];

  return {
    text: String(verdict.verdict || '').trim(),
    winner: String(verdict.winner || '').trim(),
    scores,
  };
}

const VerdictCard = ({ verdict }) => {
  const normalized = normalizeVerdict(verdict);
  if (!normalized.text) {
    return null;
  }

  const hasChart = normalized.scores.length >= 2;

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
        {normalized.winner && (
          <p className="verdict-winner-line">
            Winner: <strong>{normalized.winner}</strong>
          </p>
        )}

        {hasChart ? (
          <div className="verdict-score-chart" role="img" aria-label="Judge score chart">
            {normalized.scores.map((entry) => {
              const clamped = Math.max(0, Math.min(10, Number(entry.score)));
              const width = `${(clamped / 10) * 100}%`;

              return (
                <div key={entry.name} className="verdict-score-row">
                  <span className="verdict-score-name">{entry.name}</span>
                  <div className="verdict-score-track">
                    <div className="verdict-score-fill" style={{ width }} />
                  </div>
                  <span className="verdict-score-value">{clamped.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <pre className="verdict-text">{normalized.text}</pre>
        )}
      </div>
    </motion.div>
  );
};

export default VerdictCard;
