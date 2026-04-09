import { useCallback, useState } from 'react';

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

    try {
      const payload = JSON.parse(data);
      if (payload?.delta) {
        onDelta(payload.delta);
      }
      if (payload?.error) {
        throw new Error(payload.error);
      }
      return;
    } catch {
      onDelta(data);
      return;
    }
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
    try {
      const parsed = JSON.parse(rawValue);
      throw new Error(typeof parsed === 'string' ? parsed : parsed?.error || 'Stream error');
    } catch {
      throw new Error(rawValue.replace(/^"|"$/g, '') || 'Stream error');
    }
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
    return parsed?.error || parsed?.message || text;
  } catch {
    return text;
  }
}

export function useStream() {
  const [isRequesting, setIsRequesting] = useState(false);

  const streamModelResponse = useCallback(
    async ({ model, messages, sessionId, onDelta, signal }) => {
      setIsRequesting(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
