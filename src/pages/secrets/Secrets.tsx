import { useEffect, useState } from 'react'
import { ListSecretsCommand, CreateSecretCommand, DeleteSecretCommand, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { secretsClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw, Eye, EyeOff } from 'lucide-react'

const NAV = [{ label: 'Secrets', path: '/secrets' }]

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<any[]>([])
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', desc: '', value: '' })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await secretsClient.send(new ListSecretsCommand({}))
      setSecrets(r.SecretList ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    await secretsClient.send(new CreateSecretCommand({ Name: form.name.trim(), Description: form.desc, SecretString: form.value }))
    toast(`Secret "${form.name}" created`)
    setShowCreate(false); setForm({ name: '', desc: '', value: '' }); load()
  }

  const del = async (name: string) => {
    await secretsClient.send(new DeleteSecretCommand({ SecretId: name, ForceDeleteWithoutRecovery: true }))
    toast(`Secret "${name}" deleted`); load()
  }

  const reveal = async (name: string) => {
    if (revealed[name]) { setVisible(v => ({ ...v, [name]: !v[name] })); return }
    const r = await secretsClient.send(new GetSecretValueCommand({ SecretId: name }))
    setRevealed(rv => ({ ...rv, [name]: r.SecretString ?? '(binary secret)' }))
    setVisible(v => ({ ...v, [name]: true }))
  }

  return (
    <ServiceLayout serviceName="Secrets Manager" navItems={NAV}>
      {showCreate && (
        <Modal title="Store a new secret" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Store secret">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Secret name</label>
              <input autoFocus className="aws-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="prod/myapp/database" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Description <span style={{ fontWeight: 400, color: '#545b64' }}>(optional)</span></label>
              <input className="aws-input" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Secret value</label>
              <textarea className="aws-input" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                style={{ height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                placeholder='{"username": "admin", "password": "secret"}' />
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">Secrets Manager</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Store a new secret</button>
        </div>
      </div>

      <div className="aws-card">
        <table className="aws-table">
          <thead>
            <tr><th>Secret name</th><th>Description</th><th>Last retrieved</th><th>ARN</th><th /></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
            ) : secrets.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No secrets stored</td></tr>
            ) : secrets.map(s => (
              <>
                <tr key={s.Name}>
                  <td><button className="btn-aws-link" style={{ fontWeight: 700 }}>{s.Name}</button></td>
                  <td style={{ fontSize: 12, color: '#545b64' }}>{s.Description ?? '-'}</td>
                  <td style={{ fontSize: 12, color: '#545b64' }}>{s.LastAccessedDate?.toLocaleDateString() ?? 'Never'}</td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#aab7b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.ARN}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-aws-link" onClick={() => reveal(s.Name)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {visible[s.Name] ? <EyeOff size={12} /> : <Eye size={12} />}
                      {visible[s.Name] ? 'Hide' : 'Retrieve'}
                    </button>
                    <button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => del(s.Name)}>Delete</button>
                  </td>
                </tr>
                {visible[s.Name] && revealed[s.Name] && (
                  <tr>
                    <td colSpan={5} style={{ background: '#f8f9fa', padding: '8px 12px' }}>
                      <pre style={{ fontFamily: 'monospace', fontSize: 12, margin: 0, color: '#16191f' }}>
                        {(() => { try { return JSON.stringify(JSON.parse(revealed[s.Name]), null, 2) } catch { return revealed[s.Name] } })()}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </ServiceLayout>
  )
}
