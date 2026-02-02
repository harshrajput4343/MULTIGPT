export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  chat_id: string;
  role: Role;
  content: string;
  model_used: string;
  timestamp: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  messages?: Message[];
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  strength: string;
  cost: string; // e.g. "Low", "Medium", "High"
}

export const MODELS: ModelInfo[] = [
  {
    id: 'google/gemma-3-27b-it:free',
    name: 'Gemma 3 27B',
    provider: 'Google',
    description: 'Largest Gemma - best for complex analysis.',
    strength: 'Deep Analysis',
    cost: 'Free'
  },
  {
    id: 'google/gemma-3-12b-it:free',
    name: 'Gemma 3 12B',
    provider: 'Google',
    description: 'Great balance of speed and capability.',
    strength: 'General Purpose',
    cost: 'Free'
  },
  {
    id: 'google/gemma-3-4b-it:free',
    name: 'Gemma 3 4B',
    provider: 'Google',
    description: 'Fast and compact for quick tasks.',
    strength: 'Quick Responses',
    cost: 'Free'
  },
  {
    id: 'google/gemma-3n-e4b-it:free',
    name: 'Gemma 3n 4B',
    provider: 'Google',
    description: 'Optimized for mobile and edge.',
    strength: 'Efficient',
    cost: 'Free'
  },
  {
    id: 'z-ai/glm-4.5-air:free',
    name: 'GLM 4.5 Air',
    provider: 'Z-AI',
    description: 'Fast Chinese-English multilingual model.',
    strength: 'Multilingual',
    cost: 'Free'
  },
  {
    id: 'nvidia/nemotron-3-nano-30b-a3b:free',
    name: 'Nemotron 3 Nano',
    provider: 'NVIDIA',
    description: 'Efficient reasoning and agentic tasks.',
    strength: 'Reasoning',
    cost: 'Free'
  }
];
