import { useCallback, useEffect, useRef, useState } from 'react';

const HF_WARMUP_WAIT_MS = 20000;
const HF_WARMUP_RETRIES = 1;

function parseLine(line, onDelta) {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  if (trimmed.startsWith('data:')) {
    const data = trimmed.slice(5).trim();
    if (data === '[DONE]') {
      return;
    }

    let payload;
    try {
      payload = JSON.parse(data);
    } catch {
      onDelta(data);
      return;
    }

    if (payload?.error) {
      throw new Error(payload.error);
    }

    if (payload?.delta) {
      onDelta(payload.delta);
    }

    return;
  }

  const splitIndex = trimmed.indexOf(':');
  if (splitIndex === -1) {
    return;
  }

  const partCode = trimmed.slice(0, splitIndex);
  const rawValue = trimmed.slice(splitIndex + 1);

  if (!rawValue) {
    return;
  }

  if (partCode === '3') {
    let errorMessage;

    try {
      const parsed = JSON.parse(rawValue);
      errorMessage = typeof parsed === 'string' ? parsed : parsed?.error || 'Stream error';
    } catch {
      errorMessage = rawValue.replace(/^"|"$/g, '') || 'Stream error';
    }

    throw new Error(errorMessage);
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (partCode === '0') {
      if (typeof parsed === 'string') {
        onDelta(parsed);
      }
      return;
    }
  } catch {
    if (partCode === '0') {
      onDelta(rawValue.replace(/^"|"$/g, ''));
    }
  }
}

function readErrorPayload(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      const error = parsed?.error || parsed?.message || text;
      const requestId = parsed?.requestId ? ` requestId=${parsed.requestId}` : '';
      const stage = parsed?.stage ? ` stage=${parsed.stage}` : '';
      return `${error}${requestId}${stage}`;
    }

    return parsed || text;
  } catch {
    return text;
  }
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Request aborted while waiting for retry.'));
      return;
    }

    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      reject(new Error('Request aborted while waiting for retry.'));
    }

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export function useStream() {
  const [isRequesting, setIsRequesting] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setRequestingSafe = useCallback((next) => {
    if (!isMountedRef.current) {
      return;
    }

    setIsRequesting(next);
  }, []);

  const streamModelResponse = useCallback(
    async ({ provider = 'groq', model, messages, sessionId, onDelta, signal }) => {
      setRequestingSafe(true);
      const diagnostics = {
        provider,
        model,
        sessionId,
        messageCount: Array.isArray(messages) ? messages.length : 0,
      };

      try {
        let response;
        let attempts = 0;

        while (attempts <= HF_WARMUP_RETRIES) {
          response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ provider, model, messages, sessionId }),
            signal,
          });

          if (response.status === 503 && provider === 'huggingface' && attempts < HF_WARMUP_RETRIES) {
            attempts += 1;
            await delay(HF_WARMUP_WAIT_MS, signal);
            continue;
          }

          break;
        }

        if (!response) {
          throw new Error('No response returned by chat endpoint.');
        }

        if (!response.ok) {
          const text = await response.text();
          const payload = readErrorPayload(text);

          console.error('[useStream] /api/chat returned non-ok response', {
            ...diagnostics,
            status: response.status,
            payload,
          });

          if (response.status === 503 && provider === 'huggingface') {
            throw new Error('Hugging Face is waking up this model... please wait 20 seconds.');
          }

          throw new Error(`${response.status}:${payload}`);
        }

        if (!response.body) {
          throw new Error('No stream body returned by server.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const contentType = response.headers.get('content-type') || '';
        const isPlainText = contentType.includes('text/plain');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });

          if (isPlainText) {
            if (chunk) {
              onDelta?.(chunk);
            }
            continue;
          }

          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            parseLine(line, (delta) => onDelta?.(delta));
          }
        }
      } catch (error) {
        console.error('[useStream] streamModelResponse failed', {
          ...diagnostics,
          error: String(error?.message || error),
        });
        throw error;
      } finally {
        setRequestingSafe(false);
      }
    },
    [setRequestingSafe],
  );

  return {
    isRequesting,
    streamModelResponse,
  };
}
