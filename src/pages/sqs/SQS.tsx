import { useEffect, useState } from 'react'
import {
  ListQueuesCommand, CreateQueueCommand, DeleteQueueCommand,
  SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand,
  GetQueueAttributesCommand, PurgeQueueCommand,
} from '@aws-sdk/client-sqs'
import { sqsClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Search, RefreshCw, Send, MessageSquare } from 'lucide-react'

const NAV = [{ label: 'Queues', path: '/sqs' }]

export default function SQSPage() {
  const [queues, setQueues] = useState<{ url: string; attrs: Record<string, string> }[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<{ id: string; body: string; receipt: string; sent: string }[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [newName, setNewName] = useState('')
  const [isFifo, setIsFifo] = useState(false)
  const [msgBody, setMsgBody] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const qName = (url: string) => url.split('/').pop()!

  const load = async () => {
    setLoading(true)
    try {
      const r = await sqsClient.send(new ListQueuesCommand({}))
      const urls = r.QueueUrls ?? []
      const withAttrs = await Promise.all(urls.map(async url => {
        try {
          const a = await sqsClient.send(new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: ['All'] }))
          return { url, attrs: a.Attributes ?? {} }
        } catch { return { url, attrs: {} } }
      }))
      setQueues(withAttrs)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const loadMessages = async (url: string) => {
    const r = await sqsClient.send(new ReceiveMessageCommand({
      QueueUrl: url, MaxNumberOfMessages: 10, WaitTimeSeconds: 0,
      MessageAttributeNames: ['All'],
    }))
    setMessages(r.Messages?.map(m => ({
      id: m.MessageId!, body: m.Body!, receipt: m.ReceiptHandle!, sent: '-',
    })) ?? [])
  }

  const create = async () => {
    const name = isFifo && !newName.endsWith('.fifo') ? newName + '.fifo' : newName
    await sqsClient.send(new CreateQueueCommand({
      QueueName: name.trim(),
      Attributes: isFifo ? { FifoQueue: 'true' } : {},
    }))
    toast(`Queue "${name}" created`)
    setShowCreate(false); setNewName(''); setIsFifo(false); load()
  }

  const deleteQueues = async (urls: string[]) => {
    for (const url of urls) await sqsClient.send(new DeleteQueueCommand({ QueueUrl: url }))
    toast(`${urls.length} queue(s) deleted`)
    setSelected(null); load()
  }

  const sendMessage = async () => {
    if (!selected || !msgBody.trim()) return
    await sqsClient.send(new SendMessageCommand({ QueueUrl: selected, MessageBody: msgBody }))
    toast('Message sent')
    setShowSend(false); setMsgBody('')
    setTimeout(() => loadMessages(selected), 500)
  }

  const deleteMsg = async (receipt: string) => {
    if (!selected) return
    await sqsClient.send(new DeleteMessageCommand({ QueueUrl: selected, ReceiptHandle: receipt }))
    toast('Message deleted')
    loadMessages(selected)
  }

  const purge = async () => {
    if (!selected) return
    await sqsClient.send(new PurgeQueueCommand({ QueueUrl: selected }))
    toast('Queue purged')
    setMessages([])
  }

  const filtered = queues.filter(q => qName(q.url).toLowerCase().includes(filter.toLowerCase()))
  const selectedQueue = queues.find(q => q.url === selected)

  return (
    <ServiceLayout serviceName="Amazon SQS" navItems={NAV}>
      {showCreate && (
        <Modal title="Create queue" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create queue">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Queue name</label>
              <input autoFocus className="aws-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="my-queue" />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="type" checked={!isFifo} onChange={() => setIsFifo(false)} />
                Standard
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="type" checked={isFifo} onChange={() => setIsFifo(true)} />
                FIFO
              </label>
            </div>
            {isFifo && <p style={{ fontSize: 12, color: '#545b64' }}>FIFO queues have ordering guarantees. Name will get .fifo suffix.</p>}
          </div>
        </Modal>
      )}
      {showSend && (
        <Modal title={`Send message to ${selected ? qName(selected) : ''}`} onClose={() => setShowSend(false)} onConfirm={sendMessage} confirmLabel="Send message">
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Message body</label>
            <textarea autoFocus className="aws-input" value={msgBody} onChange={e => setMsgBody(e.target.value)}
              style={{ height: 120, resize: 'vertical' }} placeholder="Enter message body..." />
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">Simple Queue Service</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create queue</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Queue list */}
        <div className="aws-card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', gap: 8 }}>
            <div className="search-box" style={{ flex: 1 }}>
              <Search size={13} color="#545b64" />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search queues" />
            </div>
          </div>
          <table className="aws-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Messages</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
                  <MessageSquare size={28} style={{ margin: '0 auto 8px', display: 'block', color: '#aab7b8' }} />
                  No queues found
                </td></tr>
              ) : filtered.map(q => (
                <tr key={q.url} className={selected === q.url ? 'selected' : ''}>
                  <td>
                    <button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => { setSelected(q.url); loadMessages(q.url) }}>
                      {qName(q.url)}
                    </button>
                  </td>
                  <td><span className="badge badge-outline-gray">{qName(q.url).endsWith('.fifo') ? 'FIFO' : 'Standard'}</span></td>
                  <td style={{ fontSize: 12 }}>{q.attrs.ApproximateNumberOfMessages ?? '0'}</td>
                  <td><button className="btn-aws-link" style={{ color: '#d13212', fontSize: 12 }} onClick={() => deleteQueues([q.url])}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Message panel */}
        {selected && selectedQueue && (
          <div className="aws-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="section-title">{qName(selected)}</p>
                <p style={{ fontSize: 11, color: '#545b64' }}>
                  Visible: {selectedQueue.attrs.ApproximateNumberOfMessages ?? 0} ·
                  In-flight: {selectedQueue.attrs.ApproximateNumberOfMessagesNotVisible ?? 0}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-aws-secondary" onClick={purge} style={{ fontSize: 12 }}>Purge</button>
                <button className="btn-aws-secondary" onClick={() => loadMessages(selected)} style={{ fontSize: 12 }}><RefreshCw size={12} /></button>
                <button className="btn-aws-primary" onClick={() => setShowSend(true)} style={{ fontSize: 12 }}><Send size={12} /> Send</button>
              </div>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#545b64', padding: 24, fontSize: 13 }}>No messages available. Messages may be empty or in-flight.</p>
              ) : messages.map(m => (
                <div key={m.id} style={{ border: '1px solid #e9ebed', borderRadius: 4, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#545b64' }}>{m.id}</span>
                    <button className="btn-aws-link" style={{ color: '#d13212', fontSize: 11 }} onClick={() => deleteMsg(m.receipt)}>Delete</button>
                  </div>
                  <p style={{ fontSize: 13, wordBreak: 'break-word' }}>{m.body}</p>
                  <p style={{ fontSize: 11, color: '#aab7b8', marginTop: 4 }}>Sent: {m.sent}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ServiceLayout>
  )
}
