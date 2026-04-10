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
    id: 'groq-llama-4-scout-17b',
    provider: 'groq',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    label: 'Llama 4 Scout 17B',
    flavor: 'Groq • latest Llama family',
    icon: '/icons/llama.svg',
  },
  {
    id: 'groq-qwen3-32b',
    provider: 'groq',
    model: 'qwen/qwen3-32b',
    label: 'Qwen3 32B',
    flavor: 'Groq • strong reasoning',
    icon: '/icons/llama.svg',
  },
  {
    id: 'groq-kimi-k2',
    provider: 'groq',
    model: 'moonshotai/kimi-k2-instruct',
    label: 'Kimi K2 Instruct',
    flavor: 'Groq • long-context capable',
    icon: '/icons/mixtral.svg',
  },
  {
    id: 'groq-gpt-oss-20b',
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    label: 'GPT-OSS 20B',
    flavor: 'Groq • open-weight option',
    icon: '/icons/llama.svg',
  },
  {
    id: 'hf-arch-router-1.5b',
    provider: 'huggingface',
    model: 'katanemo/Arch-Router-1.5B',
    label: 'Arch-Router 1.5B',
    flavor: 'HF Inference • supported chat',
    icon: '/icons/gemma.svg',
  },
];

export const MODEL_BY_ID = MODEL_OPTIONS.reduce((acc, model) => {
  acc[model.id] = model;
  acc[model.model] = model;
  return acc;
}, {});

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
