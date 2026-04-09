import { useCallback, useState } from 'react';

function parseEventBlock(block) {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return null;
  }

  let event = 'message';
  let data = '';

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    }

    if (line.startsWith('data:')) {
      data += line.slice(5).trim();
    }
  });

  return { event, data };
}

function readErrorPayload(text) {
  try {
    const parsed = JSON.parse(text);
    return parsed?.error || parsed?.message || text;
  } catch {
    return text;
  }
}

export function useStream() {
  const [isRequesting, setIsRequesting] = useState(false);

  const streamModelResponse = useCallback(
    async ({ model, messages, sessionId, apiKey, onDelta, signal }) => {
      setIsRequesting(true);

      const headers = {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
      };

      if (apiKey) {
        headers['x-provider-api-key'] = apiKey;
      }

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ model, messages, sessionId }),
          signal,
        });

        if (!response.ok) {
          const text = await response.text();
          const payload = readErrorPayload(text);
          throw new Error(`${response.status}:${payload}`);
        }

        if (!response.body) {
          throw new Error('No stream body returned by server.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
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
            const parsed = parseEventBlock(block);
            if (!parsed || !parsed.data) {
              continue;
            }

            if (parsed.data === '[DONE]') {
              return;
            }

            let payload;
            try {
              payload = JSON.parse(parsed.data);
            } catch {
              payload = { delta: parsed.data };
            }

            if (payload.error) {
              throw new Error(payload.error);
            }

            if (payload.delta) {
              onDelta?.(payload.delta);
            }
          }
        }
      } finally {
        setIsRequesting(false);
      }
    },
    [],
  );

  return {
    isRequesting,
    streamModelResponse,
  };
}
