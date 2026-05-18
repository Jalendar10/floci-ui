import { useEffect, useState } from 'react'
import { ListKeysCommand, DescribeKeyCommand, CreateKeyCommand, ScheduleKeyDeletionCommand, EnableKeyCommand, DisableKeyCommand } from '@aws-sdk/client-kms'
import { kmsClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw } from 'lucide-react'

const NAV = [{ label: 'Customer managed keys', path: '/kms' }]

export default function KMSPage() {
  const [keys, setKeys] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ desc: '', usage: 'ENCRYPT_DECRYPT', spec: 'SYMMETRIC_DEFAULT' })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await kmsClient.send(new ListKeysCommand({}))
      const descs = await Promise.allSettled((r.Keys ?? []).map(k => kmsClient.send(new DescribeKeyCommand({ KeyId: k.KeyId! }))))
      setKeys(descs.filter(d => d.status === 'fulfilled').map((d: any) => d.value.KeyMetadata))
    } catch { setKeys([]) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    await kmsClient.send(new CreateKeyCommand({ Description: form.desc, KeyUsage: form.usage as any, KeySpec: form.spec as any }))
    toast('KMS key created')
    setShowCreate(false); setForm({ desc: '', usage: 'ENCRYPT_DECRYPT', spec: 'SYMMETRIC_DEFAULT' }); load()
  }

  const schedule = async (id: string) => {
    await kmsClient.send(new ScheduleKeyDeletionCommand({ KeyId: id, PendingWindowInDays: 7 }))
    toast('Key scheduled for deletion in 7 days'); load()
  }

  const toggle = async (id: string, enabled: boolean) => {
    if (enabled) await kmsClient.send(new DisableKeyCommand({ KeyId: id }))
    else await kmsClient.send(new EnableKeyCommand({ KeyId: id }))
    toast(`Key ${enabled ? 'disabled' : 'enabled'}`); load()
  }

  return (
    <ServiceLayout serviceName="AWS KMS" navItems={NAV}>
      {showCreate && (
        <Modal title="Create key" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create key">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Key type</label>
              <select className="aws-select" style={{ width: '100%' }} value={form.spec} onChange={e => setForm(f => ({ ...f, spec: e.target.value }))}>
                <option value="SYMMETRIC_DEFAULT">Symmetric (AES-256-GCM)</option>
                <option value="RSA_2048">Asymmetric RSA 2048</option>
                <option value="RSA_4096">Asymmetric RSA 4096</option>
                <option value="ECC_NIST_P256">Asymmetric ECC P-256</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Key usage</label>
              <select className="aws-select" style={{ width: '100%' }} value={form.usage} onChange={e => setForm(f => ({ ...f, usage: e.target.value }))}>
                <option value="ENCRYPT_DECRYPT">Encrypt and decrypt</option>
                <option value="SIGN_VERIFY">Sign and verify</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Description <span style={{ fontWeight: 400, color: '#545b64' }}>(optional)</span></label>
              <input autoFocus className="aws-input" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">Key Management Service</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create key</button>
        </div>
      </div>

      <div className="aws-card">
        <table className="aws-table">
          <thead>
            <tr><th>Alias / Key ID</th><th>Status</th><th>Key type</th><th>Key usage</th><th>Key spec</th><th>Created</th><th /></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
            ) : keys.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No customer managed keys</td></tr>
            ) : keys.map(k => (
              <tr key={k.KeyId}>
                <td>
                  <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#0073bb' }}>{k.KeyId}</p>
                  {k.Description && <p style={{ fontSize: 11, color: '#545b64' }}>{k.Description}</p>}
                </td>
                <td><span className={`badge ${k.Enabled ? 'badge-outline-green' : 'badge-outline-red'}`}>● {k.Enabled ? 'Enabled' : 'Disabled'}</span></td>
                <td style={{ fontSize: 12 }}>{k.KeyManager === 'AWS' ? 'AWS managed' : 'Customer managed'}</td>
                <td style={{ fontSize: 12 }}>{k.KeyUsage}</td>
                <td style={{ fontSize: 12 }}>{k.KeySpec}</td>
                <td style={{ fontSize: 12, color: '#545b64' }}>{k.CreationDate?.toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-aws-link" onClick={() => toggle(k.KeyId, k.Enabled)}>{k.Enabled ? 'Disable' : 'Enable'}</button>
                  <button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => schedule(k.KeyId)}>Schedule deletion</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ServiceLayout>
  )
}
