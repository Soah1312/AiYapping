import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebaseClient';

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
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) {
      const local = getLocalUsage();
      return {
        used: local.count,
        remaining: Math.max(0, DAILY_LIMIT - local.count),
      };
    }

    const todayKey = getTodayKey();
    const ref = doc(getFirebaseDb(), 'verdictUsage', `${user.uid}_${todayKey}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { used: 0, remaining: DAILY_LIMIT };
    }

    const used = Math.max(0, Number(snap.data()?.count || 0));
    setLocalUsage(used);
    return { used, remaining: Math.max(0, DAILY_LIMIT - used) };
  } catch (error) {
    console.warn('Failed to get verdict usage:', error);
    const local = getLocalUsage();
    return {
      used: local.count,
      remaining: Math.max(0, DAILY_LIMIT - local.count),
    };
  }
};

export const incrementVerdictUsage = async () => {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;

    if (!user) {
      const local = getLocalUsage();
      setLocalUsage(local.count + 1);
      return;
    }

    const todayKey = getTodayKey();
    const ref = doc(getFirebaseDb(), 'verdictUsage', `${user.uid}_${todayKey}`);
    const snap = await getDoc(ref);
    const currentCount = snap.exists() ? Math.max(0, Number(snap.data()?.count || 0)) : 0;
    const nextCount = currentCount + 1;

    await setDoc(ref, {
      count: nextCount,
      uid: user.uid,
      date: todayKey,
      lastUpdated: new Date().toISOString(),
    });

    setLocalUsage(nextCount);
  } catch (error) {
    console.warn('Failed to increment verdict usage:', error);
    const local = getLocalUsage();
    setLocalUsage(local.count + 1);
  }
};
