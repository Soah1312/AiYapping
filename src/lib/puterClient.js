let puterInstancePromise;

function isAsyncIterable(value) {
  return Boolean(value && typeof value[Symbol.asyncIterator] === 'function');
}

function normalizePuterModel(model) {
  const value = String(model || '').trim();
  if (!value) return value;

  // Puter model ids for Claude use hyphen segments (e.g. claude-opus-4-6).
  if (value.startsWith('claude-')) {
    return value.replace(/\./g, '-');
  }

  return value;
}

function normalizePuterTemperature(temperature) {
  const parsed = Number(temperature);
  if (!Number.isFinite(parsed)) {
    return 0.7;
  }
  return Math.max(0, Math.min(1, parsed));
}

function extractErrorMessage(error) {
  if (!error) return 'Unknown Puter error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || 'Unknown Puter error';
  if (typeof error?.message === 'string' && error.message) return error.message;
  if (typeof error?.error === 'string' && error.error) return error.error;
  if (typeof error?.msg === 'string' && error.msg) return error.msg;
  if (typeof error?.code === 'string' && error.code) return `Puter error (${error.code})`;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function asError(error) {
  if (error instanceof Error) return error;
  return new Error(extractErrorMessage(error));
}

function extractTextFromChunk(chunk) {
  if (typeof chunk === 'string') return chunk;
  if (typeof chunk?.text === 'string') return chunk.text;
  if (typeof chunk?.content === 'string') return chunk.content;
  if (Array.isArray(chunk?.content)) {
    return chunk.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .join('');
  }
  if (typeof chunk?.message?.content === 'string') return chunk.message.content;
  if (Array.isArray(chunk?.message?.content)) {
    return chunk.message.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .join('');
  }
  return '';
}

async function getPuter() {
  if (!puterInstancePromise) {
    puterInstancePromise = import('@heyputer/puter.js').then((mod) => mod.puter || mod.default || mod);
  }
  return puterInstancePromise;
}

export async function ensurePuterSignIn({ interactive = true } = {}) {
  try {
    const puter = await getPuter();
    const authApi = puter?.auth;

    if (!authApi) {
      return { ok: false, reason: 'Puter auth API unavailable.' };
    }

    const signedIn = typeof authApi.isSignedIn === 'function'
      ? await authApi.isSignedIn()
      : true;

    if (signedIn) {
      return { ok: true, puter };
    }

    if (!interactive) {
      return { ok: false, reason: 'Puter sign-in required.', puter };
    }

    if (typeof authApi.signIn === 'function') {
      await authApi.signIn();
    } else if (typeof puter?.ui?.authenticateWithPuter === 'function') {
      await puter.ui.authenticateWithPuter();
    } else {
      return { ok: false, reason: 'No Puter sign-in method is available.', puter };
    }

    const signedInAfterPrompt = typeof authApi.isSignedIn === 'function'
      ? await authApi.isSignedIn()
      : true;

    return {
      ok: Boolean(signedInAfterPrompt),
      reason: signedInAfterPrompt ? '' : 'Puter sign-in was not completed.',
      puter,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error?.message || 'Puter sign-in failed.',
    };
  }
}

export async function streamPuterChat({ messages, model, temperature, maxTokens, onDelta }) {
  const auth = await ensurePuterSignIn({ interactive: false });
  if (!auth.ok || !auth.puter) {
    const authError = new Error(auth.reason || 'Puter sign-in required.');
    authError.code = 'PUTER_AUTH_REQUIRED';
    throw authError;
  }

  const puter = auth.puter;
  const normalizedModel = normalizePuterModel(model);
  const normalizedTemperature = normalizePuterTemperature(temperature);

  let stream;
  try {
    stream = await puter.ai.chat(messages, {
      model: normalizedModel,
      stream: true,
      temperature: normalizedTemperature,
      max_tokens: maxTokens,
    });
  } catch (error) {
    throw asError(error);
  }

  let sawAnyText = false;
  if (isAsyncIterable(stream)) {
    for await (const chunk of stream) {
      const text = extractTextFromChunk(chunk);
      if (text) {
        sawAnyText = true;
        onDelta?.(text);
      }
    }
  } else {
    const text = extractTextFromChunk(stream);
    if (text) {
      sawAnyText = true;
      onDelta?.(text);
    }
  }

  if (sawAnyText) return;

  let completion;
  try {
    completion = await puter.ai.chat(messages, {
      model: normalizedModel,
      stream: false,
      temperature: normalizedTemperature,
      max_tokens: maxTokens,
    });
  } catch (error) {
    throw asError(error);
  }

  const fallbackText = extractTextFromChunk(completion);
  if (fallbackText) {
    onDelta?.(fallbackText);
    return;
  }

  throw new Error('Puter returned an empty response.');
}
