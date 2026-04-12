import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Scale } from 'lucide-react';
import { getJudgeVerdict } from '../lib/judge';

const JUDGE_CACHE_STORAGE_KEY = 'aiyapping-judge-cache-v1';
const JUDGE_CACHE_LIMIT = 60;
const verdictMemoryCache = new Map();
const pendingVerdictRequests = new Map();

const hashString = (value) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

const buildCacheKey = ({ conversationKey, transcript, ai1Name, ai2Name, topic }) => {
  const compactTranscript = transcript
    .map((msg, idx) => `${idx + 1}:${msg?.id || ''}:${msg?.model || msg?.side || ''}:${String(msg?.content || '')}`)
    .join('\n');

  const raw = [
    String(conversationKey || ''),
    String(ai1Name || ''),
    String(ai2Name || ''),
    String(topic || ''),
    compactTranscript,
  ].join('|');

  return `judge-${hashString(raw)}`;
};

const readPersistedCache = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(JUDGE_CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writePersistedCache = (nextCache) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(JUDGE_CACHE_STORAGE_KEY, JSON.stringify(nextCache));
  } catch {
    // Ignore storage write failures to keep verdict rendering non-blocking.
  }
};

const getCachedVerdict = (cacheKey) => {
  const memory = verdictMemoryCache.get(cacheKey);
  if (memory) {
    return memory;
  }

  const persisted = readPersistedCache();
  const entry = persisted[cacheKey];
  if (!entry) {
    return null;
  }

  verdictMemoryCache.set(cacheKey, entry);
  return entry;
};

const setCachedVerdict = (cacheKey, payload) => {
  verdictMemoryCache.set(cacheKey, payload);

  const persisted = readPersistedCache();
  const next = {
    ...persisted,
    [cacheKey]: {
      verdict: payload.verdict,
      success: Boolean(payload.success),
      savedAt: Date.now(),
    },
  };

  const entries = Object.entries(next).sort((a, b) => {
    const aTime = Number(a[1]?.savedAt || 0);
    const bTime = Number(b[1]?.savedAt || 0);
    return bTime - aTime;
  });

  const trimmed = Object.fromEntries(entries.slice(0, JUDGE_CACHE_LIMIT));
  writePersistedCache(trimmed);
};

const VerdictCard = ({ transcript, ai1Name, ai2Name, topic, conversationKey }) => {
  const [verdict, setVerdict] = useState(null);
  const [loading, setLoading] = useState(true);
  const [judgeSuccess, setJudgeSuccess] = useState(false);

  const cacheKey = useMemo(() => buildCacheKey({
    conversationKey,
    transcript,
    ai1Name,
    ai2Name,
    topic,
  }), [ai1Name, ai2Name, conversationKey, topic, transcript]);

  useEffect(() => {
    let cancelled = false;

    const fetchVerdict = async () => {
      const cached = getCachedVerdict(cacheKey);
      if (cached) {
        if (!cancelled) {
          setVerdict(cached.verdict);
          setJudgeSuccess(Boolean(cached.success));
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const existingRequest = pendingVerdictRequests.get(cacheKey);

      const request = existingRequest || getJudgeVerdict(transcript, ai1Name, ai2Name, topic);

      if (!existingRequest) {
        pendingVerdictRequests.set(cacheKey, request);
      }

      const result = await request;

      if (!existingRequest) {
        pendingVerdictRequests.delete(cacheKey);
      }

      setCachedVerdict(cacheKey, result);

      if (cancelled) return;

      setVerdict(result.verdict);
      setJudgeSuccess(result.success);
      setLoading(false);
    };

    fetchVerdict();

    return () => {
      cancelled = true;
    };
  }, [ai1Name, ai2Name, cacheKey, topic, transcript]);

  return (
    <AnimatePresence>
      <motion.div
        className="verdict-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="verdict-header">
          <Scale className="verdict-gavel" aria-hidden="true" size={18} />
          <h3 className="verdict-title">
            {loading ? 'Judge is deliberating...' : 'The Verdict'}
          </h3>
          {judgeSuccess && (
            <span className="verdict-badge">Claude Sonnet</span>
          )}
        </div>

        <div className="verdict-body">
          {loading ? (
            <motion.div
              className="verdict-loading"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Reading the transcripts and sighing deeply...
            </motion.div>
          ) : (
            <motion.pre
              className="verdict-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {verdict}
            </motion.pre>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VerdictCard;
