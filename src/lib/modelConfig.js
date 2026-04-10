export const FREE_TURN_LIMIT = 10;

export const MODEL_OPTIONS = [
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B Versatile',
    flavor: 'Deep reasoning',
    icon: '/icons/llama.svg',
  },
  {
    id: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B Instant',
    flavor: 'Lightning fast',
    icon: '/icons/llama.svg',
  },
  {
    id: 'mixtral-8x7b-32768',
    label: 'Mixtral 8x7B 32768',
    flavor: 'Alternative logic',
    icon: '/icons/mixtral.svg',
  },
  {
    id: 'gemma2-9b-it',
    label: 'Gemma2 9B IT',
    flavor: "Google's open model",
    icon: '/icons/gemma.svg',
  },
];

export const MODEL_BY_ID = Object.fromEntries(MODEL_OPTIONS.map((model) => [model.id, model]));

export const DEFAULT_SETUP = {
  ai1Model: 'llama-3.3-70b-versatile',
  ai2Model: 'llama-3.1-8b-instant',
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
