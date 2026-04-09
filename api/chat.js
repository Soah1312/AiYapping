import { readJsonBody, sendJson } from './_lib/body';
import { consumeFreeTurn } from './_lib/usage';
import { providerFromModel, streamFromProvider } from './_lib/providers';

function fallbackProviderKey(provider) {
  if (provider === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY;
  }

  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY;
  }

  if (provider === 'google') {
    return process.env.GOOGLE_AI_API_KEY;
  }

  return '';
}

function sseWrite(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const model = body?.model;
    const messages = body?.messages;
    const sessionId = body?.sessionId || req.headers['x-session-id'];

    if (!model || !Array.isArray(messages)) {
      sendJson(res, 400, { error: 'Missing required body: model, messages[]' });
      return;
    }

    const provider = providerFromModel(model);
    let apiKey = req.headers['x-provider-api-key'] || body?.apiKey || '';

    if (!apiKey) {
      if (!sessionId) {
        sendJson(res, 400, { error: 'sessionId is required for free tier usage.' });
        return;
      }

      const usage = await consumeFreeTurn(sessionId);
      if (!usage.allowed) {
        sendJson(res, 429, {
          error: 'Free turn limit reached for today. Add your own API key.',
          usage,
        });
        return;
      }

      apiKey = fallbackProviderKey(provider);
      if (!apiKey) {
        sendJson(res, 500, {
          error: `Server is missing default API key for provider ${provider}.`,
        });
        return;
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    const controller = new AbortController();
    req.on('close', () => {
      controller.abort();
    });

    await streamFromProvider({
      model,
      messages,
      apiKey,
      signal: controller.signal,
      onDelta: (delta) => sseWrite(res, { delta }),
    });

    sseWrite(res, { done: true });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const message = String(error?.message || 'Chat request failed');
    if (res.headersSent) {
      sseWrite(res, { error: message });
      res.end();
      return;
    }

    const statusCode = message.includes('401') ? 401 : 500;
    sendJson(res, statusCode, { error: message });
  }
}
