import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useConversationStore } from '../store/conversationStore';
import { MODEL_BY_ID } from '../lib/modelConfig';
import { buildTurnSystemPrompt, getPersonaLabel } from '../lib/prompts';
import { useStream } from './useStream';
import { useSettingsStore } from '../store/settingsStore';

const MIN_TYPING_BUBBLE_MS = 420;
const WORD_REVEAL_INTERVAL_MS = 55;
const REVEAL_IDLE_POLL_MS = 20;

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
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
      reject(new Error('Aborted while waiting.'));
    }

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }

      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function enqueueWordUnits(text, queue, flushTrailingPartial = false) {
  if (!text) {
    return '';
  }

  const segments = text.split(/(\s+)/).filter(Boolean);
  let remainder = '';

  for (let index = 0; index < segments.length; index += 1) {
    const token = segments[index];

    if (/^\s+$/.test(token)) {
      if (queue.length > 0) {
        queue[queue.length - 1] += token;
      } else {
        queue.push(token);
      }
      continue;
    }

    const next = segments[index + 1];
    const hasWhitespaceAfter = typeof next === 'string' && /^\s+$/.test(next);

    if (hasWhitespaceAfter) {
      queue.push(token + next);
      index += 1;
      continue;
    }

    if (flushTrailingPartial) {
      queue.push(token);
    } else {
      remainder = token;
    }
  }

  return remainder;
}

