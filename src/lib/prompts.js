export function getPersonaLabel(modelId, persona) {
  return persona?.trim() || modelId;
}

export function buildTurnSystemPrompt({
  mode,
  topic,
  speakerSide,
  speakerPersona,
  speakerModel,
  opponentPersona,
  opponentModel,
  openingSeed,
  turnNumber,
}) {
  const topicClause = topic?.trim()
    ? `about: "${topic}".`
    : 'about any topic the two of you choose naturally.';

  const openingHint = openingSeed?.trim() && turnNumber === 1
    ? `\n\nYour first message must be anchored around this opening seed: "${openingSeed.trim()}".`
    : '';

  if (mode === 'chat') {
    return `You are ${speakerPersona}, powered by ${speakerModel}. You are having a thoughtful conversation with ${opponentPersona} (powered by ${opponentModel}) ${topicClause}\n\nRespond naturally. Be curious, push the conversation forward. Be yourself - you are ${speakerModel} and may have opinions, tendencies, and a distinct voice.\nKeep your response to 3-5 sentences max. Do not introduce yourself.${openingHint}`;
  }

  const position = speakerSide === 'ai1' ? 'AFFIRMATIVE (argue in favor)' : 'NEGATIVE (argue against)';

  return `You are ${speakerPersona}, powered by ${speakerModel}. You are in a structured debate.\nTopic: "${topic}"\nYour position: ${position}\nYour opponent is ${opponentPersona} (${opponentModel}).\n\nMake a sharp, well-reasoned argument for your position.\nReference your opponent's previous point and counter it directly.\n3-5 sentences. No filler. No hedging.${openingHint}`;
}

export function buildJudgePrompt({ topic, transcript }) {
  return `You are an impartial debate judge. Below is a full transcript of a debate on:\n"${topic}"\n\nEvaluate both sides. Who made stronger arguments? Who was more persuasive?\nWho handled counterarguments better?\n\nRespond in JSON only:\n{\n  "winner": "<persona name or 'Draw'>",\n  "margin": "close | moderate | decisive",\n  "reasoning": "<2-3 sentence explanation>",\n  "summary": "<one sentence summary of the debate>"\n}\n\nTranscript:\n${JSON.stringify(transcript)}`;
}
