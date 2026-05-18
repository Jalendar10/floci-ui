import { useEffect, useState } from 'react'
import { ListStreamsCommand, CreateStreamCommand, DeleteStreamCommand, PutRecordCommand, DescribeStreamSummaryCommand } from '@aws-sdk/client-kinesis'
import { kinesisClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw, Send } from 'lucide-react'

const NAV = [{ label: 'Data Streams', path: '/kinesis' }]

export default function KinesisPage() {
  const [streams, setStreams] = useState<string[]>([])
  const [details, setDetails] = useState<Record<string, any>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [showPut, setShowPut] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', shards: '1' })
  const [record, setRecord] = useState({ data: '', partitionKey: 'pk1' })
  const toast = useToast()

  const load = async () => {
    const r = await kinesisClient.send(new ListStreamsCommand({}))
    const names = r.StreamNames ?? []
    setStreams(names)
    const dets = await Promise.allSettled(names.map(n => kinesisClient.send(new DescribeStreamSummaryCommand({ StreamName: n }))))
    const map: Record<string, any> = {}
    dets.forEach((d, i) => { if (d.status === 'fulfilled') map[names[i]] = d.value.StreamDescriptionSummary })
    setDetails(map)
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    await kinesisClient.send(new CreateStreamCommand({ StreamName: form.name.trim(), ShardCount: +form.shards }))
    toast(`Stream "${form.name}" created`)
    setShowCreate(false); setForm({ name: '', shards: '1' }); load()
  }

  const del = async (name: string) => {
    await kinesisClient.send(new DeleteStreamCommand({ StreamName: name }))
    toast(`Stream "${name}" deleted`); load()
  }

  const put = async () => {
    if (!showPut) return
    await kinesisClient.send(new PutRecordCommand({
      StreamName: showPut, Data: new TextEncoder().encode(record.data), PartitionKey: record.partitionKey,
    }))
    toast(`Record sent to "${showPut}"`)
    setShowPut(null)
  }

  return (
    <ServiceLayout serviceName="Amazon Kinesis" navItems={NAV}>
      {showCreate && (
        <Modal title="Create data stream" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create data stream">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Data stream name</label>
              <input autoFocus className="aws-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Number of shards</label>
              <input type="number" className="aws-input" min={1} max={100} value={form.shards} onChange={e => setForm(f => ({ ...f, shards: e.target.value }))} />
              <p style={{ fontSize: 12, color: '#545b64', marginTop: 4 }}>Each shard provides 1 MB/s write and 2 MB/s read capacity</p>
            </div>
          </div>
        </Modal>
      )}
      {showPut && (
        <Modal title={`Put record into ${showPut}`} onClose={() => setShowPut(null)} onConfirm={put} confirmLabel="Put record">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Partition key</label>
              <input className="aws-input" value={record.partitionKey} onChange={e => setRecord(r => ({ ...r, partitionKey: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Data</label>
              <textarea autoFocus className="aws-input" value={record.data} onChange={e => setRecord(r => ({ ...r, data: e.target.value }))}
                style={{ height: 100, resize: 'vertical' }} placeholder='{"event": "user_login", "userId": "123"}' />
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">Kinesis Data Streams</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create data stream</button>
        </div>
      </div>

      <div className="aws-card">
        <table className="aws-table">
          <thead>
            <tr><th>Stream name</th><th>Status</th><th>Shards</th><th>Retention (hours)</th><th>Stream ARN</th><th /></tr>
          </thead>
          <tbody>
            {streams.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No data streams</td></tr>
            ) : streams.map(s => {
              const d = details[s]
              return (
                <tr key={s}>
                  <td><button className="btn-aws-link" style={{ fontWeight: 700 }}>{s}</button></td>
                  <td><span className={`badge ${d?.StreamStatus === 'ACTIVE' ? 'badge-outline-green' : 'badge-outline-gray'}`}>● {d?.StreamStatus ?? 'ACTIVE'}</span></td>
                  <td style={{ fontSize: 12 }}>{d?.OpenShardCount ?? 1}</td>
                  <td style={{ fontSize: 12 }}>{d?.RetentionPeriodHours ?? 24}h</td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#545b64' }}>{d?.StreamARN?.slice(-30) ?? '-'}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-aws-link" onClick={() => setShowPut(s)}><Send size={12} /> Put record</button>
                    <button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => del(s)}>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </ServiceLayout>
  )
}
