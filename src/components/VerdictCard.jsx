import { motion } from 'framer-motion';

export default function VerdictCard({ verdict }) {
  if (!verdict) {
    return null;
  }

  return (
    <motion.section
      className="surface-card p-5"
      initial={{ opacity: 0, scale: 0.93, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <p className="small-caps mb-2 text-xs text-[var(--text-muted)]">Verdict</p>
      <div className="mb-2 text-2xl display-font">
        Winner: <span className="text-[var(--ai1)]">{verdict.winner || 'Draw'}</span>
      </div>
      {verdict.margin && <p className="text-sm text-[var(--text-muted)]">Margin: {verdict.margin}</p>}
      {verdict.reasoning && <p className="mt-3 text-sm leading-relaxed">{verdict.reasoning}</p>}
      {verdict.summary && <p className="mt-3 text-sm text-[var(--text-muted)]">Summary: {verdict.summary}</p>}
    </motion.section>
  );
}
