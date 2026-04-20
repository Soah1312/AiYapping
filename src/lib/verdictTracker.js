const DAILY_LIMIT = 3;

const getTodayKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalUsage = () => {
  if (typeof window === 'undefined') {
    return { count: 0 };
  }

  const todayKey = getTodayKey();
  try {
    const raw = window.localStorage.getItem(`verdict_usage_${todayKey}`);
    const parsed = JSON.parse(raw || '{"count": 0}');
    return { count: Math.max(0, Number(parsed?.count || 0)) };
  } catch {
    return { count: 0 };
  }
};

const setLocalUsage = (count) => {
  if (typeof window === 'undefined') {
    return;
  }

  const todayKey = getTodayKey();
  try {
    window.localStorage.setItem(
      `verdict_usage_${todayKey}`,
      JSON.stringify({ count: Math.max(0, Number(count || 0)) }),
    );
  } catch {
    // Non-blocking: local backup can fail silently.
  }
};

export const getVerdictUsage = async () => {
  const local = getLocalUsage();
  return {
    used: local.count,
    remaining: Math.max(0, DAILY_LIMIT - local.count),
  };
};

export const incrementVerdictUsage = async () => {
  const local = getLocalUsage();
  setLocalUsage(local.count + 1);
};
