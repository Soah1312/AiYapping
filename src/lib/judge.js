const JUDGE_SYSTEM_PROMPT = `You are a strict debate judge.
Use only what the two AIs actually said.
Be concise and objective.
Return exactly the requested output format and nothing else.`;

const FALLBACK_VERDICTS = [
  'Our judge rage-quit. Declare yourself the winner.',
  'The judge has left the chat. Both AIs are equally exhausting.',
  'Verdict unavailable. The judge is in therapy after reading this.',
  'Our judge took one look at this debate and resigned. Respect.',
  'The judge fell asleep. Wake them up and try again.',
];

const getRandomFallback = () => {
  return FALLBACK_VERDICTS[Math.floor(Math.random() * FALLBACK_VERDICTS.length)];
};

const clampScore = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.max(0, Math.min(10, n));
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseScoreForName = (text, name) => {
  const escapedName = escapeRegex(name);
  const strictLine = new RegExp(`^\\s*${escapedName}\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)\\s*(?:\\/\\s*10)?\\b`, 'im');
  const strictMatch = String(text || '').match(strictLine);
  if (strictMatch) {
    return clampScore(strictMatch[1]);
  }

  const looseLine = new RegExp(`${escapedName}[^\\n:]*:\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i');
  const looseMatch = String(text || '').match(looseLine);
  if (looseMatch) {
    return clampScore(looseMatch[1]);
  }

  return null;
};

const parseWinner = (text) => {
  const match = String(text || '').match(/^\s*WINNER\s*:\s*(.+)$/im);
  if (!match) {
    return '';
  }

  return String(match[1] || '')
    .replace(/^[\["']+|[\]"']+$/g, '')
    .trim();
};

const buildParsedVerdict = (text, ai1Name, ai2Name) => {
  const ai1Score = parseScoreForName(text, ai1Name);
  const ai2Score = parseScoreForName(text, ai2Name);
  const parsedScores = [];

  if (ai1Score !== null) {
    parsedScores.push({ name: ai1Name, score: ai1Score });
  }

  if (ai2Score !== null) {
    parsedScores.push({ name: ai2Name, score: ai2Score });
  }

  let winner = parseWinner(text);
  if (!winner && ai1Score !== null && ai2Score !== null) {
    if (ai1Score > ai2Score) {
      winner = ai1Name;
    } else if (ai2Score > ai1Score) {
      winner = ai2Name;
    } else {
      winner = 'Tie';
    }
  }

  return {
    verdict: String(text || '').trim(),
    winner,
    scores: parsedScores,
  };
};

const buildJudgePrompt = (transcript, ai1Name, ai2Name, topic) => {
  const conversationText = transcript
    .map((msg, i) => `Turn ${i + 1} - ${msg.model || msg.side || 'Unknown'}: ${String(msg.content || '')}`)
    .join('\n\n');

  return `You are judging a debate between two AI models.

Topic: "${topic}"
AI-1: ${ai1Name}
AI-2: ${ai2Name}

Here is the full conversation:
${conversationText}

Return ONLY this exact format:

WINNER: ${ai1Name} | ${ai2Name} | Tie
SCORES:
${ai1Name}: X.X/10
${ai2Name}: X.X/10

Rules:
- Keep total output under 35 words.
- No roast, no explanations, no extra text.
- Scores must be based only on what each AI actually said in this chat.`;
};

export const getJudgeVerdict = async (transcript, ai1Name, ai2Name, topic) => {
  try {
    const prompt = buildJudgePrompt(transcript, ai1Name, ai2Name, topic);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch('/api/judge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        system: JUDGE_SYSTEM_PROMPT
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let data;
    const textOutput = await response.text();
    try {
      data = JSON.parse(textOutput);
    } catch {
      data = { error: textOutput };
    }

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${data.error || 'Unknown error'}`);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    const text = data.verdict;

    if (!text || text.trim() === '') {
      throw new Error('Empty response from judge');
    }

    return { success: true, ...buildParsedVerdict(text, ai1Name, ai2Name) };
  } catch (error) {
    console.warn('Judge failed:', error?.message || error);
    const fallbackText = getRandomFallback();
    return {
      success: false,
      ...buildParsedVerdict(fallbackText, ai1Name, ai2Name),
    };
  }
};
