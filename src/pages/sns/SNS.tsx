import { useEffect, useState } from 'react'
import { ListTopicsCommand, CreateTopicCommand, DeleteTopicCommand, PublishCommand, ListSubscriptionsByTopicCommand } from '@aws-sdk/client-sns'
import { snsClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Search, RefreshCw, Send } from 'lucide-react'

const NAV = [{ label: 'Topics', path: '/sns' }, { label: 'Subscriptions', path: '/sns' }]

export default function SNSPage() {
  const [topics, setTopics] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [subs, setSubs] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [newName, setNewName] = useState('')
  const [isFifo, setIsFifo] = useState(false)
  const [pubMsg, setPubMsg] = useState('')
  const [pubSubject, setPubSubject] = useState('')
  const toast = useToast()

  const topicName = (arn: string) => arn.split(':').pop()!

  const load = async () => {
    const r = await snsClient.send(new ListTopicsCommand({}))
    setTopics(r.Topics?.map(t => t.TopicArn!) ?? [])
  }

  const loadSubs = async (arn: string) => {
    const r = await snsClient.send(new ListSubscriptionsByTopicCommand({ TopicArn: arn }))
    setSubs(r.Subscriptions ?? [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadSubs(selected) }, [selected])

  const create = async () => {
    const name = isFifo && !newName.endsWith('.fifo') ? newName + '.fifo' : newName
    await snsClient.send(new CreateTopicCommand({ Name: name.trim(), Attributes: isFifo ? { FifoTopic: 'true' } : {} }))
    toast(`Topic "${name}" created`)
    setShowCreate(false); setNewName(''); setIsFifo(false); load()
  }

  const del = async (arn: string) => {
    await snsClient.send(new DeleteTopicCommand({ TopicArn: arn }))
    toast(`Topic deleted`)
    if (selected === arn) setSelected(null)
    load()
  }

  const publish = async () => {
    if (!selected || !pubMsg.trim()) return
    await snsClient.send(new PublishCommand({ TopicArn: selected, Message: pubMsg, Subject: pubSubject || undefined }))
    toast('Message published successfully')
    setShowPublish(false); setPubMsg(''); setPubSubject('')
  }

  const filtered = topics.filter(t => topicName(t).toLowerCase().includes(filter.toLowerCase()))

  return (
    <ServiceLayout serviceName="Amazon SNS" navItems={NAV}>
      {showCreate && (
        <Modal title="Create topic" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create topic">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Type</label>
              <div style={{ display: 'flex', gap: 16 }}>
                {['Standard', 'FIFO'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="type" checked={isFifo === (t === 'FIFO')} onChange={() => setIsFifo(t === 'FIFO')} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Topic name</label>
              <input autoFocus className="aws-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="my-topic" />
            </div>
          </div>
        </Modal>
      )}
      {showPublish && selected && (
        <Modal title={`Publish to ${topicName(selected)}`} onClose={() => setShowPublish(false)} onConfirm={publish} confirmLabel="Publish message">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Subject <span style={{ fontWeight: 400, color: '#545b64' }}>(optional)</span></label>
              <input className="aws-input" value={pubSubject} onChange={e => setPubSubject(e.target.value)} placeholder="Email subject or notification title" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Message body</label>
              <textarea autoFocus className="aws-input" value={pubMsg} onChange={e => setPubMsg(e.target.value)}
                style={{ height: 120, resize: 'vertical' }} placeholder="Enter message content..." />
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">Simple Notification Service</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create topic</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div className="aws-card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', gap: 8 }}>
            <div className="search-box" style={{ flex: 1 }}>
              <Search size={13} color="#545b64" />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search topics" />
            </div>
          </div>
          <table className="aws-table">
            <thead>
              <tr><th>Name</th><th>Type</th><th>ARN</th><th /></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No topics</td></tr>
              ) : filtered.map(arn => (
                <tr key={arn} className={selected === arn ? 'selected' : ''}>
                  <td><button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => setSelected(arn)}>{topicName(arn)}</button></td>
                  <td><span className="badge badge-outline-gray">{topicName(arn).endsWith('.fifo') ? 'FIFO' : 'Standard'}</span></td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#545b64', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{arn}</td>
                  <td><button className="btn-aws-link" style={{ color: '#d13212', fontSize: 12 }} onClick={() => del(arn)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="aws-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="section-title">{topicName(selected)}</p>
              <button className="btn-aws-primary" onClick={() => setShowPublish(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={13} />Publish message
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 12, color: '#545b64', marginBottom: 8 }}>Topic ARN</p>
              <p style={{ fontFamily: 'monospace', fontSize: 11, background: '#f2f3f3', padding: '6px 8px', borderRadius: 3, marginBottom: 16, wordBreak: 'break-all' }}>{selected}</p>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Subscriptions ({subs.length})</p>
              {subs.length === 0 ? (
                <p style={{ fontSize: 13, color: '#545b64' }}>No subscriptions. Use AWS CLI or SDK to add subscribers.</p>
              ) : (
                <table className="aws-table">
                  <thead><tr><th>Protocol</th><th>Endpoint</th><th>Status</th></tr></thead>
                  <tbody>{subs.map((s, i) => (
                    <tr key={i}>
                      <td><span className="badge badge-outline-blue">{s.Protocol}</span></td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{s.Endpoint}</td>
                      <td><span className="badge badge-outline-green">Confirmed</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </ServiceLayout>
  )
}
