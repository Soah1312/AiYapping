import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { getVerdictUsage, incrementVerdictUsage } from '../src/lib/verdictTracker.js';

const originalWindow = globalThis.window;

const createStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    _store: store
  };
};

const getTodayKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

afterEach(() => {
  globalThis.window = originalWindow;
});

test('getVerdictUsage falls back when window is missing', async () => {
  delete globalThis.window;
  const usage = await getVerdictUsage();

  assert.deepEqual(usage, { used: 0, remaining: 3 });
});

test('getVerdictUsage tolerates invalid local storage payloads', async () => {
  const storage = createStorage();
  globalThis.window = { localStorage: storage };
  storage.setItem(`verdict_usage_${getTodayKey()}`, 'not-json');

  const usage = await getVerdictUsage();

  assert.deepEqual(usage, { used: 0, remaining: 3 });
});

test('incrementVerdictUsage updates local storage count', async () => {
  const storage = createStorage();
  globalThis.window = { localStorage: storage };
  storage.setItem(`verdict_usage_${getTodayKey()}`, JSON.stringify({ count: 1 }));

  await incrementVerdictUsage();

  const stored = JSON.parse(storage.getItem(`verdict_usage_${getTodayKey()}`));
  assert.equal(stored.count, 2);
});
