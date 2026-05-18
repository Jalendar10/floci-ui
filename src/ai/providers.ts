import type { AIConfig } from './config'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function callAI(
  config: AIConfig,
  history: ChatMessage[],
  systemPrompt: string,
): Promise<string> {
  switch (config.provider) {
    case 'anthropic': return callAnthropic(config, history, systemPrompt)
    case 'openai':    return callOpenAI(config, history, systemPrompt, 'https://api.openai.com/v1/chat/completions')
    case 'copilot':   return callOpenAI(config, history, systemPrompt, 'https://api.githubcopilot.com/chat/completions')
    case 'ollama':    return callOllama(config, history, systemPrompt)
    default:          throw new Error(`Unknown provider: ${config.provider}`)
  }
}

async function callAnthropic(config: AIConfig, history: ChatMessage[], system: string): Promise<string> {
  if (!config.apiKey) throw new Error('Anthropic API key is required. Click the ⚙ icon to configure.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      system,
      messages: history,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message ?? `Anthropic error ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

async function callOpenAI(
  config: AIConfig,
  history: ChatMessage[],
  system: string,
  url: string,
): Promise<string> {
  if (!config.apiKey) throw new Error('API key is required. Click the ⚙ icon to configure.')

  const messages = [{ role: 'system', content: system }, ...history]

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...(config.provider === 'copilot' ? { 'Editor-Version': 'Floci/1.0' } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: 1024,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error?.message ?? `API error ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function callOllama(config: AIConfig, history: ChatMessage[], system: string): Promise<string> {
  const base = config.ollamaUrl.replace(/\/$/, '')
  const url = `${base}/api/chat`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel,
      stream: false,
      messages: [{ role: 'system', content: system }, ...history],
    }),
  })

  if (!res.ok) {
    if (res.status === 0 || !res.status) {
      throw new Error(`Cannot reach Ollama at ${base}. Make sure Ollama is running: ollama serve`)
    }
    throw new Error(`Ollama error ${res.status}`)
  }

  const data = await res.json()
  return data.message?.content ?? ''
}

// Parse a JSON action block from the AI response text
export function parseAction(text: string): { action: string; params: Record<string, unknown> } | null {
  // Match ```json ... ``` block
  const block = text.match(/```json\s*\n?([\s\S]*?)\n?```/)
  if (block) {
    try {
      const parsed = JSON.parse(block[1])
      if (parsed.action) return parsed
    } catch {}
  }

  // Match bare {"action": ...} object
  const bare = text.match(/\{[^{}]*"action"\s*:[^{}]*\}/)
  if (bare) {
    try {
      const parsed = JSON.parse(bare[0])
      if (parsed.action) return parsed
    } catch {}
  }

  return null
}
