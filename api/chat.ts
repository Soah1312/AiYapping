import { streamText, type ModelMessage } from 'ai';
import { groq } from '@ai-sdk/groq';
import { getUsageStatus, incrementUsage } from './_lib/firebase';

export const config = {
  runtime: 'edge',
};

type ChatRequestBody = {
  provider?: 'groq' | 'huggingface' | string;
  model?: string;
  modelId?: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
};

function resolveProvider(provider: string | undefined, modelId: string) {
  if (provider === 'groq' || provider === 'huggingface') {
    return provider;
  }

  return modelId.includes('/') ? 'huggingface' : 'groq';
}

function extractHfDelta(payload: Record<string, unknown>) {
  const tokenText =
    typeof payload.token === 'object' && payload.token && 'text' in payload.token
      ? String((payload.token as { text?: string }).text || '')
      : '';

  const generatedText =
    typeof payload.generated_text === 'string' ? payload.generated_text : '';

  const choiceDelta =
    Array.isArray(payload.choices) &&
    payload.choices[0] &&
    typeof payload.choices[0] === 'object' &&
    (payload.choices[0] as { delta?: { content?: string } }).delta?.content
      ? String((payload.choices[0] as { delta?: { content?: string } }).delta?.content || '')
      : '';

  const choiceMessage =
    Array.isArray(payload.choices) &&
    payload.choices[0] &&
    typeof payload.choices[0] === 'object' &&
    (payload.choices[0] as { message?: { content?: string } }).message?.content
      ? String((payload.choices[0] as { message?: { content?: string } }).message?.content || '')
      : '';

  const directDelta =
    typeof payload.delta === 'object' && payload.delta && 'text' in payload.delta
      ? String((payload.delta as { text?: string }).text || '')
      : '';

  return tokenText || choiceDelta || choiceMessage || directDelta || generatedText || '';
}

