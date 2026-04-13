export const FREE_TURN_LIMIT = 999999;
export const THINKING_MODELS = ['qwen3', 'qwq', 'deepseek-r1'];
export const ULTRA_CHAOS_OPUS_MODEL_ID = 'puter-claude-opus-4-6';
export const ULTRA_CHAOS_SONNET_MODEL_ID = 'puter-claude-sonnet-4-6';

export const MODEL_OPTIONS = [
  {
    id: 'groq-llama-3.3-70b',
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B',
    flavor: 'Groq • Fast Reasoning • Flagship',
    icon: '/icons/meta-color.svg',
  },
  {
    id: 'groq-llama-4-scout-17b',
    provider: 'groq',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    label: 'Llama 4 Scout 17B',
    flavor: 'Groq • Latest Llama Family • Balanced',
    icon: '/icons/meta-color.svg',
  },
  {
    id: 'groq-qwen3-32b',
    provider: 'groq',
    model: 'qwen/qwen3-32b',
    label: 'Qwen3 32B',
    flavor: 'Groq • Strong Reasoning • Math/Code',
    icon: '/icons/qwen-color.svg',
  },
  {
    id: 'groq-kimi-k2',
    provider: 'groq',
    model: 'moonshotai/kimi-k2-instruct',
    label: 'Kimi K2 Instruct (Groq)',
    flavor: 'Groq • Long Context • Analytical',
    icon: '/icons/kimi-color.svg',
  },
  {
    id: 'groq-gpt-oss-20b',
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    label: 'GPT-OSS 20B',
    flavor: 'Groq • Open Weight • Balanced',
    icon: '/icons/openai-color.svg',
  },
  {
    id: 'hf-mistral-7b',
    provider: 'huggingface',
    model: 'mistral-community/Mistral-7B-Instruct-v0.2',
    label: 'Mistral 7B',
    flavor: 'Hugging Face • Fallback Eligible • Instruct',
    icon: '/icons/mistral-color.svg',
  },
  {
    id: 'hf-deepseek-r1',
    provider: 'huggingface',
    model: 'deepseek-ai/DeepSeek-R1',
    label: 'DeepSeek R1',
    flavor: 'Hugging Face Router • Reasoning • Optional endpoint override',
    icon: '/icons/deepseek-color.svg',
  },
  {
    id: 'nvidia-glm-4.7',
    provider: 'nvidia',
    model: 'z-ai/glm4.7',
    label: 'GLM 4.7',
    flavor: 'NVIDIA • Single API Key • GLM',
    icon: '/icons/glmv-color.svg',
  },
  {
    id: 'nvidia-kimi-k2',
    provider: 'nvidia',
    model: 'moonshotai/kimi-k2-instruct@nvidia',
    label: 'Kimi K2 Instruct (NVIDIA)',
    flavor: 'NVIDIA • Single API Key • Kimi K2',
    icon: '/icons/kimi-color.svg',
  },
  {
    id: 'nvidia-mistral-large-3-675b',
    provider: 'nvidia',
    model: 'mistralai/mistral-large-3-675b-instruct-2512',
    label: 'Mistral Large 3 675B',
    flavor: 'NVIDIA • Single API Key • Mistral Large',
    icon: '/icons/mistral-color.svg',
  },
  {
    id: 'openrouter-gemma-4',
    provider: 'openrouter',
    model: 'google/gemma-4-31b-it:free',
    label: 'Gemma 4 31B (Free)',
    flavor: 'OpenRouter • Free Tier • Gemma',
    icon: '/icons/gemma-color.svg',
  },
  {
    id: 'ghm-phi-4',
    provider: 'github-models',
    model: 'microsoft/phi-4',
    label: 'Phi-4',
    flavor: 'GitHub Models • Low Tier • Reasoning',
    icon: '/icons/gemma-color.svg',
  },
  {
    id: 'ghm-gpt-4.1-mini',
    provider: 'github-models',
    model: 'openai/gpt-4.1-mini',
    label: 'GPT-4.1 Mini',
    flavor: 'GitHub Models • Low Tier • Biggest OpenAI Low-Tier Option',
    icon: '/icons/openai-color.svg',
  },
  {
    id: ULTRA_CHAOS_OPUS_MODEL_ID,
    provider: 'puter',
    model: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    flavor: 'Puter • Ultra Chaos • User Auth Required',
    icon: '/icons/claude-ai-icon.svg',
    requiresUltraChaos: true,
  },
  {
    id: ULTRA_CHAOS_SONNET_MODEL_ID,
    provider: 'puter',
    model: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    flavor: 'Puter • Ultra Chaos • User Auth Required',
    icon: '/icons/claude-ai-icon.svg',
    requiresUltraChaos: true,
  },
];

export const MODEL_BY_ID = MODEL_OPTIONS.reduce((acc, model) => {
  acc[model.id] = model;
  acc[model.model] = model;
  return acc;
}, {});

// Backward compatibility for previously persisted model ids/tokens.
MODEL_BY_ID['hf-gemma-2-9b'] = MODEL_BY_ID['openrouter-gemma-4'];
MODEL_BY_ID['google/gemma-2-9b-it'] = MODEL_BY_ID['openrouter-gemma-4'];
MODEL_BY_ID['google/gemma-4-9b-it'] = MODEL_BY_ID['openrouter-gemma-4'];
MODEL_BY_ID['google/gemma-4-31b-it'] = MODEL_BY_ID['openrouter-gemma-4'];
MODEL_BY_ID['hf-space-deepseek-r1'] = MODEL_BY_ID['hf-deepseek-r1'];
MODEL_BY_ID['hf-space:deepseek-r1'] = MODEL_BY_ID['hf-deepseek-r1'];

export const DEFAULT_SETUP = {
  ai1Model: 'groq-llama-3.3-70b',
  ai2Model: 'groq-llama-4-scout-17b',
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
