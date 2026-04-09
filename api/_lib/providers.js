function parseEventBlocks(buffer) {
  const blocks = buffer.split('\n\n');
  return {
    blocks: blocks.slice(0, -1),
    remainder: blocks[blocks.length - 1] || '',
  };
}

function linesToData(block) {
  const lines = block.split('\n').map((line) => line.trim());
  return lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('');
}

async function streamSseResponse(response, onData, signal) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }

  if (!response.body) {
    throw new Error('Provider did not return a readable stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal?.aborted) {
      throw new Error('Aborted');
    }

    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseEventBlocks(buffer);
    buffer = parsed.remainder;

    for (const block of parsed.blocks) {
      const data = linesToData(block);
      if (!data) {
        continue;
      }

      if (data === '[DONE]') {
        return;
      }

      onData(data);
    }
  }
}

function splitSystemMessage(messages) {
  const system = messages.find((entry) => entry.role === 'system')?.content || '';
  const rest = messages.filter((entry) => entry.role !== 'system');
  return { system, rest };
}

export function providerFromModel(model) {
  if (model.startsWith('claude')) {
    return 'anthropic';
  }

  if (model.startsWith('gpt')) {
    return 'openai';
  }

  if (model.startsWith('gemini')) {
    return 'google';
  }

  throw new Error(`Unsupported model: ${model}`);
}

export async function streamFromProvider({ model, messages, apiKey, onDelta, signal }) {
  const provider = providerFromModel(model);

  if (provider === 'anthropic') {
    await streamAnthropic({ model, messages, apiKey, onDelta, signal });
    return;
  }

  if (provider === 'openai') {
    await streamOpenAI({ model, messages, apiKey, onDelta, signal });
    return;
  }

  await streamGemini({ model, messages, apiKey, onDelta, signal });
}

async function streamAnthropic({ model, messages, apiKey, onDelta, signal }) {
  const { system, rest } = splitSystemMessage(messages);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      stream: true,
      system,
      messages: rest,
    }),
    signal,
  });

  await streamSseResponse(response, (rawData) => {
    let payload;

    try {
      payload = JSON.parse(rawData);
    } catch {
      return;
    }

    if (payload.type === 'content_block_delta' && payload.delta?.text) {
      onDelta(payload.delta.text);
    }
  }, signal);
}

async function streamOpenAI({ model, messages, apiKey, onDelta, signal }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      stream: true,
      messages,
    }),
    signal,
  });

  await streamSseResponse(response, (rawData) => {
    let payload;

    try {
      payload = JSON.parse(rawData);
    } catch {
      return;
    }

    const delta = payload?.choices?.[0]?.delta?.content;
    if (delta) {
      onDelta(delta);
    }
  }, signal);
}

async function streamGemini({ model, messages, apiKey, onDelta, signal }) {
  const { system, rest } = splitSystemMessage(messages);

  const geminiContents = rest.map((entry) => ({
    role: entry.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: entry.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: system
          ? {
              parts: [{ text: system }],
            }
          : undefined,
        generationConfig: {
          maxOutputTokens: 500,
        },
      }),
      signal,
    },
  );

  await streamSseResponse(response, (rawData) => {
    let payload;

    try {
      payload = JSON.parse(rawData);
    } catch {
      return;
    }

    const parts = payload?.candidates?.[0]?.content?.parts || [];
    parts.forEach((part) => {
      if (part.text) {
        onDelta(part.text);
      }
    });
  }, signal);
}

function parseJsonFromText(text) {
  const cleaned = text.trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start < 0 || end < 0 || end <= start) {
    throw new Error('No JSON object found in model response.');
  }

  const jsonText = cleaned.slice(start, end + 1);
  return JSON.parse(jsonText);
}

export async function runAnthropicJson({ apiKey, prompt, maxTokens = 500 }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }

  const payload = await response.json();
  const text = payload?.content?.map((entry) => entry.text || '').join('\n') || '';
  return parseJsonFromText(text);
}
