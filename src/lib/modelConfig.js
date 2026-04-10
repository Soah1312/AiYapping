export const FREE_TURN_LIMIT = 10;

export const MODEL_OPTIONS = [
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B Versatile',
    flavor: 'Deep reasoning',
    icon: '/icons/llama.svg',
    provider: 'groq',
  },
  {
    id: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B Instant',
    flavor: 'Lightning fast',
    icon: '/icons/llama.svg',
    provider: 'groq',
  },
  {
    id: 'mixtral-8x7b-32768',
    label: 'Mixtral 8x7B 32768',
    flavor: 'Alternative logic',
    icon: '/icons/mixtral.svg',
    provider: 'groq',
  },
  {
    id: 'gemma2-9b-it',
    label: 'Gemma2 9B IT',
    flavor: "Google's open model",
    icon: '/icons/gemma.svg',
    provider: 'groq',
  },
  {
    id: 'mistralai/Mistral-7B-Instruct-v0.3',
    label: 'Mistral 7B Instruct v0.3',
    flavor: 'HF instruction tuned',
    icon: '/icons/mixtral.svg',
    provider: 'huggingface',
  },
  {
    id: 'microsoft/Phi-3-mini-4k-instruct',
    label: 'Phi-3 Mini 4K Instruct',
    flavor: 'Small fast instruct',
    icon: '/icons/gemma.svg',
    provider: 'huggingface',
  },
  {
    id: 'HuggingFaceH4/zephyr-7b-beta',
    label: 'Zephyr 7B Beta',
    flavor: 'Chat aligned model',
    icon: '/icons/llama.svg',
    provider: 'huggingface',
  },
  {
    id: 'Qwen/Qwen2.5-72B-Instruct',
    label: 'Qwen2.5 72B Instruct',
    flavor: 'Large model high latency',
    icon: '/icons/llama.svg',
    provider: 'huggingface',
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
