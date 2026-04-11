import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_SETUP, FREE_TURN_LIMIT, MODEL_BY_ID } from '../lib/modelConfig';

const STORE_NAME = 'ai-arena-conversation-store-v1';

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function getStorage() {
  if (typeof window === 'undefined') {
    return noopStorage;
  }

  return window.sessionStorage;
}

function isPageReload() {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigationEntries = window.performance?.getEntriesByType?.('navigation');
  const navigationEntry = Array.isArray(navigationEntries) ? navigationEntries[0] : null;

  if (navigationEntry && typeof navigationEntry === 'object' && 'type' in navigationEntry) {
    return navigationEntry.type === 'reload';
  }

  // Legacy fallback for browsers without Navigation Timing L2 support.
  return window.performance?.navigation?.type === 1;
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
}

function isValidTranscriptMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  if (typeof message.id !== 'string' || !message.id.trim()) {
    return false;
  }

  if (typeof message.content !== 'string') {
    return false;
  }

  return true;
}

function sanitizeSetup(setup) {
  if (!setup || typeof setup !== 'object') {
    return { ...DEFAULT_SETUP };
  }

  const ai1Model = typeof setup.ai1Model === 'string' && MODEL_BY_ID[setup.ai1Model]
    ? setup.ai1Model
    : DEFAULT_SETUP.ai1Model;

  const ai2Model = typeof setup.ai2Model === 'string' && MODEL_BY_ID[setup.ai2Model]
    ? setup.ai2Model
    : DEFAULT_SETUP.ai2Model;

  return {
    ...DEFAULT_SETUP,
    ...setup,
    ai1Model,
    ai2Model,
    endConditions: {
      ...DEFAULT_SETUP.endConditions,
      ...(setup.endConditions || {}),
    },
  };
}

export const useConversationStore = create(persist((set, get) => ({
  sessionId: '',
  conversationId: null,
  conversationKey: null,
  setup: { ...DEFAULT_SETUP },
  transcript: [],
  status: 'idle',
  isStreaming: false,
  streamError: null,
  redirectDraft: '',
  usage: {
    remaining: FREE_TURN_LIMIT,
    limit: FREE_TURN_LIMIT,
  },
  summary: {
    verdict: null,
    consensus: null,
  },
  shareId: null,

  setSetup: (nextSetup) => set({ setup: nextSetup }),

  setSessionId: (sessionId) => set({ sessionId }),
  setConversationId: (conversationId) => set({ conversationId }),
  setConversationKey: (conversationKey) => set({ conversationKey }),

  patchSetup: (patch) =>
    set((state) => ({
      setup: {
        ...state.setup,
        ...patch,
        endConditions: {
          ...state.setup.endConditions,
          ...(patch.endConditions || {}),
        },
      },
    })),

  resetConversation: ({ keepSetup = true, nextSetup = null } = {}) => {
    const current = get();
    const resolvedSetup = nextSetup || (keepSetup ? current.setup : { ...DEFAULT_SETUP });

    set({
      setup: resolvedSetup,
      conversationId: null,
      conversationKey: null,
      transcript: [],
      status: 'idle',
      isStreaming: false,
      streamError: null,
      redirectDraft: '',
      summary: {
        verdict: null,
        consensus: null,
      },
      shareId: null,
    });
  },

  startConversation: () =>
    set((state) => ({
      status: 'running',
      conversationKey: state.conversationKey || createId('conv'),
      streamError: null,
      summary: {
        verdict: null,
        consensus: null,
      },
      shareId: null,
    })),

  pauseConversation: () => set({ status: 'paused' }),
  resumeConversation: () => set({ status: 'running' }),
  completeConversation: () => set({ status: 'completed', isStreaming: false }),
  stopConversation: () => set({ status: 'completed', isStreaming: false }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamError: (streamError) => set({ streamError }),

  addMessage: (message) =>
    set((state) => ({
      transcript: [...state.transcript, message],
    })),

  updateMessage: (id, patch) =>
    set((state) => ({
      transcript: state.transcript.map((message) =>
        message.id === id ? { ...message, ...patch } : message,
      ),
    })),

  removeMessage: (id) =>
    set((state) => ({
      transcript: state.transcript.filter((message) => message.id !== id),
    })),

  setRedirectDraft: (redirectDraft) => set({ redirectDraft }),

  injectRedirectNote: (content) => {
    if (!content?.trim()) {
      return;
    }

    const noteId = createId('note');
    const note = {
      id: noteId,
      role: 'system',
      side: 'system',
      model: 'director',
      persona: 'Director Note',
      content,
      timestamp: new Date().toISOString(),
      turn: null,
      status: 'done',
    };

    set((state) => ({
      transcript: [...state.transcript, note],
      redirectDraft: '',
    }));
  },

  setUsage: (usage) => set({ usage }),

  setVerdict: (verdict) =>
    set((state) => ({
      summary: {
        ...state.summary,
        verdict,
      },
    })),

  setConsensus: (consensus) =>
    set((state) => ({
      summary: {
        ...state.summary,
        consensus,
      },
    })),

  setShareId: (shareId) => set({ shareId }),
}), {
  name: STORE_NAME,
  storage: createJSONStorage(getStorage),
  partialize: (state) => ({
    sessionId: state.sessionId,
    conversationId: state.conversationId,
    conversationKey: state.conversationKey,
    setup: state.setup,
    transcript: state.transcript,
    status: state.status,
    streamError: state.streamError,
    redirectDraft: state.redirectDraft,
    usage: state.usage,
    summary: state.summary,
    shareId: state.shareId,
  }),
  merge: (persistedState, currentState) => {
    const persisted = persistedState || {};
    const safeSetup = sanitizeSetup(persisted.setup);

    if (isPageReload()) {
      return {
        ...currentState,
        ...persisted,
        setup: safeSetup,
        conversationId: null,
        conversationKey: null,
        transcript: [],
        status: 'idle',
        isStreaming: false,
        streamError: null,
        redirectDraft: '',
        summary: {
          verdict: null,
          consensus: null,
        },
        shareId: null,
      };
    }

    const persistedTranscript = Array.isArray(persisted.transcript)
      ? persisted.transcript.filter(isValidTranscriptMessage)
      : [];

    // Drop in-flight messages so rehydration can safely continue turns.
    const transcript = persistedTranscript.filter((message) => message?.status !== 'streaming');

    const status =
      persisted.status === 'running' || persisted.status === 'paused' || persisted.status === 'completed'
        ? persisted.status
        : currentState.status;

    return {
      ...currentState,
      ...persisted,
      setup: safeSetup,
      conversationKey: typeof persisted.conversationKey === 'string' ? persisted.conversationKey : null,
      transcript,
      status,
      isStreaming: false,
    };
  },
}));
