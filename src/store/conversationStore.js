import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_SETUP, FREE_TURN_LIMIT, MODEL_BY_ID } from '../lib/modelConfig';

const STORE_NAME = 'aiyapping-session-v1';
const MAX_SAVED_CHATS = 10;

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

function getStorage() {
  if (typeof window === 'undefined') {
    return noopStorage;
  }

  return window.localStorage;
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

function sanitizeSavedChat(chat) {
  if (!chat || typeof chat !== 'object') {
    return null;
  }

  if (typeof chat.id !== 'string' || !chat.id.trim()) {
    return null;
  }

  const transcript = Array.isArray(chat.transcript)
    ? chat.transcript.filter(isValidTranscriptMessage)
    : [];

  if (transcript.length === 0) {
    return null;
  }

  const summary = chat.summary && typeof chat.summary === 'object'
    ? {
      verdict: typeof chat.summary.verdict === 'string' ? chat.summary.verdict : null,
      consensus: typeof chat.summary.consensus === 'string' ? chat.summary.consensus : null,
    }
    : { verdict: null, consensus: null };

  return {
    id: chat.id,
    conversationKey: typeof chat.conversationKey === 'string' ? chat.conversationKey : null,
    title: typeof chat.title === 'string' ? chat.title : 'Untitled chat',
    snippet: typeof chat.snippet === 'string' ? chat.snippet : '',
    createdAt: typeof chat.createdAt === 'string' ? chat.createdAt : new Date().toISOString(),
    setup: sanitizeSetup(chat.setup),
    transcript,
    summary,
  };
}

function sanitizeSavedChats(chats) {
  if (!Array.isArray(chats)) {
    return [];
  }

  const clean = chats
    .map(sanitizeSavedChat)
    .filter(Boolean)
    .slice(0, MAX_SAVED_CHATS);

  return clean;
}

function buildSavedChatTitle(_setup, generatedTitle = '') {
  const cleanTitle = String(generatedTitle || '').trim().slice(0, 220);
  if (cleanTitle) {
    const words = cleanTitle.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) || [];
    if (words.length > 0) {
      return words.slice(0, 6).join(' ');
    }
    return cleanTitle;
  }

  const ai1 = String(_setup?.openingSeed1 || '').trim();
  const ai2 = String(_setup?.openingSeed2 || '').trim();
  const fallbackSource = ai1 || ai2 || String(_setup?.topic || '').trim();
  if (fallbackSource) {
    return fallbackSource
      .replace(/\s+/g, ' ')
      .slice(0, 72)
      .replace(/[\s,.;:!?-]+$/g, '');
  }

  return 'Untitled chat';
}

