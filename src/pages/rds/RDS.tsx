import { useEffect, useState } from 'react'
import { DescribeDBInstancesCommand, CreateDBInstanceCommand, DeleteDBInstanceCommand } from '@aws-sdk/client-rds'
import { rdsClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw, Database } from 'lucide-react'

const NAV = [{ label: 'Databases', path: '/rds' }]

const ENGINES = ['mysql', 'postgres', 'mariadb']

export default function RDSPage() {
  const [dbs, setDbs] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ id: '', engine: 'postgres', version: '14', cls: 'db.t3.micro', user: 'admin', pass: 'password123', name: 'mydb', storage: '20' })
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await rdsClient.send(new DescribeDBInstancesCommand({}))
      setDbs(r.DBInstances ?? [])
    } catch { setDbs([]) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    await rdsClient.send(new CreateDBInstanceCommand({
      DBInstanceIdentifier: form.id, Engine: form.engine, EngineVersion: form.version,
      DBInstanceClass: form.cls, MasterUsername: form.user, MasterUserPassword: form.pass,
      DBName: form.name, AllocatedStorage: +form.storage,
    }))
    toast(`DB instance "${form.id}" is being created`)
    setShowCreate(false); load()
  }

  const del = async (id: string) => {
    await rdsClient.send(new DeleteDBInstanceCommand({ DBInstanceIdentifier: id, SkipFinalSnapshot: true }))
    toast(`DB instance "${id}" deletion initiated`); load()
  }

  const STATE_COLOR: Record<string, string> = { available: 'badge-outline-green', creating: 'badge-outline-gray', deleting: 'badge-outline-red', stopped: 'badge-outline-red' }

  return (
    <ServiceLayout serviceName="Amazon RDS" navItems={NAV}>
      {showCreate && (
        <Modal title="Create database" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create database" wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['DB instance identifier', 'id', 'my-database'],
              ['Master username', 'user', 'admin'],
              ['Master password', 'pass', ''],
              ['Initial database name', 'name', 'mydb'],
              ['Allocated storage (GB)', 'storage', '20'],
            ].map(([label, key, ph]) => (
              <div key={key}>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>{label}</label>
                <input className="aws-input" type={key === 'pass' ? 'password' : 'text'}
                  value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Engine</label>
              <select className="aws-select" style={{ width: '100%' }} value={form.engine} onChange={e => setForm(f => ({ ...f, engine: e.target.value }))}>
                {ENGINES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>DB instance class</label>
              <select className="aws-select" style={{ width: '100%' }} value={form.cls} onChange={e => setForm(f => ({ ...f, cls: e.target.value }))}>
                {['db.t3.micro', 'db.t3.small', 'db.t3.medium', 'db.m5.large'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">RDS Databases</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create database</button>
        </div>
      </div>

      <div className="aws-card">
        <table className="aws-table">
          <thead>
            <tr><th>DB identifier</th><th>Status</th><th>Engine</th><th>Size</th><th>Endpoint</th><th>Port</th><th /></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
            ) : dbs.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
                <Database size={28} style={{ margin: '0 auto 8px', display: 'block', color: '#aab7b8' }} />
                No databases. Create your first database instance.
              </td></tr>
            ) : dbs.map(db => (
              <tr key={db.DBInstanceIdentifier}>
                <td><button className="btn-aws-link" style={{ fontWeight: 700 }}>{db.DBInstanceIdentifier}</button></td>
                <td><span className={`badge ${STATE_COLOR[db.DBInstanceStatus] ?? 'badge-outline-gray'}`}>● {db.DBInstanceStatus}</span></td>
                <td style={{ fontSize: 12 }}>{db.Engine} {db.EngineVersion}</td>
                <td style={{ fontSize: 12 }}>{db.DBInstanceClass}</td>
                <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{db.Endpoint?.Address ?? '-'}</td>
                <td style={{ fontSize: 12 }}>{db.Endpoint?.Port ?? '-'}</td>
                <td><button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => del(db.DBInstanceIdentifier!)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ServiceLayout>
  )
}
