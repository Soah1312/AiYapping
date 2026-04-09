export const FREE_TURN_LIMIT = 10;

export const MODEL_OPTIONS = [
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    icon: '/icons/claude.svg',
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    icon: '/icons/openai.svg',
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    provider: 'google',
    icon: '/icons/gemini.svg',
  },
];

export const MODEL_BY_ID = Object.fromEntries(MODEL_OPTIONS.map((model) => [model.id, model]));

export const PROVIDER_KEY_STORAGE_KEYS = {
  anthropic: 'ai-arena-api-key-anthropic',
  openai: 'ai-arena-api-key-openai',
  google: 'ai-arena-api-key-google',
};

export const DEFAULT_SETUP = {
  ai1Model: 'claude-sonnet-4-5',
  ai2Model: 'gpt-4o',
  persona1: '',
  persona2: '',
  mode: 'debate',
  topic: '',
  endConditions: {
    fixedTurnsEnabled: true,
    fixedTurns: 10,
    manualStop: true,
    autoConsensus: false,
  },
};
