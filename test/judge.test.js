import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { getJudgeVerdict } from '../src/lib/judge.js';

const originalFetch = globalThis.fetch;
const originalRandom = Math.random;

afterEach(() => {
  globalThis.fetch = originalFetch;
  Math.random = originalRandom;
});

const sampleTranscript = [
  { model: 'Alpha', content: 'Point one.' },
  { model: 'Beta', content: 'Point two.' }
];

test('getJudgeVerdict parses winner and scores', async () => {
  const verdictText = `WINNER: Alpha
SCORES:
Alpha: 7/10
Beta: 5/10`;
  const fetchCalls = [];

  globalThis.fetch = async (url, options) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ verdict: verdictText })
    };
  };

  const result = await getJudgeVerdict(sampleTranscript, 'Alpha', 'Beta', 'Space debate');

  assert.equal(result.success, true);
  assert.equal(result.winner, 'Alpha');
  assert.deepEqual(result.scores, [
    { name: 'Alpha', score: 7 },
    { name: 'Beta', score: 5 }
  ]);
  assert.equal(fetchCalls.length, 1);
  const body = JSON.parse(fetchCalls[0].options.body);
  assert.ok(body.prompt.includes('AI-1: Alpha'));
  assert.ok(body.prompt.includes('AI-2: Beta'));
  assert.ok(body.prompt.includes('Topic: "Space debate"'));
});

test('getJudgeVerdict infers winner when winner line is missing', async () => {
  const verdictText = `SCORES:
Alpha: 4/10
Beta: 6/10`;

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ verdict: verdictText })
  });

  const result = await getJudgeVerdict(sampleTranscript, 'Alpha', 'Beta', 'Another topic');

  assert.equal(result.success, true);
  assert.equal(result.winner, 'Beta');
});

test('getJudgeVerdict falls back on server errors', async () => {
  Math.random = () => 0;

  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => JSON.stringify({ error: 'Nope' })
  });

  const result = await getJudgeVerdict(sampleTranscript, 'Alpha', 'Beta', 'Fallback topic');

  assert.equal(result.success, false);
  assert.equal(result.verdict, 'Our judge rage-quit. Declare yourself the winner.');
});
