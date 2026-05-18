import { useEffect, useState } from 'react'
import { ListStacksCommand, CreateStackCommand, DeleteStackCommand } from '@aws-sdk/client-cloudformation'
import { cfnClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw } from 'lucide-react'

const NAV = [{ label: 'Stacks', path: '/cloudformation' }]

const SAMPLE = `AWSTemplateFormatVersion: '2010-09-09'
Description: Sample stack

Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-cfn-bucket-demo`

const STATE_COLOR: Record<string, string> = {
  CREATE_COMPLETE: 'badge-outline-green', UPDATE_COMPLETE: 'badge-outline-green',
  CREATE_IN_PROGRESS: 'badge-outline-blue', DELETE_IN_PROGRESS: 'badge-outline-red',
  ROLLBACK_COMPLETE: 'badge-outline-red', CREATE_FAILED: 'badge-outline-red',
}

export default function CloudFormationPage() {
  const [stacks, setStacks] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', template: SAMPLE })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await cfnClient.send(new ListStacksCommand({ StackStatusFilter: ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'CREATE_IN_PROGRESS', 'ROLLBACK_COMPLETE'] as any }))
      setStacks(r.StackSummaries ?? [])
    } catch { setStacks([]) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    await cfnClient.send(new CreateStackCommand({ StackName: form.name.trim(), TemplateBody: form.template, Capabilities: ['CAPABILITY_IAM'] as any }))
    toast(`Stack "${form.name}" creation initiated`)
    setShowCreate(false); setForm({ name: '', template: SAMPLE }); load()
  }

  const del = async (name: string) => {
    await cfnClient.send(new DeleteStackCommand({ StackName: name }))
    toast(`Stack "${name}" deletion initiated`); load()
  }

  return (
    <ServiceLayout serviceName="CloudFormation" navItems={NAV}>
      {showCreate && (
        <Modal title="Create stack" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create stack" wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Stack name</label>
              <input autoFocus className="aws-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Template (YAML or JSON)</label>
              <textarea className="aws-input" value={form.template} onChange={e => setForm(f => ({ ...f, template: e.target.value }))}
                style={{ height: 220, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' }} />
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">CloudFormation Stacks</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create stack</button>
        </div>
      </div>

      <div className="aws-card">
        <table className="aws-table">
          <thead><tr><th>Stack name</th><th>Status</th><th>Created</th><th>Updated</th><th /></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              : stacks.length === 0 ? <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No stacks. Create your first CloudFormation stack.</td></tr>
              : stacks.map(s => (
                <tr key={s.StackId}>
                  <td><button className="btn-aws-link" style={{ fontWeight: 700 }}>{s.StackName}</button></td>
                  <td><span className={`badge ${STATE_COLOR[s.StackStatus] ?? 'badge-outline-gray'}`}>● {s.StackStatus}</span></td>
                  <td style={{ fontSize: 12, color: '#545b64' }}>{s.CreationTime?.toLocaleDateString()}</td>
                  <td style={{ fontSize: 12, color: '#545b64' }}>{s.LastUpdatedTime?.toLocaleDateString() ?? '-'}</td>
                  <td><button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => del(s.StackName)}>Delete</button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </ServiceLayout>
  )
}
