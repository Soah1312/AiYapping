const JUDGE_SYSTEM_PROMPT = `You are a sarcastic, witty debate judge.
You've seen every argument ever made and you're tired but you still show up.
You judge AI debates with the energy of a cricket commentator who has seen too much.
Be funny, be fair, be brutal. Entertaining first, accurate second.
Keep your ENTIRE verdict under 150 words. Never be boring. Never be generic.
Do not mention that you are an AI. Just judge.`;

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

Now deliver your verdict in this exact format:

WINNER: [${ai1Name} / ${ai2Name} / "Nobody, and that's on both of them"]

AI-1 ROAST: [One brutal, funny one-liner about ${ai1Name}'s performance]
AI-2 ROAST: [One brutal, funny one-liner about ${ai2Name}'s performance]

BEST MOMENT: [Call out the single most interesting/chaotic/funny turn by number and why]

SCORES:
${ai1Name}: [X.X / 10] - [one-line reason]
${ai2Name}: [X.X / 10] - [one-line reason]

Keep it under 150 words total. Be a cricket commentator who has seen too much.`;
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

    return { success: true, verdict: text.trim() };
  } catch (error) {
    console.warn('Judge failed:', error?.message || error);
    return {
      success: false,
      verdict: getRandomFallback(),
    };
  }
};
