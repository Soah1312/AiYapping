import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useConversationStore } from '../store/conversationStore';
import { buildTurnSystemPrompt, getPersonaLabel } from '../lib/prompts';
import { MODEL_BY_ID } from '../lib/modelConfig';
import { useStream } from './useStream';

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

async function requestConsensus({ transcript, topic, mode }) {
  const response = await fetch('/api/judge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript,
      topic,
      mode,
      consensusCheck: true,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  return payload;
}

export function useConversation() {
  const {
    sessionId,
    setup,
    transcript,
    status,
    isStreaming,
    summary,
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
    setConsensus,
  } = useConversationStore();

  const { streamModelResponse, isRequesting } = useStream();
  const runningTurnRef = useRef(false);
  const abortControllerRef = useRef(null);

  const aiTurnCount = useMemo(
    () => transcript.filter((message) => isAiMessage(message)).length,
    [transcript],
  );

  const shouldStopByFixedTurns = useMemo(() => {
    if (!setup.endConditions.fixedTurnsEnabled) {
      return false;
    }

    return aiTurnCount >= setup.endConditions.fixedTurns;
  }, [aiTurnCount, setup.endConditions.fixedTurns, setup.endConditions.fixedTurnsEnabled]);

  const executeTurn = useCallback(
    async ({ forcedSide = null, forcedTurn = null } = {}) => {
      if (runningTurnRef.current) {
        return;
      }

      const side = forcedSide || (aiTurnCount % 2 === 0 ? 'ai1' : 'ai2');
      const turnNumber = forcedTurn || aiTurnCount + 1;
      const speakerModel = side === 'ai1' ? setup.ai1Model : setup.ai2Model;
      const opponentModel = side === 'ai1' ? setup.ai2Model : setup.ai1Model;
      const speakerPersona = getPersonaLabel(
        speakerModel,
        side === 'ai1' ? setup.persona1 : setup.persona2,
      );
      const opponentPersona = getPersonaLabel(
        opponentModel,
        side === 'ai1' ? setup.persona2 : setup.persona1,
      );

      const prompt = buildTurnSystemPrompt({
        mode: setup.mode,
        topic: setup.topic,
        speakerSide: side,
        speakerModel,
        opponentModel,
        speakerPersona,
        opponentPersona,
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
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const messages = buildContextMessages({
          transcript,
          systemPrompt: prompt,
          speakerSide: side,
        });

        const speakerProvider = MODEL_BY_ID[speakerModel]?.provider || 'groq';

        await streamModelResponse({
          provider: speakerProvider,
          modelId: speakerModel,
          messages,
          sessionId,
          signal: controller.signal,
          onDelta: (delta) => {
            fullContent += delta;
            updateMessage(messageId, { content: fullContent });
          },
        });

        updateMessage(messageId, {
          content: fullContent.trim(),
          status: 'done',
          interrupted: false,
        });

        if (setup.mode === 'debate' && setup.endConditions.autoConsensus && side === 'ai2') {
          const consensus = await requestConsensus({
            transcript: [...transcript, { ...message, content: fullContent.trim(), status: 'done' }],
            topic: setup.topic,
            mode: setup.mode,
          });

          if (consensus?.consensusTriggered) {
            setConsensus({
              ...consensus,
              turn: turnNumber,
            });
            completeConversation();
          }
        }
      } catch (error) {
        const errorText = String(error?.message || 'Unknown stream error');
        const interrupted = controller.signal.aborted;

        const suffix = interrupted ? '\n\n[interrupted]' : '';
        const safeContent = (fullContent || '').trim() + suffix;

        updateMessage(messageId, {
          content: safeContent,
          status: interrupted ? 'interrupted' : 'error',
          interrupted,
          error: errorText,
        });

        setStreamError(errorText);
        pauseConversation();
      } finally {
        abortControllerRef.current = null;
        runningTurnRef.current = false;
        setStreaming(false);
      }
    },
    [
      aiTurnCount,
      addMessage,
      completeConversation,
      sessionId,
      setConsensus,
      setStreamError,
      setStreaming,
      setup.ai1Model,
      setup.ai2Model,
      setup.endConditions.autoConsensus,
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

    if (summary.consensus?.consensusTriggered) {
      completeConversation();
      return;
    }

    if (shouldStopByFixedTurns) {
      completeConversation();
      return;
    }

    void executeTurn();
  }, [
    completeConversation,
    executeTurn,
    isRequesting,
    isStreaming,
    shouldStopByFixedTurns,
    status,
    summary.consensus?.consensusTriggered,
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
    startConversation,
    pause,
    resume,
    stop,
    retryLatestInterrupted,
  };
}
