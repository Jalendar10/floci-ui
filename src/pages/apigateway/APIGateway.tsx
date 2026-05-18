import { useEffect, useState } from 'react'
import { GetApisCommand, CreateApiCommand, DeleteApiCommand, GetRoutesCommand } from '@aws-sdk/client-apigatewayv2'
import { apigwClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw } from 'lucide-react'

const NAV = [{ label: 'APIs', path: '/apigateway' }]

export default function APIGatewayPage() {
  const [apis, setApis] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [routes, setRoutes] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', proto: 'HTTP', corsEnabled: false })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await apigwClient.send(new GetApisCommand({}))
      setApis(r.Items ?? [])
    } catch { setApis([]) } finally { setLoading(false) }
  }

  const loadRoutes = async (id: string) => {
    const r = await apigwClient.send(new GetRoutesCommand({ ApiId: id }))
    setRoutes(r.Items ?? [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadRoutes(selected.ApiId) }, [selected])

  const create = async () => {
    await apigwClient.send(new CreateApiCommand({
      Name: form.name.trim(), ProtocolType: form.proto as any,
      CorsConfiguration: form.corsEnabled ? { AllowOrigins: ['*'], AllowMethods: ['*'] } : undefined,
    }))
    toast(`API "${form.name}" created`)
    setShowCreate(false); setForm({ name: '', proto: 'HTTP', corsEnabled: false }); load()
  }

  const del = async (id: string) => {
    await apigwClient.send(new DeleteApiCommand({ ApiId: id }))
    toast('API deleted')
    if (selected?.ApiId === id) setSelected(null)
    load()
  }

  return (
    <ServiceLayout serviceName="API Gateway" navItems={NAV}>
      {showCreate && (
        <Modal title="Create API" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create API">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Protocol type</label>
              <div style={{ display: 'flex', gap: 16 }}>
                {['HTTP', 'WEBSOCKET'].map(p => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="proto" checked={form.proto === p} onChange={() => setForm(f => ({ ...f, proto: p }))} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>API name</label>
              <input autoFocus className="aws-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="my-api" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.corsEnabled} onChange={e => setForm(f => ({ ...f, corsEnabled: e.target.checked }))} />
              Enable CORS (allow all origins)
            </label>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">API Gateway</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create API</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div className="aws-card">
          <table className="aws-table">
            <thead><tr><th>API name</th><th>API ID</th><th>Protocol</th><th>Endpoint</th><th /></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : apis.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No APIs found</td></tr>
              ) : apis.map(api => (
                <tr key={api.ApiId} className={selected?.ApiId === api.ApiId ? 'selected' : ''}>
                  <td><button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => setSelected(api)}>{api.Name}</button></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{api.ApiId}</td>
                  <td><span className="badge badge-outline-blue">{api.ProtocolType}</span></td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#545b64' }}>{api.ApiEndpoint ?? '-'}</td>
                  <td><button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => del(api.ApiId)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="aws-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed' }}>
              <p className="section-title">{selected.Name} — Routes ({routes.length})</p>
              <p style={{ fontSize: 11, color: '#545b64' }}>{selected.ApiEndpoint}</p>
            </div>
            <table className="aws-table">
              <thead><tr><th>Route key</th><th>Target</th><th>Authorization</th></tr></thead>
              <tbody>
                {routes.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#545b64' }}>No routes. Add routes via AWS CLI.</td></tr>
                ) : routes.map(r => (
                  <tr key={r.RouteId}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.RouteKey}</td>
                    <td style={{ fontSize: 12 }}>{r.Target ?? '-'}</td>
                    <td style={{ fontSize: 12 }}>{r.AuthorizationType ?? 'NONE'}</td>
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
