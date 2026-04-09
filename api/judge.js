import { readJsonBody, sendJson } from './_lib/body';
import { runAnthropicJson } from './_lib/providers';

function buildVerdictPrompt({ transcript, topic }) {
  return `You are an impartial debate judge. Below is a full transcript of a debate on:\n"${topic}"\n\nEvaluate both sides. Who made stronger arguments? Who was more persuasive? Who handled counterarguments better?\n\nRespond in JSON only:\n{\n  "winner": "<persona name or 'Draw'>",\n  "margin": "close | moderate | decisive",\n  "reasoning": "<2-3 sentence explanation>",\n  "summary": "<one sentence summary of the debate>"\n}\n\nTranscript:\n${JSON.stringify(transcript)}`;
}

function buildConsensusPrompt({ transcript, topic }) {
  return `You are checking if a debate should stop due to consensus/concession.\nTopic: "${topic}"\n\nGiven the transcript below, determine whether the negative side (AI-2) has conceded, substantially agreed with the affirmative side, or otherwise indicated the debate is effectively resolved.\n\nRespond in JSON only:\n{\n  "consensusTriggered": true | false,\n  "reason": "brief reason"\n}\n\nTranscript:\n${JSON.stringify(transcript)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const { transcript = [], topic = '', consensusCheck = false } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      sendJson(res, 500, { error: 'ANTHROPIC_API_KEY is not configured.' });
      return;
    }

    const prompt = consensusCheck
      ? buildConsensusPrompt({ transcript, topic })
      : buildVerdictPrompt({ transcript, topic });

    const payload = await runAnthropicJson({
      apiKey,
      prompt,
      maxTokens: 500,
    });

    sendJson(res, 200, payload);
  } catch (error) {
    sendJson(res, 500, {
      error: String(error?.message || 'Judge request failed'),
    });
  }
}
