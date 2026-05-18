import { useEffect, useState } from 'react'
import { ListEventBusesCommand, CreateEventBusCommand, DeleteEventBusCommand, ListRulesCommand } from '@aws-sdk/client-eventbridge'
import { ebClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw } from 'lucide-react'

const NAV = [{ label: 'Event buses', path: '/eventbridge' }, { label: 'Rules', path: '/eventbridge' }]

export default function EventBridgePage() {
  const [buses, setBuses] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [tab, setTab] = useState('buses')
  const [showCreate, setShowCreate] = useState(false)
  const [busName, setBusName] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [b, r] = await Promise.allSettled([
        ebClient.send(new ListEventBusesCommand({})),
        ebClient.send(new ListRulesCommand({})),
      ])
      if (b.status === 'fulfilled') setBuses(b.value.EventBuses ?? [])
      if (r.status === 'fulfilled') setRules(r.value.Rules ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createBus = async () => {
    await ebClient.send(new CreateEventBusCommand({ Name: busName.trim() }))
    toast(`Event bus "${busName}" created`)
    setShowCreate(false); setBusName(''); load()
  }

  const deleteBus = async (name: string) => {
    await ebClient.send(new DeleteEventBusCommand({ Name: name }))
    toast('Event bus deleted'); load()
  }

  return (
    <ServiceLayout serviceName="Amazon EventBridge" navItems={NAV}>
      {showCreate && (
        <Modal title="Create event bus" onClose={() => setShowCreate(false)} onConfirm={createBus} confirmLabel="Create event bus">
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Event bus name</label>
            <input autoFocus className="aws-input" value={busName} onChange={e => setBusName(e.target.value)} placeholder="my-event-bus" />
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">Amazon EventBridge</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create event bus</button>
        </div>
      </div>

      <div className="aws-tabs">
        {['buses', 'rules'].map(t => (
          <button key={t} className={`aws-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'buses' ? `Event buses (${buses.length})` : `Rules (${rules.length})`}
          </button>
        ))}
      </div>

      {tab === 'buses' && (
        <div className="aws-card">
          <table className="aws-table">
            <thead><tr><th>Name</th><th>ARN</th><th /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                : buses.length === 0 ? <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#545b64' }}>No event buses</td></tr>
                : buses.map(b => (
                  <tr key={b.Name}>
                    <td style={{ fontWeight: 600 }}>{b.Name} {b.Name === 'default' && <span className="badge badge-outline-blue" style={{ marginLeft: 8 }}>default</span>}</td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#545b64' }}>{b.Arn}</td>
                    <td>{b.Name !== 'default' && <button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => deleteBus(b.Name!)}>Delete</button>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'rules' && (
        <div className="aws-card">
          <table className="aws-table">
            <thead><tr><th>Rule name</th><th>Event bus</th><th>State</th><th>Schedule / Pattern</th></tr></thead>
            <tbody>
              {rules.length === 0 ? <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#545b64' }}>No rules. Create rules via AWS CLI.</td></tr>
                : rules.map(r => (
                  <tr key={r.Name}>
                    <td style={{ fontWeight: 600 }}>{r.Name}</td>
                    <td style={{ fontSize: 12 }}>{r.EventBusName ?? 'default'}</td>
                    <td><span className={`badge ${r.State === 'ENABLED' ? 'badge-outline-green' : 'badge-outline-gray'}`}>● {r.State}</span></td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.ScheduleExpression ?? r.EventPattern?.slice(0, 40) ?? '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </ServiceLayout>
  )
}
