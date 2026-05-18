import { useEffect, useState } from 'react'
import { ListStateMachinesCommand, CreateStateMachineCommand, DeleteStateMachineCommand, ListExecutionsCommand, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { sfnClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw, Play } from 'lucide-react'

const NAV = [{ label: 'State machines', path: '/sfn' }]

const DEFAULT_DEF = `{
  "Comment": "A simple state machine",
  "StartAt": "HelloWorld",
  "States": {
    "HelloWorld": {
      "Type": "Pass",
      "Result": "Hello from Floci!",
      "End": true
    }
  }
}`

export default function StepFunctionsPage() {
  const [machines, setMachines] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [executions, setExecutions] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showRun, setShowRun] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', type: 'STANDARD', def: DEFAULT_DEF })
  const [input, setInput] = useState('{}')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await sfnClient.send(new ListStateMachinesCommand({}))
      setMachines(r.stateMachines ?? [])
    } catch { setMachines([]) } finally { setLoading(false) }
  }

  const loadExecs = async (arn: string) => {
    const r = await sfnClient.send(new ListExecutionsCommand({ stateMachineArn: arn }))
    setExecutions(r.executions ?? [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadExecs(selected) }, [selected])

  const create = async () => {
    try { JSON.parse(form.def) } catch { toast('Invalid JSON definition', 'error'); return }
    await sfnClient.send(new CreateStateMachineCommand({
      name: form.name.trim(), type: form.type as any, definition: form.def,
      roleArn: 'arn:aws:iam::000000000000:role/StepFunctionsRole',
    }))
    toast(`State machine "${form.name}" created`)
    setShowCreate(false); setForm({ name: '', type: 'STANDARD', def: DEFAULT_DEF }); load()
  }

  const del = async (arn: string) => {
    await sfnClient.send(new DeleteStateMachineCommand({ stateMachineArn: arn }))
    toast('State machine deleted')
    if (selected === arn) setSelected(null)
    load()
  }

  const run = async () => {
    if (!showRun) return
    await sfnClient.send(new StartExecutionCommand({ stateMachineArn: showRun, input }))
    toast('Execution started')
    setShowRun(null); setInput('{}')
    if (selected === showRun) loadExecs(showRun)
  }

  const machineName = (arn: string) => arn.split(':').pop()!
  const STATE_COLOR: Record<string, string> = { RUNNING: 'badge-outline-blue', SUCCEEDED: 'badge-outline-green', FAILED: 'badge-outline-red', TIMED_OUT: 'badge-outline-red', ABORTED: 'badge-outline-gray' }

  return (
    <ServiceLayout serviceName="AWS Step Functions" navItems={NAV}>
      {showCreate && (
        <Modal title="Create state machine" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create state machine" wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>State machine name</label>
                <input autoFocus className="aws-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Type</label>
                <select className="aws-select" style={{ width: '100%' }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="STANDARD">Standard</option>
                  <option value="EXPRESS">Express</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Definition (Amazon States Language)</label>
              <textarea className="aws-input" value={form.def} onChange={e => setForm(f => ({ ...f, def: e.target.value }))}
                style={{ height: 200, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}
      {showRun && (
        <Modal title={`Start execution — ${machineName(showRun)}`} onClose={() => setShowRun(null)} onConfirm={run} confirmLabel="Start execution">
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Input (JSON)</label>
            <textarea autoFocus className="aws-input" value={input} onChange={e => setInput(e.target.value)}
              style={{ height: 120, fontFamily: 'monospace', fontSize: 12 }} />
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">Step Functions — State Machines</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create state machine</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div className="aws-card">
          <table className="aws-table">
            <thead><tr><th>Name</th><th>Type</th><th>Status</th><th /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                : machines.length === 0 ? <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No state machines</td></tr>
                : machines.map(m => (
                  <tr key={m.stateMachineArn} className={selected === m.stateMachineArn ? 'selected' : ''}>
                    <td><button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => setSelected(m.stateMachineArn)}>{m.name}</button></td>
                    <td><span className="badge badge-outline-gray">{m.type}</span></td>
                    <td><span className="badge badge-outline-green">● Active</span></td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-aws-link" onClick={() => setShowRun(m.stateMachineArn)}><Play size={12} /> Run</button>
                      <button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => del(m.stateMachineArn)}>Delete</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="aws-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed' }}>
              <p className="section-title">Executions</p>
            </div>
            <table className="aws-table">
              <thead><tr><th>Name</th><th>Status</th><th>Started</th></tr></thead>
              <tbody>
                {executions.length === 0 ? <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#545b64' }}>No executions yet</td></tr>
                  : executions.map(e => (
                    <tr key={e.executionArn}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{e.name}</td>
                      <td><span className={`badge ${STATE_COLOR[e.status] ?? 'badge-outline-gray'}`}>● {e.status}</span></td>
                      <td style={{ fontSize: 12, color: '#545b64' }}>{e.startDate?.toLocaleString()}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ServiceLayout>
  )
}
