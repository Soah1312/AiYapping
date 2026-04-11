export const FREE_TURN_LIMIT = 999999;

export const MODEL_OPTIONS = [
  {
    id: 'groq-llama-3.3-70b',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B',
    flavor: 'Groq • Fast Reasoning • Flagship',
    icon: '/icons/llama.svg',
  },
  {
    id: 'groq-llama-3.1-8b',
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B',
    flavor: 'Groq • Ultra Fast • Low Latency',
    icon: '/icons/llama.svg',
  },
  {
    id: 'groq-llama-4-scout-17b',
    provider: 'groq',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    label: 'Llama 4 Scout 17B',
    flavor: 'Groq • Latest Llama Family • Balanced',
    icon: '/icons/llama.svg',
  },
  {
    id: 'groq-qwen3-32b',
    provider: 'groq',
    model: 'qwen/qwen3-32b',
    label: 'Qwen3 32B',
    flavor: 'Groq • Strong Reasoning • Math/Code',
    icon: '/icons/llama.svg',
  },
  {
    id: 'groq-kimi-k2',
    provider: 'groq',
    model: 'moonshotai/kimi-k2-instruct',
    label: 'Kimi K2 Instruct (Groq)',
    flavor: 'Groq • Long Context • Analytical',
    icon: '/icons/mixtral.svg',
  },
  {
    id: 'groq-gpt-oss-20b',
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    label: 'GPT-OSS 20B',
    flavor: 'Groq • Open Weight • Balanced',
    icon: '/icons/llama.svg',
  },
  {
    id: 'hf-gemma-2-9b',
    provider: 'huggingface',
    model: 'google/gemma-2-9b-it',
    label: 'Gemma 2 9B',
    flavor: 'Hugging Face • Fallback Eligible • Chat',
    icon: '/icons/gemma.svg',
  },
  {
    id: 'hf-mistral-7b',
    provider: 'huggingface',
    model: 'mistral-community/Mistral-7B-Instruct-v0.2',
    label: 'Mistral 7B',
    flavor: 'Hugging Face • Fallback Eligible • Instruct',
    icon: '/icons/mixtral.svg',
  },
  {
    id: 'hf-arch-router-1.5b',
    provider: 'huggingface',
    model: 'katanemo/Arch-Router-1.5B',
    label: 'Arch-Router 1.5B',
    flavor: 'Hugging Face • Reliable HF Inference • Chat',
    icon: '/icons/gemma.svg',
  },
  {
    id: 'nvidia-gemma-7b',
    provider: 'nvidia',
    model: 'google/gemma-7b',
    label: 'Gemma 7B',
    flavor: 'NVIDIA • Model-Specific Key • Gemma',
    icon: '/icons/gemma.svg',
  },
  {
    id: 'nvidia-glm-4.7',
    provider: 'nvidia',
    model: 'z-ai/glm4.7',
    label: 'GLM 4.7',
    flavor: 'NVIDIA • Model-Specific Key • GLM',
    icon: '/icons/llama.svg',
  },
  {
    id: 'nvidia-deepseek-v3.2',
    provider: 'nvidia',
    model: 'deepseek-ai/deepseek-v3.2',
    label: 'DeepSeek V3.2',
    flavor: 'NVIDIA • Model-Specific Key • DeepSeek',
    icon: '/icons/llama.svg',
  },
  {
    id: 'nvidia-kimi-k2',
    provider: 'nvidia',
    model: 'moonshotai/kimi-k2-instruct@nvidia',
    label: 'Kimi K2 Instruct (NVIDIA)',
    flavor: 'NVIDIA • Model-Specific Key • Kimi K2',
    icon: '/icons/mixtral.svg',
  },
  {
    id: 'nvidia-mistral-large-3-675b',
    provider: 'nvidia',
    model: 'mistralai/mistral-large-3-675b-instruct-2512',
    label: 'Mistral Large 3 675B',
    flavor: 'NVIDIA • Model-Specific Key • Mistral Large',
    icon: '/icons/mixtral.svg',
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
