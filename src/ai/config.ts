export type AIProvider = 'anthropic' | 'openai' | 'ollama' | 'copilot'

export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
  ollamaUrl: string
  ollamaModel: string
}

export const PROVIDER_DEFAULTS: Record<AIProvider, { model: string; label: string; models: string[] }> = {
  anthropic: {
    label: 'Anthropic Claude',
    model: 'claude-haiku-4-5-20251001',
    models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7'],
  },
  openai: {
    label: 'OpenAI',
    model: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  },
  ollama: {
    label: 'Ollama (local)',
    model: 'llama3',
    models: ['llama3', 'llama3.1', 'mistral', 'codellama', 'phi3', 'gemma2'],
  },
  copilot: {
    label: 'GitHub Copilot',
    model: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
  },
}

const STORAGE_KEY = 'floci-ai-config'

const DEFAULT_CONFIG: AIConfig = {
  provider: 'ollama',
  apiKey: '',
  model: 'llama3',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
}

export function loadConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_CONFIG
}

export function saveConfig(cfg: AIConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}
