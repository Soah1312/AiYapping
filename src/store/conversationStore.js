import { create } from 'zustand';
import { DEFAULT_SETUP, FREE_TURN_LIMIT, PROVIDER_KEY_STORAGE_KEYS } from '../lib/modelConfig';

const SESSION_STORAGE_KEY = 'ai-arena-session-id';

function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `sess-${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
}

function getOrCreateSessionId() {
  if (typeof window === 'undefined') {
    return generateSessionId();
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const id = generateSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, id);
  return id;
}

function readApiKeysFromStorage() {
  if (typeof window === 'undefined') {
    return {
      anthropic: '',
      openai: '',
      google: '',
    };
  }

  return {
    anthropic: window.localStorage.getItem(PROVIDER_KEY_STORAGE_KEYS.anthropic) || '',
    openai: window.localStorage.getItem(PROVIDER_KEY_STORAGE_KEYS.openai) || '',
    google: window.localStorage.getItem(PROVIDER_KEY_STORAGE_KEYS.google) || '',
  };
}

function saveApiKeysToStorage(keys) {
  if (typeof window === 'undefined') {
    return;
  }

  Object.entries(PROVIDER_KEY_STORAGE_KEYS).forEach(([provider, storageKey]) => {
    const value = keys[provider] || '';
    if (value) {
      window.localStorage.setItem(storageKey, value);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  });
}

const initialApiKeys = readApiKeysFromStorage();

export const useConversationStore = create((set, get) => ({
  sessionId: getOrCreateSessionId(),
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
  apiKeys: initialApiKeys,

  setSetup: (nextSetup) => set({ setup: nextSetup }),

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

  setApiKeys: (keys) => {
    saveApiKeysToStorage(keys);
    set({ apiKeys: keys });
  },

  refreshApiKeysFromStorage: () => {
    set({ apiKeys: readApiKeysFromStorage() });
  },

  resetConversation: ({ keepSetup = true, nextSetup = null } = {}) => {
    const current = get();
    const resolvedSetup = nextSetup || (keepSetup ? current.setup : { ...DEFAULT_SETUP });

    set({
      setup: resolvedSetup,
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

    const note = {
      id: crypto.randomUUID(),
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
