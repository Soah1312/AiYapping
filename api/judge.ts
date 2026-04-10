import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

export const config = {
  runtime: 'edge',
};

type JudgeRequestBody = {
  transcript: Array<{ role: string; content: string; model?: string }>;
  topic: string;
  mode: 'debate' | 'chat';
  consensusCheck?: boolean;
};

function buildJudgePrompt(body: JudgeRequestBody) {
  return `You are an impartial judge reviewing an AI Arena discussion.\nTopic: "${body.topic}"\nMode: ${body.mode}\n\nEvaluate argument quality, factual grounding, and handling of counterpoints.\n\nReturn JSON only:\n{\n  "winner": "model1 | model2 | draw",\n  "margin": "close | moderate | decisive",\n  "reasoning": "2-3 sentence explanation",\n  "summary": "one sentence summary"\n}\n\nTranscript:\n${JSON.stringify(body.transcript)}`;
}

function buildConsensusPrompt(body: JudgeRequestBody) {
  return `You are checking whether a debate should end by consensus.\nTopic: "${body.topic}"\n\nReview the transcript and determine if AI-2 has conceded, substantially agreed, or clearly ended opposition.\n\nReturn JSON only:\n{\n  "consensusTriggered": true | false,\n  "reason": "short explanation"\n}\n\nTranscript:\n${JSON.stringify(body.transcript)}`;
}

function extractJson(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start < 0 || end <= start) {
    throw new Error('Judge did not return valid JSON.');
  }

  return JSON.parse(text.slice(start, end + 1));
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as JudgeRequestBody;

    if (!body?.topic || !Array.isArray(body?.transcript)) {
      return Response.json({ error: 'Missing topic or transcript.' }, { status: 400 });
    }

    const output = await generateText({
      model: groq('llama-3.3-70b-specdec'),
      prompt: body.consensusCheck ? buildConsensusPrompt(body) : buildJudgePrompt(body),
      maxOutputTokens: 500,
    });

    const verdict = extractJson(output.text);
    return Response.json(verdict, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: String((error as Error)?.message || 'Judge failed') },
      { status: 500 },
    );
  }
}
