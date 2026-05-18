import { useState, useRef, useEffect } from 'react'
import { X, Settings, Send, Bot, Loader, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { loadConfig, saveConfig, PROVIDER_DEFAULTS } from '../ai/config'
import type { AIConfig, AIProvider } from '../ai/config'
import { callAI, parseAction } from '../ai/providers'
import type { ChatMessage } from '../ai/providers'
import { TOOL_MAP, SYSTEM_PROMPT } from '../ai/tools'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  text: string
  toolName?: string
  toolStatus?: 'running' | 'ok' | 'error'
}

function uid() { return Math.random().toString(36).slice(2) }

// ── Config Modal ────────────────────────────────────────────────────────────
function ConfigModal({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<AIConfig>(loadConfig)
  const [saved, setSaved] = useState(false)

  function save() {
    saveConfig(cfg)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  const p = cfg.provider
  const defaults = PROVIDER_DEFAULTS[p]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 8, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#232f3e', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>AI Agent Configuration</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aab7b8', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Provider selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#545b64', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              AI Provider
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(Object.entries(PROVIDER_DEFAULTS) as [AIProvider, typeof PROVIDER_DEFAULTS[AIProvider]][]).map(([key, info]) => (
                <button key={key} onClick={() => setCfg(c => ({ ...c, provider: key, model: info.model }))}
                  style={{
                    padding: '10px 14px', border: `2px solid ${cfg.provider === key ? '#0073bb' : '#e9ebed'}`,
                    borderRadius: 6, background: cfg.provider === key ? '#e8f4fb' : '#fff',
                    cursor: 'pointer', textAlign: 'left', fontSize: 13,
                    color: cfg.provider === key ? '#0073bb' : '#16191f', fontWeight: cfg.provider === key ? 700 : 400,
                  }}>
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key (for cloud providers) */}
          {p !== 'ollama' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#545b64', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {p === 'copilot' ? 'GitHub Copilot Token' : 'API Key'}
              </label>
              {p === 'copilot' && (
                <p style={{ fontSize: 12, color: '#545b64', marginBottom: 8 }}>
                  Get your token from the GitHub Copilot extension or run:{' '}
                  <code style={{ fontSize: 11, background: '#f2f3f3', padding: '1px 4px' }}>gh auth token</code>
                </p>
              )}
              <input
                type="password"
                value={cfg.apiKey}
                onChange={e => setCfg(c => ({ ...c, apiKey: e.target.value }))}
                placeholder={p === 'anthropic' ? 'sk-ant-...' : p === 'copilot' ? 'ghu_...' : 'sk-...'}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #aab7b8', borderRadius: 4, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Model selector */}
          {p !== 'ollama' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#545b64', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Model
              </label>
              <div style={{ position: 'relative' }}>
                <select value={cfg.model} onChange={e => setCfg(c => ({ ...c, model: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #aab7b8', borderRadius: 4, fontSize: 13, appearance: 'none', background: '#fff', cursor: 'pointer' }}>
                  {defaults.models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#545b64' }} />
              </div>
            </div>
          )}

          {/* Ollama settings */}
          {p === 'ollama' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#545b64', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Ollama URL
                </label>
                <input
                  value={cfg.ollamaUrl}
                  onChange={e => setCfg(c => ({ ...c, ollamaUrl: e.target.value }))}
                  placeholder="http://localhost:11434"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #aab7b8', borderRadius: 4, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#545b64', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Model Name
                </label>
                <div style={{ position: 'relative' }}>
                  <select value={cfg.ollamaModel} onChange={e => setCfg(c => ({ ...c, ollamaModel: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #aab7b8', borderRadius: 4, fontSize: 13, appearance: 'none', background: '#fff', cursor: 'pointer' }}>
                    {PROVIDER_DEFAULTS.ollama.models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#545b64' }} />
                </div>
                <p style={{ fontSize: 11, color: '#545b64', marginTop: 6 }}>
                  Make sure Ollama is running: <code style={{ fontSize: 11 }}>ollama serve</code>
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #aab7b8', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
            <button onClick={save}
              style={{ padding: '8px 20px', border: 'none', borderRadius: 4, background: saved ? '#1d8348' : '#0073bb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              {saved ? '✓ Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tool result bubble ───────────────────────────────────────────────────────
function ToolBubble({ msg }: { msg: Message }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '6px 0' }}>
      <div style={{
        padding: '8px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace',
        background: msg.toolStatus === 'error' ? '#fef9f9' : '#f0f9f0',
        border: `1px solid ${msg.toolStatus === 'error' ? '#ffd0d0' : '#c3e6c3'}`,
        color: msg.toolStatus === 'error' ? '#c0392b' : '#1d6a2b',
        flex: 1, wordBreak: 'break-word',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {msg.toolStatus === 'running' && <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} />}
          {msg.toolStatus === 'ok' && <CheckCircle size={11} />}
          {msg.toolStatus === 'error' && <AlertCircle size={11} />}
          <span style={{ fontWeight: 700, fontSize: 11 }}>⚡ {msg.toolName}</span>
        </div>
        {msg.text}
      </div>
    </div>
  )
}

// ── Main AI Panel ────────────────────────────────────────────────────────────
export default function AIPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(), role: 'assistant',
      text: 'Hi! I\'m your AWS AI Agent. I can create and manage resources on Floci for you.\n\nTry: "Create an S3 bucket called my-data" or "List all DynamoDB tables"',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function addMessage(msg: Omit<Message, 'id'>) {
    const m = { ...msg, id: uid() }
    setMessages(prev => [...prev, m])
    return m.id
  }

  function updateMessage(id: string, patch: Partial<Message>) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    addMessage({ role: 'user', text })
    setLoading(true)

    const history: ChatMessage[] = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }))
    history.push({ role: 'user', content: text })

    try {
      const cfg = loadConfig()
      const response = await callAI(cfg, history, SYSTEM_PROMPT)

      // Check if the response contains a tool action
      const action = parseAction(response)
      if (action) {
        const tool = TOOL_MAP[action.action]
        if (tool) {
          // Show AI message (strip the JSON block for cleaner display)
          const cleanText = response.replace(/```json[\s\S]*?```/g, '').trim()
          if (cleanText) addMessage({ role: 'assistant', text: cleanText })

          // Show tool running indicator
          const toolId = addMessage({ role: 'tool', text: `Running ${tool.name}...`, toolName: action.action, toolStatus: 'running' })

          try {
            const result = await tool.execute(action.params ?? {})
            updateMessage(toolId, { text: result, toolStatus: 'ok' })
          } catch (err) {
            updateMessage(toolId, { text: String(err), toolStatus: 'error' })
          }
        } else {
          addMessage({ role: 'assistant', text: response })
        }
      } else {
        addMessage({ role: 'assistant', text: response })
      }
    } catch (err) {
      addMessage({ role: 'assistant', text: `Error: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} />}

      <div style={{
        width: 380, flexShrink: 0, background: '#fff',
        borderLeft: '1px solid #e9ebed', display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 84px)', position: 'sticky', top: 84, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#232f3e', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Bot size={16} color="#ff9900" />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, flex: 1 }}>AI Agent</span>
          <span style={{ fontSize: 10, color: '#aab7b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {PROVIDER_DEFAULTS[loadConfig().provider]?.label}
          </span>
          <button onClick={() => setShowConfig(true)} title="Configure AI"
            style={{ background: 'none', border: 'none', color: '#aab7b8', cursor: 'pointer', padding: 4 }}>
            <Settings size={14} />
          </button>
          <button onClick={onClose} title="Close"
            style={{ background: 'none', border: 'none', color: '#aab7b8', cursor: 'pointer', padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {messages.map(msg => (
            <div key={msg.id}>
              {msg.role === 'tool' ? (
                <ToolBubble msg={msg} />
              ) : (
                <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', margin: '4px 0' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#232f3e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
                      <Bot size={12} color="#ff9900" />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '80%', padding: '8px 12px', borderRadius: 12,
                    background: msg.role === 'user' ? '#0073bb' : '#f2f3f3',
                    color: msg.role === 'user' ? '#fff' : '#16191f',
                    fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    borderBottomRightRadius: msg.role === 'user' ? 2 : 12,
                    borderBottomLeftRadius: msg.role === 'assistant' ? 2 : 12,
                  }}>
                    {msg.text}
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#232f3e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={12} color="#ff9900" />
              </div>
              <div style={{ background: '#f2f3f3', borderRadius: 12, padding: '10px 14px', display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#aab7b8', display: 'inline-block', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts */}
        {messages.length === 1 && (
          <div style={{ padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              'Create S3 bucket my-data',
              'Create DynamoDB table users',
              'Create SQS queue orders',
              'List all buckets',
            ].map(p => (
              <button key={p} onClick={() => { setInput(p); inputRef.current?.focus() }}
                style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #0073bb', borderRadius: 12, background: '#fff', color: '#0073bb', cursor: 'pointer' }}>
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e9ebed', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask me to create any AWS resource..."
              rows={1}
              style={{
                flex: 1, padding: '8px 12px', border: '1px solid #aab7b8', borderRadius: 8,
                fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit',
                lineHeight: 1.4, maxHeight: 100, overflowY: 'auto',
              }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 100) + 'px'
              }}
            />
            <button onClick={send} disabled={loading || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none', flexShrink: 0,
                background: loading || !input.trim() ? '#e9ebed' : '#0073bb',
                color: loading || !input.trim() ? '#aab7b8' : '#fff',
                cursor: loading || !input.trim() ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <Send size={14} />
            </button>
          </div>
          <p style={{ fontSize: 10, color: '#aab7b8', marginTop: 6, textAlign: 'center' }}>
            Enter to send · Shift+Enter for newline
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
