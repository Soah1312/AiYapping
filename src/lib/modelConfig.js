export const FREE_TURN_LIMIT = 10;

export const MODEL_OPTIONS = [
  {
    id: 'groq-llama-3.3-70b',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B',
    flavor: 'Groq • fast reasoning',
    icon: '/icons/llama.svg',
  },
  {
    id: 'groq-llama-3.1-8b',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B',
    flavor: 'Groq • ultra fast',
    icon: '/icons/llama.svg',
  },
  {
    id: 'groq-mixtral-8x7b',
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    label: 'Mixtral 8x7B',
    flavor: 'Groq • balanced',
    icon: '/icons/mixtral.svg',
  },
  {
    id: 'hf-gemma2-9b-it',
    provider: 'huggingface',
    model: 'google/gemma-2-9b-it',
    label: 'Gemma 2 9B',
    flavor: 'HF Inference • open',
    icon: '/icons/gemma.svg',
  },
  {
    id: 'hf-mistral-7b-instruct',
    provider: 'huggingface',
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
    label: 'Mistral 7B Instruct',
    flavor: 'HF Inference • versatile',
    icon: '/icons/mixtral.svg',
  },
  {
    id: 'hf-llama-3.1-8b-instruct',
    provider: 'huggingface',
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    label: 'Llama 3.1 8B Instruct',
    flavor: 'HF Inference • popular',
    icon: '/icons/llama.svg',
  },
];

export const MODEL_BY_ID = Object.fromEntries(MODEL_OPTIONS.map((model) => [model.id, model]));

export const DEFAULT_SETUP = {
  ai1Model: 'groq-llama-3.3-70b',
  ai2Model: 'groq-llama-3.1-8b',
  persona1: '',
  persona2: '',
  openingSeed1: '',
  openingSeed2: '',
  mode: 'chat',
  topic: '',
  endConditions: {
    fixedTurnsEnabled: true,
    fixedTurns: 20,
    perSideTurns: 10,
    manualStop: true,
    autoConsensus: false,
  },
};