function stripThinkBlocks(text) {
  return String(text || '')
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<\/?think\b[^>]*>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createThinkStreamSanitizer() {
  const OPEN_PREFIX = '<think';
  const CLOSE_TAG = '</think>';
  const tailSafetyWindow = OPEN_PREFIX.length - 1;

  let buffer = '';
  let insideThinkBlock = false;

  return function sanitizeThinkDelta(delta, flush = false) {
    if (delta) {
      buffer += String(delta);
    }

    let output = '';

    while (buffer.length > 0) {
      const lower = buffer.toLowerCase();

      if (insideThinkBlock) {
        const closeIndex = lower.indexOf(CLOSE_TAG);
        if (closeIndex === -1) {
          if (flush) {
            buffer = '';
          } else {
            buffer = buffer.slice(Math.max(0, buffer.length - CLOSE_TAG.length));
          }
          break;
        }

        buffer = buffer.slice(closeIndex + CLOSE_TAG.length);
        insideThinkBlock = false;
        continue;
      }

      const openIndex = lower.indexOf(OPEN_PREFIX);
      if (openIndex === -1) {
        if (flush || buffer.length <= tailSafetyWindow) {
          output += buffer;
          buffer = '';
        } else {
          output += buffer.slice(0, -tailSafetyWindow);
          buffer = buffer.slice(-tailSafetyWindow);
        }
        break;
      }

      output += buffer.slice(0, openIndex);
      buffer = buffer.slice(openIndex);

      const openTagEnd = buffer.indexOf('>');
      if (openTagEnd === -1) {
        if (flush) {
          buffer = '';
        }
        break;
      }

      buffer = buffer.slice(openTagEnd + 1);
      insideThinkBlock = true;
    }

    return output;
  };
}

function createMessageId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `msg-${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
}

function isAiMessage(message) {
  return message.side === 'ai1' || message.side === 'ai2';
}

function buildContextMessages({ transcript, systemPrompt, speakerSide }) {
  const context = [{ role: 'system', content: systemPrompt }];

  transcript.forEach((message) => {
    if (message.role === 'system') {
      const clean = stripThinkBlocks(message.content);
      if (!clean) {
        return;
      }

      context.push({
        role: 'user',
        content: `[Director Note] ${clean}`,
      });
      return;
    }

    if (!isAiMessage(message)) {
      return;
    }

    const clean = stripThinkBlocks(message.content);
    if (!clean) {
      return;
    }

    context.push({
      role: message.side === speakerSide ? 'assistant' : 'user',
      content: clean,
    });
  });

  return context;
}
export function useConversation() {
  const {
    sessionId,
    conversationKey,
    setup,
    transcript,
    status,
    isStreaming,
    startConversation,
    pauseConversation,
    resumeConversation,
    completeConversation,
    stopConversation,
    addMessage,
    updateMessage,
    removeMessage,
    setStreamError,
    setStreaming,
  } = useConversationStore();

  const {
    turns: PER_SIDE_LIMIT,
    ai1Temperature,
    ai2Temperature,
    ai1MaxTokens,
    ai2MaxTokens,
    ai1TopP,
    ai2TopP,
    ai1SystemPrompt,
    ai2SystemPrompt
  } = useSettingsStore();

  const { streamModelResponse, isRequesting } = useStream();
  const runningTurnRef = useRef(false);
  const abortControllerRef = useRef(null);

  const aiTurnCount = useMemo(
    () => transcript.filter((message) => isAiMessage(message)).length,
    [transcript],
  );

  const ai1TurnCount = useMemo(
    () => transcript.filter((message) => message.side === 'ai1' && isAiMessage(message)).length,
    [transcript],
  );

  const ai2TurnCount = useMemo(
    () => transcript.filter((message) => message.side === 'ai2' && isAiMessage(message)).length,
    [transcript],
  );

  const shouldStopBySideCap = ai1TurnCount >= PER_SIDE_LIMIT && ai2TurnCount >= PER_SIDE_LIMIT;

  const executeTurn = useCallback(
    async ({ forcedSide = null, forcedTurn = null } = {}) => {
      if (runningTurnRef.current) {
        return;
      }

      if (shouldStopBySideCap) {
        completeConversation();
        return;
      }

      let side = forcedSide || (aiTurnCount % 2 === 0 ? 'ai1' : 'ai2');

      if (!forcedSide) {
        if (side === 'ai1' && ai1TurnCount >= PER_SIDE_LIMIT) {
          side = 'ai2';
        }

        if (side === 'ai2' && ai2TurnCount >= PER_SIDE_LIMIT) {
          side = 'ai1';
        }
      }

      if ((side === 'ai1' && ai1TurnCount >= PER_SIDE_LIMIT) || (side === 'ai2' && ai2TurnCount >= PER_SIDE_LIMIT)) {
        completeConversation();
        return;
      }

      const turnNumber = forcedTurn || aiTurnCount + 1;
      const totalMaxTurns = PER_SIDE_LIMIT * 2;
      const turnType = turnNumber <= 1 ? 'start' : 'continue';
      const speakerModelId = side === 'ai1' ? setup.ai1Model : setup.ai2Model;
      const opponentModelId = side === 'ai1' ? setup.ai2Model : setup.ai1Model;
      const speakerModelMeta = MODEL_BY_ID[speakerModelId];
      const opponentModelMeta = MODEL_BY_ID[opponentModelId];
      const speakerModel = speakerModelMeta?.model || speakerModelId;
      const opponentModel = opponentModelMeta?.model || opponentModelId;
      const provider = speakerModelMeta?.provider || 'groq';

      const speakerPersona = getPersonaLabel(
        speakerModelMeta?.label || speakerModel,
        side === 'ai1' ? setup.persona1 : setup.persona2,
      );
      const opponentPersona = getPersonaLabel(
        opponentModelMeta?.label || opponentModel,
        side === 'ai1' ? setup.persona2 : setup.persona1,
      );

      const sideTurnNumber = side === 'ai1' ? ai1TurnCount + 1 : ai2TurnCount + 1;
      const openingSeed = side === 'ai1' ? setup.openingSeed1 : setup.openingSeed2;

      const basePrompt = buildTurnSystemPrompt({
        mode: setup.mode,
        topic: setup.topic,
        speakerSide: side,
        speakerModel,
        opponentModel,
        speakerPersona,
        opponentPersona,
        openingSeed,
        turnNumber: sideTurnNumber,
      });

      const personalitySystemPrompt = side === 'ai1' ? ai1SystemPrompt : ai2SystemPrompt;
      const prompt = personalitySystemPrompt.trim() ? `${basePrompt}\n\n${personalitySystemPrompt}` : basePrompt;

      const messageId = createMessageId();
      const message = {
        id: messageId,
        role: 'assistant',
        side,
        model: speakerModel,
        persona: speakerPersona,
        content: '',
        turn: turnNumber,
        timestamp: new Date().toISOString(),
        status: 'streaming',
        interrupted: false,
      };

      addMessage(message);
      setStreaming(true);
      setStreamError(null);
      runningTurnRef.current = true;

      let fullContent = '';
      let displayedContent = '';
      let pendingWordRemainder = '';
      const revealQueue = [];
      let streamFinished = false;
      const sanitizeThinkDelta = createThinkStreamSanitizer();
      const bubbleVisibleUntil = Date.now() + MIN_TYPING_BUBBLE_MS;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      let revealLoopPromise = null;

      const runRevealLoop = async () => {
        if (revealLoopPromise) {
          return revealLoopPromise;
        }

        revealLoopPromise = (async () => {
          while (!controller.signal.aborted) {
            if (Date.now() < bubbleVisibleUntil) {
              try {
                await wait(REVEAL_IDLE_POLL_MS, controller.signal);
              } catch {
                break;
              }
              continue;
            }

            if (revealQueue.length > 0) {
              displayedContent += revealQueue.shift() || '';
              updateMessage(messageId, {
                content: displayedContent,
                status: 'streaming',
              });
              try {
                await wait(WORD_REVEAL_INTERVAL_MS, controller.signal);
              } catch {
                break;
              }
              continue;
            }

            if (streamFinished) {
              break;
            }

            try {
              await wait(REVEAL_IDLE_POLL_MS, controller.signal);
            } catch {
              break;
            }
          }
        })();

        try {
          await revealLoopPromise;
        } finally {
          revealLoopPromise = null;
        }
      };

      void runRevealLoop();

      try {
        const initialMessages = buildContextMessages({
          transcript: transcript.slice(-10),
          systemPrompt: prompt,
          speakerSide: side,
        });

        const totalChars = initialMessages.reduce((sum, m) => sum + m.content.length, 0);
        const messages = totalChars > 12000 
          ? buildContextMessages({ transcript: transcript.slice(-6), systemPrompt: prompt, speakerSide: side })
          : initialMessages;

        const isGroqOrOpenRouter = provider === 'groq' || provider === 'openrouter';
        const activeParams = {
          temperature: side === 'ai1' ? ai1Temperature : ai2Temperature,
          max_tokens: side === 'ai1' ? ai1MaxTokens : ai2MaxTokens,
          ...(isGroqOrOpenRouter && { top_p: side === 'ai1' ? ai1TopP : ai2TopP })
        };

        if (side === 'ai1') {
          console.log('AI-1 params:', activeParams);
          console.log('AI-1 system prompt:', prompt);
        } else {
          console.log('AI-2 params:', activeParams);
          console.log('AI-2 system prompt:', prompt);
        }

        await streamModelResponse({
          provider,
          model: speakerModel,
          messages,
          sessionId,
          conversationKey,
          turnType,
          turnNumber,
          maxTurns: totalMaxTurns,
          temperature: side === 'ai1' ? ai1Temperature : ai2Temperature,
          max_tokens: side === 'ai1' ? ai1MaxTokens : ai2MaxTokens,
          top_p: side === 'ai1' ? ai1TopP : ai2TopP,
          signal: controller.signal,
          onDelta: (delta) => {
            const cleanDelta = sanitizeThinkDelta(delta);
            if (!cleanDelta) {
              return;
            }

            fullContent += cleanDelta;
            pendingWordRemainder = enqueueWordUnits(`${pendingWordRemainder}${cleanDelta}`, revealQueue);
            void runRevealLoop();
          },
        });

        const flushedDelta = sanitizeThinkDelta('', true);
        if (flushedDelta) {
          fullContent += flushedDelta;
          pendingWordRemainder = enqueueWordUnits(`${pendingWordRemainder}${flushedDelta}`, revealQueue);
        }

        pendingWordRemainder = enqueueWordUnits(pendingWordRemainder, revealQueue, true);
        streamFinished = true;
        await runRevealLoop();

        const trimmed = fullContent.trim();

        updateMessage(messageId, {
          content: trimmed,
          status: 'done',
          interrupted: false,
          finishedAt: new Date().toISOString(),
        });
      } catch (error) {
        const errorText = String(error?.message || 'Unknown stream error');
        const interrupted = controller.signal.aborted;
        const isAdmissionBlocked = errorText.includes('admission_blocked_active_priority');
        const isAdmissionTimeout = errorText.includes('active_conversation_retry_timeout');
        const turnDiagnostics = {
          side,
          turn: turnNumber,
          provider,
          model: speakerModel,
          sessionId,
          conversationKey,
          turnType,
        };

        console.error('[useConversation] executeTurn failed', {
          ...turnDiagnostics,
          interrupted,
          error: errorText,
        });

        streamFinished = true;

        if (isAdmissionBlocked) {
          removeMessage(messageId);
          setStreamError('Another duel is currently in progress. New duels can start once it finishes.');
          pauseConversation();
          return;
        }

        if (isAdmissionTimeout) {
          setStreamError('Active duel timed out after waiting 5 minutes for provider capacity. Resume to retry.');
        }

        const suffix = interrupted ? '\n\n[interrupted]' : '';
        const safeContent = (fullContent || '').trim() + suffix;

        updateMessage(messageId, {
          content: safeContent,
          status: interrupted ? 'interrupted' : 'error',
          interrupted,
          error: errorText,
          finishedAt: new Date().toISOString(),
        });

        if (interrupted) {
          return;
        }

        const contextualError = interrupted
          ? `${errorText} (interrupted side=${side} turn=${turnNumber})`
          : `${errorText} (side=${side} turn=${turnNumber} provider=${provider} model=${speakerModel})`;

        setStreamError(contextualError);
        pauseConversation();
      } finally {
        abortControllerRef.current = null;
        runningTurnRef.current = false;
        setStreaming(false);
      }
    },
    [
      aiTurnCount,
      ai1TurnCount,
      ai2TurnCount,
      addMessage,
      completeConversation,
      shouldStopBySideCap,
      sessionId,
      conversationKey,
      setStreamError,
      setStreaming,
      setup.ai1Model,
      setup.ai2Model,
      setup.openingSeed1,
      setup.openingSeed2,
      setup.mode,
      setup.persona1,
      setup.persona2,
      setup.topic,
      pauseConversation,
      streamModelResponse,
      transcript,
      removeMessage,
      updateMessage,
    ],
  );

  useEffect(() => {
    if (status !== 'running') {
      return;
    }

    if (isStreaming || isRequesting) {
      return;
    }

    if (shouldStopBySideCap) {
      completeConversation();
      return;
    }

    void executeTurn();
  }, [
    completeConversation,
    executeTurn,
    isRequesting,
    isStreaming,
    shouldStopBySideCap,
    status,
  ]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      runningTurnRef.current = false;
      setStreaming(false);
    };
  }, [setStreaming]);

  const pause = useCallback(() => {
    pauseConversation();
  }, [pauseConversation]);

  const resume = useCallback(() => {
    resumeConversation();
  }, [resumeConversation]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    stopConversation();
  }, [stopConversation]);

  const retryLatestInterrupted = useCallback(() => {
    const reversed = [...transcript].reverse();
    const target = reversed.find(
      (message) => isAiMessage(message) && (message.status === 'error' || message.status === 'interrupted'),
    );

    if (!target) {
      return;
    }

    removeMessage(target.id);
    setStreamError(null);
    void executeTurn({ forcedSide: target.side, forcedTurn: target.turn });
  }, [executeTurn, removeMessage, setStreamError, transcript]);

  return {
    sessionId,
    setup,
    transcript,
    status,
    isStreaming,
    isRequesting,
    aiTurnCount,
    ai1TurnCount,
    ai2TurnCount,
    sideTurnLimit: PER_SIDE_LIMIT,
    startConversation,
    pause,
    resume,
    stop,
    retryLatestInterrupted,
  };
}
