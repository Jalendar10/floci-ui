import { useEffect, useState } from 'react'
import {
  ListClustersCommand, CreateClusterCommand, DeleteClusterCommand,
  ListServicesCommand, ListTasksCommand, DescribeClustersCommand,
} from '@aws-sdk/client-ecs'
import { ecsClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw, Layers } from 'lucide-react'

const NAV = [{ label: 'Clusters', path: '/ecs' }]

export default function ECSPage() {
  const [clusters, setClusters] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [services, setServices] = useState<string[]>([])
  const [tasks, setTasks] = useState<string[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const arns = await ecsClient.send(new ListClustersCommand({}))
      if (arns.clusterArns?.length) {
        const desc = await ecsClient.send(new DescribeClustersCommand({ clusters: arns.clusterArns }))
        setClusters(desc.clusters ?? [])
      } else { setClusters([]) }
    } catch { setClusters([]) } finally { setLoading(false) }
  }

  const loadCluster = async (arn: string) => {
    const [s, t] = await Promise.allSettled([
      ecsClient.send(new ListServicesCommand({ cluster: arn })),
      ecsClient.send(new ListTasksCommand({ cluster: arn })),
    ])
    setServices(s.status === 'fulfilled' ? s.value.serviceArns ?? [] : [])
    setTasks(t.status === 'fulfilled' ? t.value.taskArns ?? [] : [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadCluster(selected) }, [selected])

  const create = async () => {
    await ecsClient.send(new CreateClusterCommand({ clusterName: newName.trim() }))
    toast(`Cluster "${newName}" created`)
    setShowCreate(false); setNewName(''); load()
  }

  const del = async (arn: string) => {
    await ecsClient.send(new DeleteClusterCommand({ cluster: arn }))
    toast('Cluster deleted')
    if (selected === arn) setSelected(null)
    load()
  }

  const clusterName = (arn: string) => arn.split('/').pop()!
  const shortArn = (arn: string) => `...${arn.split(':').pop()}`

  return (
    <ServiceLayout serviceName="Amazon ECS" navItems={NAV}>
      {showCreate && (
        <Modal title="Create cluster" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create cluster">
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Cluster name</label>
            <input autoFocus className="aws-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="my-cluster" />
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">ECS Clusters</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create cluster</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div className="aws-card">
          <table className="aws-table">
            <thead><tr><th>Cluster name</th><th>Status</th><th>Services</th><th>Tasks</th><th /></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : clusters.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
                  <Layers size={28} style={{ margin: '0 auto 8px', display: 'block', color: '#aab7b8' }} />
                  No clusters. Create your first ECS cluster.
                </td></tr>
              ) : clusters.map(c => (
                <tr key={c.clusterArn} className={selected === c.clusterArn ? 'selected' : ''}>
                  <td><button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => setSelected(c.clusterArn)}>{c.clusterName}</button></td>
                  <td><span className={`badge ${c.status === 'ACTIVE' ? 'badge-outline-green' : 'badge-outline-gray'}`}>● {c.status}</span></td>
                  <td style={{ fontSize: 12 }}>{c.activeServicesCount ?? 0}</td>
                  <td style={{ fontSize: 12 }}>{c.runningTasksCount ?? 0} running</td>
                  <td><button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => del(c.clusterArn)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="aws-card">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed' }}>
                <p className="section-title">Services ({services.length})</p>
              </div>
              <div style={{ padding: 12 }}>
                {services.length === 0 ? <p style={{ color: '#545b64', fontSize: 13 }}>No services running</p>
                  : services.map(s => <p key={s} style={{ fontSize: 13, padding: '4px 0', fontFamily: 'monospace' }}>{clusterName(s)}</p>)}
              </div>
            </div>
            <div className="aws-card">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed' }}>
                <p className="section-title">Tasks ({tasks.length})</p>
              </div>
              <div style={{ padding: 12 }}>
                {tasks.length === 0 ? <p style={{ color: '#545b64', fontSize: 13 }}>No tasks running</p>
                  : tasks.map(t => <p key={t} style={{ fontSize: 12, padding: '3px 0', fontFamily: 'monospace', color: '#545b64' }}>{shortArn(t)}</p>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </ServiceLayout>
  )
}
