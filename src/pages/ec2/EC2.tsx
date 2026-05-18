import { useEffect, useState } from 'react'
import {
  DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand,
  TerminateInstancesCommand, DescribeSecurityGroupsCommand, CreateSecurityGroupCommand,
  DescribeKeyPairsCommand, CreateKeyPairCommand, DeleteKeyPairCommand,
} from '@aws-sdk/client-ec2'
import { ec2Client } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Search, RefreshCw, Server } from 'lucide-react'

const NAV = [
  { label: 'Instances', path: '/ec2' },
  { label: 'Security Groups', path: '/ec2/security-groups' },
  { label: 'Key Pairs', path: '/ec2/key-pairs' },
]

const STATE_BADGE: Record<string, string> = {
  running: 'badge-outline-green',
  stopped: 'badge-outline-red',
  pending: 'badge-outline-gray',
  terminated: 'badge badge-gray',
}

export default function EC2Page() {
  const [tab, setTab] = useState('instances')
  const [instances, setInstances] = useState<any[]>([])
  const [sgs, setSgs] = useState<any[]>([])
  const [keys, setKeys] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [showCreateSG, setShowCreateSG] = useState(false)
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [sgForm, setSgForm] = useState({ name: '', desc: '', vpcId: '' })
  const [keyName, setKeyName] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const loadInstances = async () => {
    setLoading(true)
    try {
      const r = await ec2Client.send(new DescribeInstancesCommand({}))
      const all = r.Reservations?.flatMap(res => res.Instances ?? []) ?? []
      setInstances(all)
    } finally { setLoading(false) }
  }

  const loadSGs = async () => {
    const r = await ec2Client.send(new DescribeSecurityGroupsCommand({}))
    setSgs(r.SecurityGroups ?? [])
  }

  const loadKeys = async () => {
    const r = await ec2Client.send(new DescribeKeyPairsCommand({}))
    setKeys(r.KeyPairs ?? [])
  }

  useEffect(() => {
    loadInstances(); loadSGs(); loadKeys()
  }, [])

  const getName = (inst: any) => inst.Tags?.find((t: any) => t.Key === 'Name')?.Value ?? inst.InstanceId

  const startInstances = async () => {
    const ids = Array.from(selected)
    await ec2Client.send(new StartInstancesCommand({ InstanceIds: ids }))
    toast(`Starting ${ids.length} instance(s)`)
    setSelected(new Set()); loadInstances()
  }

  const stopInstances = async () => {
    const ids = Array.from(selected)
    await ec2Client.send(new StopInstancesCommand({ InstanceIds: ids }))
    toast(`Stopping ${ids.length} instance(s)`)
    setSelected(new Set()); loadInstances()
  }

  const terminateInstances = async () => {
    const ids = Array.from(selected)
    await ec2Client.send(new TerminateInstancesCommand({ InstanceIds: ids }))
    toast(`Terminating ${ids.length} instance(s)`)
    setSelected(new Set()); loadInstances()
  }

  const createSG = async () => {
    await ec2Client.send(new CreateSecurityGroupCommand({
      GroupName: sgForm.name, Description: sgForm.desc || 'Created by Floci UI',
      VpcId: sgForm.vpcId || undefined,
    }))
    toast(`Security group "${sgForm.name}" created`)
    setShowCreateSG(false); setSgForm({ name: '', desc: '', vpcId: '' }); loadSGs()
  }

  const createKey = async () => {
    const r = await ec2Client.send(new CreateKeyPairCommand({ KeyName: keyName.trim() }))
    toast(`Key pair "${keyName}" created`)
    if (r.KeyMaterial) {
      const blob = new Blob([r.KeyMaterial], { type: 'text/plain' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${keyName}.pem`
      a.click()
    }
    setShowCreateKey(false); setKeyName(''); loadKeys()
  }

  const deleteKey = async (name: string) => {
    await ec2Client.send(new DeleteKeyPairCommand({ KeyName: name }))
    toast(`Key pair "${name}" deleted`); loadKeys()
  }

  const filteredInst = instances.filter(i => (getName(i) + i.InstanceId).toLowerCase().includes(filter.toLowerCase()))
  const filteredSGs = sgs.filter(g => (g.GroupName + g.GroupId).toLowerCase().includes(filter.toLowerCase()))
  const filteredKeys = keys.filter(k => k.KeyName?.toLowerCase().includes(filter.toLowerCase()))

  return (
    <ServiceLayout serviceName="Amazon EC2" navItems={NAV}>
      {showCreateSG && (
        <Modal title="Create security group" onClose={() => setShowCreateSG(false)} onConfirm={createSG} confirmLabel="Create">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Security group name</label>
              <input autoFocus className="aws-input" value={sgForm.name} onChange={e => setSgForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Description</label>
              <input className="aws-input" value={sgForm.desc} onChange={e => setSgForm(f => ({ ...f, desc: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}
      {showCreateKey && (
        <Modal title="Create key pair" onClose={() => setShowCreateKey(false)} onConfirm={createKey} confirmLabel="Create key pair">
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Key pair name</label>
            <input autoFocus className="aws-input" value={keyName} onChange={e => setKeyName(e.target.value)} />
            <p style={{ fontSize: 12, color: '#545b64', marginTop: 8 }}>The private key (.pem) will be downloaded automatically.</p>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">EC2 Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'instances' && selected.size > 0 && (
            <>
              <button className="btn-aws-secondary" onClick={startInstances}>Start</button>
              <button className="btn-aws-secondary" onClick={stopInstances}>Stop</button>
              <button className="btn-aws-danger" onClick={terminateInstances}>Terminate</button>
            </>
          )}
          <button className="btn-aws-secondary" onClick={() => { loadInstances(); loadSGs(); loadKeys() }}><RefreshCw size={13} /></button>
          {tab === 'sgs' && <button className="btn-aws-primary" onClick={() => setShowCreateSG(true)}>Create security group</button>}
          {tab === 'keys' && <button className="btn-aws-primary" onClick={() => setShowCreateKey(true)}>Create key pair</button>}
        </div>
      </div>

      {/* Resource summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="aws-card" style={{ padding: 14 }}>
          <p style={{ fontSize: 11, color: '#545b64' }}>Running instances</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#1d8348' }}>{instances.filter(i => i.State?.Name === 'running').length}</p>
        </div>
        <div className="aws-card" style={{ padding: 14 }}>
          <p style={{ fontSize: 11, color: '#545b64' }}>Security groups</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#0073bb' }}>{sgs.length}</p>
        </div>
        <div className="aws-card" style={{ padding: 14 }}>
          <p style={{ fontSize: 11, color: '#545b64' }}>Key pairs</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#0073bb' }}>{keys.length}</p>
        </div>
      </div>

      <div className="aws-tabs">
        {[['instances', 'Instances'], ['sgs', 'Security Groups'], ['keys', 'Key Pairs']].map(([t, label]) => (
          <button key={t} className={`aws-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setFilter(''); setSelected(new Set()) }}>{label}</button>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div className="search-box" style={{ width: 320 }}>
          <Search size={13} color="#545b64" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder={`Filter ${tab}`} />
        </div>
      </div>

      {tab === 'instances' && (
        <div className="aws-card">
          <table className="aws-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" className="aws-checkbox" onChange={e => setSelected(e.target.checked ? new Set(instances.map(i => i.InstanceId!)) : new Set())} /></th>
                <th>Name</th><th>Instance ID</th><th>Instance state</th><th>Instance type</th><th>Public IP</th><th>AMI ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : filteredInst.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
                  <Server size={28} style={{ margin: '0 auto 8px', display: 'block', color: '#aab7b8' }} />
                  No instances. Launch instances via Docker or AWS CLI.
                </td></tr>
              ) : filteredInst.map(i => (
                <tr key={i.InstanceId} className={selected.has(i.InstanceId!) ? 'selected' : ''}>
                  <td><input type="checkbox" className="aws-checkbox" checked={selected.has(i.InstanceId!)}
                    onChange={e => { const s = new Set(selected); e.target.checked ? s.add(i.InstanceId!) : s.delete(i.InstanceId!); setSelected(s) }} /></td>
                  <td style={{ fontWeight: 600 }}>{getName(i)}</td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{i.InstanceId}</span></td>
                  <td><span className={`badge ${STATE_BADGE[i.State?.Name] ?? 'badge-outline-gray'}`}>● {i.State?.Name}</span></td>
                  <td style={{ fontSize: 12 }}>{i.InstanceType}</td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{i.PublicIpAddress ?? '-'}</td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{i.ImageId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sgs' && (
        <div className="aws-card">
          <table className="aws-table">
            <thead>
              <tr><th>Security group name</th><th>Group ID</th><th>VPC ID</th><th>Description</th></tr>
            </thead>
            <tbody>
              {filteredSGs.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#545b64' }}>No security groups</td></tr>
              ) : filteredSGs.map(g => (
                <tr key={g.GroupId}>
                  <td style={{ fontWeight: 600 }}>{g.GroupName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{g.GroupId}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{g.VpcId ?? '-'}</td>
                  <td style={{ fontSize: 12, color: '#545b64' }}>{g.Description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'keys' && (
        <div className="aws-card">
          <table className="aws-table">
            <thead>
              <tr><th>Key pair name</th><th>Key pair ID</th><th>Fingerprint</th><th /></tr>
            </thead>
            <tbody>
              {filteredKeys.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#545b64' }}>No key pairs</td></tr>
              ) : filteredKeys.map(k => (
                <tr key={k.KeyName}>
                  <td style={{ fontWeight: 600 }}>{k.KeyName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{k.KeyPairId}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#545b64' }}>{k.KeyFingerprint?.slice(0, 30)}...</td>
                  <td><button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => deleteKey(k.KeyName!)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ServiceLayout>
  )
}