async function createHuggingFaceStreamResponse({
  modelId,
  messages,
  sessionId,
}: {
  modelId: string;
  messages: Array<{ role: string; content: string }>;
  sessionId: string;
}) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Missing HUGGINGFACE_API_KEY environment variable.' }, { status: 500 });
  }

  const normalizedMessages = normalizeMessages(messages).map((message) => ({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : String(message.content || ''),
  }));

  const HF_SAFE_FALLBACK_MODEL = 'katanemo/Arch-Router-1.5B:hf-inference';
  const explicitModel = modelId;
  const hfInferenceVariant = modelId.includes(':') ? modelId : `${modelId}:hf-inference`;
  const plainVariant = modelId.replace(/:hf-inference$/, '');
  const modelCandidates = [explicitModel, plainVariant, hfInferenceVariant, HF_SAFE_FALLBACK_MODEL].filter(
    (candidate, index, arr) => candidate && arr.indexOf(candidate) === index,
  );

  let upstream: Response | null = null;
  let upstreamModel = modelCandidates[0];
  let lastErrorText = '';

  for (const candidateModel of modelCandidates) {
    const candidateResponse = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/json',
      },
      body: JSON.stringify({
        model: candidateModel,
        messages: normalizedMessages,
        stream: true,
        max_tokens: 500,
      }),
    });

    upstream = candidateResponse;
    upstreamModel = candidateModel;

    if (candidateResponse.ok || candidateResponse.status === 503) {
      break;
    }

    lastErrorText = await candidateResponse.text();
    const lowerError = lastErrorText.toLowerCase();
    const retryableModelError =
      candidateResponse.status === 404 ||
      lowerError.includes('model_not_supported') ||
      lowerError.includes('not supported by provider') ||
      lowerError.includes('invalid_request_error') ||
      lowerError.includes('param":"model');

    if (!retryableModelError) {
      break;
    }
  }

  if (!upstream) {
    return Response.json({ error: 'Hugging Face request failed before reaching upstream.' }, { status: 500 });
  }

  if (upstream.status === 503) {
    return Response.json(
      { error: 'Hugging Face is waking up this model... please wait 20 seconds.' },
      { status: 503 },
    );
  }

  if (!upstream.ok) {
    const errorText = lastErrorText || (await upstream.text());
    return Response.json(
      { error: `Hugging Face error ${upstream.status} (${upstreamModel}): ${errorText}` },
      { status: upstream.status },
    );
  }

  if (!upstream.body) {
    return Response.json({ error: 'Hugging Face stream body is empty.' }, { status: 500 });
  }

  const upstreamBody = upstream.body;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const contentType = upstream.headers.get('content-type') || '';

  const stream = new ReadableStream({
    async start(controller) {
      const write = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        if (contentType.includes('application/json')) {
          const text = await new Response(upstreamBody).text();
          let parsed: unknown = null;

          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text;
          }

          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && typeof item === 'object' && 'generated_text' in item) {
                const delta = String((item as { generated_text?: string }).generated_text || '');
                if (delta) {
                  write({ delta });
                }
              }
            }
          } else if (parsed && typeof parsed === 'object') {
            const delta = extractHfDelta(parsed as Record<string, unknown>);
            if (delta) {
              write({ delta });
            }
          } else if (typeof parsed === 'string' && parsed) {
            write({ delta: parsed });
          }
        } else {
          const reader = upstreamBody.getReader();
          let buffer = '';

          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split('\n\n');
            buffer = blocks.pop() || '';

            for (const block of blocks) {
              const lines = block.split('\n').map((line) => line.trim());
              const dataLine = lines.find((line) => line.startsWith('data:'));

              if (!dataLine) {
                continue;
              }

              const raw = dataLine.slice(5).trim();
              if (!raw || raw === '[DONE]') {
                continue;
              }

              let payload: Record<string, unknown>;
              try {
                payload = JSON.parse(raw) as Record<string, unknown>;
              } catch {
                write({ delta: raw });
                continue;
              }

              if (payload.error) {
                throw new Error(String(payload.error));
              }

              const delta = extractHfDelta(payload);
              if (delta) {
                write({ delta });
              }
            }
          }
        }

        await incrementUsage(sessionId);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        write({ error: String((error as Error)?.message || 'Hugging Face stream failed') });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

function normalizeMessages(messages: Array<{ role: string; content: string }>): ModelMessage[] {
  return messages.map((message) => {
    const role =
      message.role === 'system' || message.role === 'assistant' || message.role === 'user'
        ? message.role
        : 'user';

    return {
      role,
      content: String(message.content || ''),
    };
  }) as ModelMessage[];
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as ChatRequestBody;

    const modelId = String(body?.modelId || body?.model || '');
    if (!modelId || !Array.isArray(body?.messages) || !body?.sessionId) {
      return Response.json(
        { error: 'Missing required body fields: provider, modelId/model, messages, sessionId' },
        { status: 400 },
      );
    }

    const provider = resolveProvider(body?.provider, modelId);

    const usage = await getUsageStatus(body.sessionId);
    if (usage.turnsUsed >= usage.limit) {
      return Response.json(
        {
          error: 'Daily free turn limit reached (10).',
          usage: {
            remaining: 0,
            limit: usage.limit,
          },
        },
        { status: 429 },
      );
    }

    if (provider === 'huggingface') {
      return createHuggingFaceStreamResponse({
        modelId,
        messages: body.messages,
        sessionId: body.sessionId,
      });
    }

    const result = streamText({
      model: groq(modelId),
      messages: normalizeMessages(body.messages),
      maxOutputTokens: 500,
      onFinish: async () => {
        await incrementUsage(body.sessionId);
      },
    });

    const dataResponse = (result as unknown as { toDataStreamResponse?: () => Response }).toDataStreamResponse;
    if (typeof dataResponse === 'function') {
      return dataResponse.call(result);
    }

    return result.toTextStreamResponse();
  } catch (error) {
    return Response.json(
      { error: String((error as Error)?.message || 'Chat stream failed') },
      { status: 500 },
    );
  }
}
