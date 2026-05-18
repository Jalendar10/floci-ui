import { useEffect, useState } from 'react'
import {
  DescribeLogGroupsCommand, CreateLogGroupCommand, DeleteLogGroupCommand,
  DescribeLogStreamsCommand, GetLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs'
import { logsClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Search, RefreshCw, ChevronRight } from 'lucide-react'

const NAV = [
  { label: 'Log groups', path: '/cloudwatch' },
]

export default function CloudWatchPage() {
  const [groups, setGroups] = useState<any[]>([])
  const [streams, setStreams] = useState<any[]>([])
  const [events, setEvents] = useState<{ timestamp: number; message: string }[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [selectedStream, setSelectedStream] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newGroup, setNewGroup] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await logsClient.send(new DescribeLogGroupsCommand({}))
      setGroups(r.logGroups ?? [])
    } finally { setLoading(false) }
  }

  const loadStreams = async (group: string) => {
    const r = await logsClient.send(new DescribeLogStreamsCommand({ logGroupName: group, orderBy: 'LastEventTime', descending: true }))
    setStreams(r.logStreams ?? [])
  }

  const loadEvents = async (group: string, stream: string) => {
    const r = await logsClient.send(new GetLogEventsCommand({ logGroupName: group, logStreamName: stream, limit: 100 }))
    setEvents(r.events?.map(e => ({ timestamp: e.timestamp ?? 0, message: e.message ?? '' })) ?? [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selectedGroup) loadStreams(selectedGroup) }, [selectedGroup])
  useEffect(() => { if (selectedGroup && selectedStream) loadEvents(selectedGroup, selectedStream) }, [selectedGroup, selectedStream])

  const create = async () => {
    await logsClient.send(new CreateLogGroupCommand({ logGroupName: newGroup.trim() }))
    toast(`Log group "${newGroup}" created`)
    setShowCreate(false); setNewGroup(''); load()
  }

  const deleteGroup = async (name: string) => {
    await logsClient.send(new DeleteLogGroupCommand({ logGroupName: name }))
    toast(`Log group deleted`)
    if (selectedGroup === name) { setSelectedGroup(null); setStreams([]); setEvents([]) }
    load()
  }

  const fmtBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`
  const filtered = groups.filter(g => g.logGroupName?.toLowerCase().includes(filter.toLowerCase()))

  return (
    <ServiceLayout serviceName="Amazon CloudWatch" navItems={NAV}>
      {showCreate && (
        <Modal title="Create log group" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create">
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Log group name</label>
            <input autoFocus className="aws-input" value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder="/my/log/group" />
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">CloudWatch Logs</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create log group</button>
        </div>
      </div>

      {/* Breadcrumb navigation */}
      {(selectedGroup || selectedStream) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 13 }}>
          <button className="btn-aws-link" onClick={() => { setSelectedGroup(null); setSelectedStream(null) }}>Log groups</button>
          {selectedGroup && <><ChevronRight size={13} color="#545b64" /><button className="btn-aws-link" onClick={() => setSelectedStream(null)}>{selectedGroup}</button></>}
          {selectedStream && <><ChevronRight size={13} color="#545b64" /><span style={{ color: '#545b64' }}>{selectedStream}</span></>}
        </div>
      )}

      {!selectedGroup && (
        <div className="aws-card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', gap: 8 }}>
            <div className="search-box" style={{ flex: 1 }}>
              <Search size={13} color="#545b64" />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter log groups" />
            </div>
          </div>
          <table className="aws-table">
            <thead>
              <tr><th>Log group</th><th>Retention</th><th>Stored bytes</th><th>Created</th><th /></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No log groups</td></tr>
              ) : filtered.map(g => (
                <tr key={g.logGroupName}>
                  <td><button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => setSelectedGroup(g.logGroupName)}>{g.logGroupName}</button></td>
                  <td style={{ fontSize: 12 }}>{g.retentionInDays ? `${g.retentionInDays} days` : 'Never expire'}</td>
                  <td style={{ fontSize: 12 }}>{fmtBytes(g.storedBytes ?? 0)}</td>
                  <td style={{ fontSize: 12, color: '#545b64' }}>{g.creationTime ? new Date(g.creationTime).toLocaleDateString() : '-'}</td>
                  <td><button className="btn-aws-link" style={{ color: '#d13212', fontSize: 12 }} onClick={() => deleteGroup(g.logGroupName)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedGroup && !selectedStream && (
        <div className="aws-card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed' }}>
            <p className="section-title">Log streams — {selectedGroup}</p>
          </div>
          <table className="aws-table">
            <thead>
              <tr><th>Log stream</th><th>Last event</th><th>First event</th></tr>
            </thead>
            <tbody>
              {streams.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No log streams</td></tr>
              ) : streams.map(s => (
                <tr key={s.logStreamName}>
                  <td><button className="btn-aws-link" onClick={() => setSelectedStream(s.logStreamName)}>{s.logStreamName}</button></td>
                  <td style={{ fontSize: 12, color: '#545b64' }}>{s.lastEventTimestamp ? new Date(s.lastEventTimestamp).toLocaleString() : '-'}</td>
                  <td style={{ fontSize: 12, color: '#545b64' }}>{s.firstEventTimestamp ? new Date(s.firstEventTimestamp).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedGroup && selectedStream && (
        <div className="aws-card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', justifyContent: 'space-between' }}>
            <p className="section-title">{selectedStream}</p>
            <button className="btn-aws-secondary" onClick={() => loadEvents(selectedGroup, selectedStream)}><RefreshCw size={13} /></button>
          </div>
          <div style={{ padding: 12 }}>
            {events.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#545b64', padding: 24 }}>No log events</p>
            ) : (
              <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {events.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '3px 0', borderBottom: '1px solid #f2f3f3' }}>
                    <span style={{ color: '#545b64', flexShrink: 0, width: 180 }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </span>
                    <span style={{ wordBreak: 'break-all' }}>{e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ServiceLayout>
  )
}
