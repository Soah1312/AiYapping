import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Scale } from 'lucide-react';
import { getVerdictUsage, incrementVerdictUsage } from '../lib/verdictTracker';
import { getJudgeVerdict } from '../lib/judge';
import { useConversationStore } from '../store/conversationStore';

const EXHAUSTED_MESSAGES = [
  'Three verdicts and you want more? The judge has a life.',
  'Bold of you to think the judge is not tired. Come back tomorrow.',
  'The judge clocked out. Three is the limit. Touch grass.',
  'Verdict limit reached. The judge is not your personal referee.',
  'Three judgments a day keeps the bankruptcy away. See you tomorrow.',
];

const VerdictButton = ({
  transcript,
  ai1Name,
  ai2Name,
  topic,
  onVerdictReceived,
  hasVerdict,
}) => {
  const chaosMode = useConversationStore((state) => state.chaosMode);
  const [usage, setUsage] = useState({ used: 0, remaining: 3 });
  const [loading, setLoading] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      const next = await getVerdictUsage();
      if (mounted) {
        setUsage(next);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const isExhausted = usage.remaining <= 0;
  const isDisabled = !chaosMode || isExhausted || loading || hasVerdict;

  const getTooltipMessage = () => {
    if (hasVerdict) {
      return 'Verdict already generated for this duel.';
    }

    if (!chaosMode) {
      return 'Enable chaos mode to unlock the judge.';
    }

    if (isExhausted) {
      return EXHAUSTED_MESSAGES[Math.floor(Math.random() * EXHAUSTED_MESSAGES.length)];
    }

    return '';
  };

  const showTooltip = () => {
    const msg = getTooltipMessage();
    if (msg) {
      setTooltipMessage(msg);
      setTooltipVisible(true);
    }
  };

  const hideTooltip = () => {
    setTooltipVisible(false);
  };

  const handleGetVerdict = async () => {
    if (isDisabled) {
      return;
    }

    setLoading(true);

    await incrementVerdictUsage();

    const result = await getJudgeVerdict(
      transcript,
      ai1Name,
      ai2Name,
      topic,
    );

    const nextUsage = await getVerdictUsage();
    setUsage(nextUsage);
    setLoading(false);
    onVerdictReceived(result);
  };

  return (
    <div
      className="verdict-btn-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {tooltipVisible && tooltipMessage && (
        <motion.div
          className="verdict-tooltip"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {tooltipMessage}
        </motion.div>
      )}

      <button
        type="button"
        onClick={handleGetVerdict}
        disabled={isDisabled}
        className={`verdict-btn ${!chaosMode ? 'verdict-btn--locked' : ''} ${isExhausted ? 'verdict-btn--exhausted' : ''}`}
      >
        {loading ? (
          <Loader2 size={15} className="verdict-btn-spinner" aria-hidden="true" />
        ) : (
          <Scale size={15} aria-hidden="true" />
        )}
        <span>
          {loading
            ? 'Judging...'
            : hasVerdict
              ? 'Verdict Ready'
              : !chaosMode
                ? 'Get Verdict'
                : isExhausted
                  ? 'Get Verdict'
                  : `Get Verdict (${usage.remaining} left)`}
        </span>
      </button>
    </div>
  );
};

export default VerdictButton;
