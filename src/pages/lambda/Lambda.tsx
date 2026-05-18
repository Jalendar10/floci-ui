import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import {
  ListFunctionsCommand, DeleteFunctionCommand, InvokeCommand,
  GetFunctionCommand,
} from '@aws-sdk/client-lambda'
import { lambdaClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import { useToast } from '../../components/Toast'
import { Search, RefreshCw, Play, Zap } from 'lucide-react'

const NAV = [
  { label: 'Functions', path: '/lambda' },
]

function FunctionList() {
  const [fns, setFns] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const r = await lambdaClient.send(new ListFunctionsCommand({}))
      setFns(r.Functions ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const deleteSelected = async () => {
    for (const name of selected) await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: name }))
    toast(`${selected.size} function(s) deleted`)
    setSelected(new Set()); load()
  }

  const fmtMemory = (m: number) => m >= 1024 ? `${m / 1024} GB` : `${m} MB`
  const filtered = fns.filter(f => f.FunctionName?.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">Lambda Functions</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {selected.size > 0 && <button className="btn-aws-danger" onClick={deleteSelected}>Delete ({selected.size})</button>}
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
        </div>
      </div>

      <div className="aws-card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="search-box" style={{ width: 360 }}>
            <Search size={13} color="#545b64" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter functions by name or runtime" />
          </div>
          <p style={{ fontSize: 12, color: '#545b64' }}>{filtered.length} function{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <table className="aws-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}><input type="checkbox" className="aws-checkbox" onChange={e => setSelected(e.target.checked ? new Set(fns.map(f => f.FunctionName!)) : new Set())} /></th>
              <th>Function name</th>
              <th>Runtime</th>
              <th>Memory</th>
              <th>Timeout</th>
              <th>Last modified</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
                <Zap size={32} style={{ margin: '0 auto 8px', display: 'block', color: '#aab7b8' }} />
                No Lambda functions found. Deploy functions using the AWS CLI or SDK.
              </td></tr>
            ) : filtered.map(f => (
              <tr key={f.FunctionName} className={selected.has(f.FunctionName!) ? 'selected' : ''}>
                <td><input type="checkbox" className="aws-checkbox" checked={selected.has(f.FunctionName!)}
                  onChange={e => { const s = new Set(selected); e.target.checked ? s.add(f.FunctionName!) : s.delete(f.FunctionName!); setSelected(s) }} /></td>
                <td><button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => navigate(`/lambda/${f.FunctionName}`)}>{f.FunctionName}</button></td>
                <td><span className="badge badge-outline-gray">{f.Runtime}</span></td>
                <td style={{ fontSize: 12 }}>{fmtMemory(f.MemorySize ?? 128)}</td>
                <td style={{ fontSize: 12 }}>{f.Timeout}s</td>
                <td style={{ fontSize: 12, color: '#545b64' }}>{f.LastModified?.split('T')[0]}</td>
                <td>
                  <button className="btn-aws-link" onClick={() => navigate(`/lambda/${f.FunctionName}`)}>Test</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function FunctionDetail() {
  const name = window.location.pathname.split('/lambda/')[1]?.split('/')[0]
  const [fn, setFn] = useState<any>(null)
  const [tab, setTab] = useState('test')
  const [payload, setPayload] = useState('{\n  "key": "value"\n}')
  const [result, setResult] = useState<string | null>(null)
  const [invoking, setInvoking] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (!name) return
    lambdaClient.send(new GetFunctionCommand({ FunctionName: name })).then(r => setFn(r.Configuration))
  }, [name])

  const invoke = async () => {
    setInvoking(true); setResult(null)
    try {
      const r = await lambdaClient.send(new InvokeCommand({
        FunctionName: name!,
        Payload: new TextEncoder().encode(payload),
      }))
      const out = r.Payload ? new TextDecoder().decode(r.Payload) : '(empty response)'
      try { setResult(JSON.stringify(JSON.parse(out), null, 2)) } catch { setResult(out) }
      toast(`Function invoked — status: ${r.StatusCode}`)
    } catch (e: any) {
      setResult(`Error: ${e.message}`)
      toast(e.message, 'error')
    } finally { setInvoking(false) }
  }

  if (!fn) return <div style={{ padding: 24 }}><div className="spinner" /></div>

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button className="btn-aws-link" onClick={() => navigate('/lambda')}>Lambda</button>
        <span>›</span>
        <button className="btn-aws-link" onClick={() => navigate('/lambda')}>Functions</button>
        <span>›</span>
        <h1 className="page-title">{name}</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={() => navigate('/lambda')}>← Back</button>
        </div>
      </div>

      {/* Function info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          ['Runtime', fn.Runtime ?? '-'],
          ['Memory', `${fn.MemorySize ?? 128} MB`],
          ['Timeout', `${fn.Timeout ?? 3}s`],
          ['Handler', fn.Handler ?? '-'],
        ].map(([k, v]) => (
          <div key={k} className="aws-card" style={{ padding: 12 }}>
            <p style={{ fontSize: 11, color: '#545b64' }}>{k}</p>
            <p style={{ fontSize: 14, fontWeight: 700 }}>{v}</p>
          </div>
        ))}
      </div>

      <div className="aws-tabs">
        {['test', 'code', 'configuration', 'triggers', 'aliases'].map(t => (
          <button key={t} className={`aws-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'test' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="aws-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="section-title">Event JSON</p>
              <button className="btn-aws-primary" onClick={invoke} disabled={invoking}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={13} />{invoking ? 'Invoking…' : 'Test'}
              </button>
            </div>
            <div style={{ padding: 12 }}>
              <textarea value={payload} onChange={e => setPayload(e.target.value)}
                className="aws-input" style={{ height: 280, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
            </div>
          </div>
          <div className="aws-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed' }}>
              <p className="section-title">Execution result</p>
            </div>
            <div style={{ padding: 12 }}>
              {result ? (
                <pre className="code-block" style={{ height: 280, overflowY: 'auto' }}>{result}</pre>
              ) : (
                <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aab7b8', flexDirection: 'column', gap: 8, border: '1px dashed #e9ebed', borderRadius: 4 }}>
                  <Play size={24} color="#aab7b8" />
                  <p style={{ fontSize: 13 }}>Click Test to invoke the function</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'configuration' && (
        <div className="aws-card" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['Function ARN', fn.FunctionArn],
              ['Description', fn.Description || '-'],
              ['Package type', fn.PackageType],
              ['Architecture', fn.Architectures?.join(', ') ?? 'x86_64'],
              ['Code size', `${(fn.CodeSize / 1024).toFixed(1)} KB`],
              ['Last modified', fn.LastModified],
            ].map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: 12, color: '#545b64', marginBottom: 2 }}>{k}</p>
                <p style={{ fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>{v ?? '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab !== 'test' && tab !== 'configuration' && (
        <div className="aws-card" style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
          <p>This section is available in the full console</p>
        </div>
      )}
    </>
  )
}

export default function LambdaPage() {
  return (
    <ServiceLayout serviceName="AWS Lambda" navItems={NAV}>
      <Routes>
        <Route path="/" element={<FunctionList />} />
        <Route path="/:name/*" element={<FunctionDetail />} />
      </Routes>
    </ServiceLayout>
  )
}
