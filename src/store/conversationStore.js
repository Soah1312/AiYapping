import { create } from 'zustand';
import { DEFAULT_SETUP, FREE_TURN_LIMIT } from '../lib/modelConfig';

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
}

export const useConversationStore = create((set, get) => ({
  sessionId: '',
  conversationId: null,
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
    set({
      status: 'running',
      streamError: null,
      summary: {
        verdict: null,
        consensus: null,
      },
      shareId: null,
    }),

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
}));
