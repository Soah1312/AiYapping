import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Scale } from 'lucide-react';
import { getJudgeVerdict } from '../lib/judge';
import { useConversationStore } from '../store/conversationStore';

const VerdictButton = ({
  transcript,
  ai1Name,
  ai2Name,
  topic,
  onVerdictReceived,
  hasVerdict,
}) => {
  const chaosMode = useConversationStore((state) => state.chaosMode);
  const [loading, setLoading] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState('');

  const isDisabled = !chaosMode || loading || hasVerdict;

  const getTooltipMessage = () => {
    if (hasVerdict) {
      return 'Verdict already generated for this duel.';
    }

    if (!chaosMode) {
      return 'Enable chaos mode to unlock the judge.';
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

    const result = await getJudgeVerdict(
      transcript,
      ai1Name,
      ai2Name,
      topic,
    );
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
        className={`verdict-btn ${!chaosMode ? 'verdict-btn--locked' : ''}`}
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
                : 'Get Verdict'}
        </span>
      </button>
    </div>
  );
};

export default VerdictButton;