function buildSavedChatSnippet(transcript) {
  const firstMessage = transcript.find((message) => message.role !== 'system' && message.content?.trim());
  if (!firstMessage) {
    return 'No transcript preview';
  }

  return firstMessage.content.trim().slice(0, 120);
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
  generatedChatTitle: '',
  shareId: null,
  savedChats: [],
  activeSavedChatId: null,
  chaosMode: false,

  setSetup: (nextSetup) => set({ setup: nextSetup }),

  setSessionId: (sessionId) => set({ sessionId }),
  setConversationId: (conversationId) => set({ conversationId }),
  setConversationKey: (conversationKey) => set({ conversationKey }),
  setGeneratedChatTitle: (generatedChatTitle) => set({ generatedChatTitle: String(generatedChatTitle || '').trim() }),
  setChaosMode: (chaosMode) => set({ chaosMode: Boolean(chaosMode) }),

  applyGeneratedTitleToSavedChat: (conversationKey, generatedTitle) =>
    set((state) => {
      const key = String(conversationKey || '').trim();
      const nextTitle = String(generatedTitle || '').trim().slice(0, 220);
      if (!key || !nextTitle) {
        return {};
      }

      const hasMatch = state.savedChats.some((chat) => chat.conversationKey === key);
      if (!hasMatch) {
        return {};
      }

      return {
        savedChats: state.savedChats.map((chat) => (
          chat.conversationKey === key
            ? { ...chat, title: buildSavedChatTitle(chat.setup, nextTitle) }
            : chat
        )),
      };
    }),

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
      generatedChatTitle: '',
      shareId: null,
      activeSavedChatId: null,
      chaosMode: current.chaosMode,
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
      generatedChatTitle: '',
      shareId: null,
      activeSavedChatId: null,
    })),

  pauseConversation: () => set({ status: 'paused' }),
  resumeConversation: () => set({ status: 'running' }),
  completeConversation: () =>
    set((state) => {
      const finishedAt = new Date().toISOString();
      return {
      status: 'completed',
      isStreaming: false,
      transcript: state.transcript.map((message) => (
        message.status === 'streaming'
          ? {
            ...message,
            status: 'interrupted',
            interrupted: true,
            finishedAt,
          }
          : message
      )),
      };
    }),
  stopConversation: () =>
    set((state) => {
      const finishedAt = new Date().toISOString();
      return {
      status: 'completed',
      isStreaming: false,
      transcript: state.transcript.map((message) => (
        message.status === 'streaming'
          ? {
            ...message,
            status: 'interrupted',
            interrupted: true,
            finishedAt,
          }
          : message
      )),
      };
    }),

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

  saveCurrentChat: ({ title: titleOverride } = {}) => {
    const state = get();
    const transcript = state.transcript.filter(isValidTranscriptMessage);
    const existingCount = state.savedChats.length;

    if (transcript.length === 0) {
      return { ok: false, reason: 'empty', count: existingCount };
    }

    const title = buildSavedChatTitle(state.setup, titleOverride || state.generatedChatTitle).slice(0, 220);
    const snippet = buildSavedChatSnippet(transcript);
    const existingIndex = state.savedChats.findIndex((chat) => (
      state.conversationKey
      && chat.conversationKey
      && chat.conversationKey === state.conversationKey
    ));

    if (existingIndex === -1 && existingCount >= MAX_SAVED_CHATS) {
      return { ok: false, reason: 'limit', count: existingCount, limit: MAX_SAVED_CHATS };
    }

    const id = existingIndex >= 0 ? state.savedChats[existingIndex].id : createId('saved');
    const nextEntry = {
      id,
      conversationKey: state.conversationKey,
      title,
      snippet,
      createdAt: new Date().toISOString(),
      setup: sanitizeSetup(state.setup),
      transcript,
      summary: {
        verdict: state.summary?.verdict || null,
        consensus: state.summary?.consensus || null,
      },
    };

    const rest = state.savedChats.filter((chat) => chat.id !== id);
    const nextSavedChats = [nextEntry, ...rest].slice(0, MAX_SAVED_CHATS);

    set({ savedChats: nextSavedChats, activeSavedChatId: id });
    return {
      ok: true,
      reason: existingIndex >= 0 ? 'updated' : 'saved',
      count: nextSavedChats.length,
      limit: MAX_SAVED_CHATS,
      id,
    };
  },

  loadSavedChat: (savedChatId) => {
    const state = get();
    const chat = state.savedChats.find((item) => item.id === savedChatId);

    if (!chat) {
      return false;
    }

    set({
      sessionId: state.sessionId,
      conversationId: null,
      conversationKey: chat.conversationKey || createId('conv'),
      setup: sanitizeSetup(chat.setup),
      transcript: chat.transcript.filter(isValidTranscriptMessage),
      status: 'completed',
      isStreaming: false,
      streamError: null,
      redirectDraft: '',
      summary: {
        verdict: chat.summary?.verdict || null,
        consensus: chat.summary?.consensus || null,
      },
      generatedChatTitle: '',
      shareId: null,
      activeSavedChatId: chat.id,
    });

    return true;
  },

  deleteSavedChat: (savedChatId) =>
    set((state) => ({
      savedChats: state.savedChats.filter((chat) => chat.id !== savedChatId),
      activeSavedChatId: state.activeSavedChatId === savedChatId ? null : state.activeSavedChatId,
    })),
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
    redirectDraft: state.redirectDraft,
    usage: state.usage,
    summary: state.summary,
    shareId: state.shareId,
    savedChats: state.savedChats,
    activeSavedChatId: state.activeSavedChatId,
    chaosMode: state.chaosMode,
  }),
  merge: (persistedState, currentState) => {
    const persisted = persistedState || {};
    const safeSetup = sanitizeSetup(persisted.setup);
    const safeSavedChats = sanitizeSavedChats(persisted.savedChats);

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
      savedChats: safeSavedChats,
      activeSavedChatId:
        typeof persisted.activeSavedChatId === 'string'
        && safeSavedChats.some((chat) => chat.id === persisted.activeSavedChatId)
          ? persisted.activeSavedChatId
          : null,
    };
  },
}));
