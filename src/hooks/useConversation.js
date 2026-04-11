import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useConversationStore } from '../store/conversationStore';
import { MODEL_BY_ID } from '../lib/modelConfig';
import { buildTurnSystemPrompt, getPersonaLabel } from '../lib/prompts';
import { useStream } from './useStream';

const PER_SIDE_LIMIT = 10;
const STREAM_FLUSH_INTERVAL_MS = 35;

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
      context.push({
        role: 'user',
        content: `[Director Note] ${message.content}`,
      });
      return;
    }

    if (!isAiMessage(message)) {
      return;
    }

    context.push({
      role: message.side === speakerSide ? 'assistant' : 'user',
      content: message.content,
    });
  });

  return context;
}

export function useConversation() {
  const {
    sessionId,
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

      const prompt = buildTurnSystemPrompt({
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
      let lastFlushAt = 0;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const messages = buildContextMessages({
          transcript,
          systemPrompt: prompt,
          speakerSide: side,
        });

        await streamModelResponse({
          provider,
          model: speakerModel,
          messages,
          sessionId,
          signal: controller.signal,
          onDelta: (delta) => {
            fullContent += delta;
            const now = Date.now();
            if (now - lastFlushAt >= STREAM_FLUSH_INTERVAL_MS) {
              lastFlushAt = now;
              updateMessage(messageId, {
                content: fullContent,
                status: 'streaming',
              });
            }
          },
        });

        const trimmed = fullContent.trim();

        updateMessage(messageId, {
          content: trimmed,
          status: 'done',
          interrupted: false,
        });
      } catch (error) {
        const errorText = String(error?.message || 'Unknown stream error');
        const interrupted = controller.signal.aborted;
        const turnDiagnostics = {
          side,
          turn: turnNumber,
          provider,
          model: speakerModel,
          sessionId,
        };

        console.error('[useConversation] executeTurn failed', {
          ...turnDiagnostics,
          interrupted,
          error: errorText,
        });

        const suffix = interrupted ? '\n\n[interrupted]' : '';
        const safeContent = (fullContent || '').trim() + suffix;

        updateMessage(messageId, {
          content: safeContent,
          status: interrupted ? 'interrupted' : 'error',
          interrupted,
          error: errorText,
        });

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
