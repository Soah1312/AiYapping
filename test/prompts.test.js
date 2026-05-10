import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildChaosTurnSystemPrompt,
  buildTurnSystemPrompt,
  buildUltraChaosTurnSystemPrompt
} from '../src/lib/prompts.js';

test('buildTurnSystemPrompt uses trimmed topic and word limits', () => {
  const prompt = buildTurnSystemPrompt({
    topic: '  Space Travel  ',
    speakerModel: 'Alpha',
    opponentModel: 'Beta',
    maxTokens: 50
  });

  assert.ok(prompt.includes('You are Alpha.'));
  assert.ok(prompt.includes('conversation with Beta'));
  assert.ok(prompt.includes('about: "Space Travel".'));
  assert.ok(prompt.includes('between 15 and 20 words'));
});

test('buildChaosTurnSystemPrompt adds chaos directives', () => {
  const prompt = buildChaosTurnSystemPrompt({
    topic: 'Chaos',
    speakerModel: 'Alpha',
    opponentModel: 'Beta',
    maxTokens: 80
  });

  assert.ok(prompt.includes('CHAOS MODE DIRECTIVE'));
  assert.ok(prompt.includes('You are in CHAOS MODE.'));
  assert.ok(prompt.includes('You are Alpha.'));
});

test('buildUltraChaosTurnSystemPrompt adds ultra chaos directives', () => {
  const prompt = buildUltraChaosTurnSystemPrompt({
    topic: 'Ultra',
    speakerModel: 'Alpha',
    opponentModel: 'Beta',
    maxTokens: 120
  });

  assert.ok(prompt.includes('ULTRA CHAOS DIRECTIVE'));
  assert.ok(prompt.includes('You are in ULTRA CHAOS MODE.'));
  assert.ok(prompt.includes('You are Alpha.'));
});
