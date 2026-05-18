import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import type { Bucket } from '@aws-sdk/client-s3'
import {
  ListBucketsCommand, CreateBucketCommand, DeleteBucketCommand,
  ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { s3Client } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Search, Upload, RefreshCw, FolderOpen } from 'lucide-react'

const NAV = [
  { label: 'Buckets', path: '/s3' },
]

function BucketList() {
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const r = await s3Client.send(new ListBucketsCommand({}))
      setBuckets(r.Buckets ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!newName.trim()) return
    await s3Client.send(new CreateBucketCommand({ Bucket: newName.trim() }))
    toast(`Bucket "${newName}" created successfully`)
    setShowCreate(false); setNewName(''); load()
  }

  const deleteSelected = async () => {
    for (const b of selected) {
      await s3Client.send(new DeleteBucketCommand({ Bucket: b }))
    }
    toast(`${selected.size} bucket(s) deleted`)
    setSelected(new Set()); load()
  }

  const filtered = buckets.filter(b => b.Name?.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      {showCreate && (
        <Modal title="Create bucket" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create bucket">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Bucket name</label>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value.toLowerCase())}
                onKeyDown={e => e.key === 'Enter' && create()}
                className="aws-input" placeholder="my-bucket-name" />
              <p style={{ fontSize: 11, color: '#545b64', marginTop: 4 }}>Must be globally unique, lowercase, 3-63 characters</p>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>AWS Region</label>
              <select className="aws-select" style={{ width: '100%' }}>
                <option>us-east-1 (N. Virginia)</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">S3 Buckets</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {selected.size > 0 && <button className="btn-aws-danger" onClick={deleteSelected}>Delete ({selected.size})</button>}
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create bucket</button>
        </div>
      </div>

      <div className="aws-card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="search-box" style={{ width: 300 }}>
            <Search size={13} color="#545b64" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find buckets by name" />
          </div>
          <p style={{ fontSize: 12, color: '#545b64' }}>{filtered.length} bucket{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        <table className="aws-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}><input type="checkbox" className="aws-checkbox" onChange={e => setSelected(e.target.checked ? new Set(buckets.map(b => b.Name!)) : new Set())} /></th>
              <th>Name</th>
              <th>AWS Region</th>
              <th>Creation date</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
                <FolderOpen size={32} style={{ margin: '0 auto 8px', display: 'block', color: '#aab7b8' }} />
                {filter ? 'No buckets match your filter' : 'No buckets. Create your first bucket to get started.'}
              </td></tr>
            ) : filtered.map(b => (
              <tr key={b.Name} className={selected.has(b.Name!) ? 'selected' : ''}>
                <td><input type="checkbox" className="aws-checkbox" checked={selected.has(b.Name!)}
                  onChange={e => { const s = new Set(selected); e.target.checked ? s.add(b.Name!) : s.delete(b.Name!); setSelected(s) }} /></td>
                <td>
                  <button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => navigate(`/s3/${b.Name}`)}>
                    {b.Name}
                  </button>
                </td>
                <td>us-east-1</td>
                <td style={{ color: '#545b64', fontSize: 12 }}>{b.CreationDate?.toLocaleString() ?? '-'}</td>
                <td><span className="badge badge-outline-gray">Private</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function BucketDetail() {
  const navigate = useNavigate()
  const bucket = window.location.pathname.split('/s3/')[1]?.split('/')[0]
  const [objects, setObjects] = useState<{ Key: string; Size: number; LastModified?: Date; ETag?: string }[]>([])
  const [prefix] = useState('')
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('objects')
  const toast = useToast()

  const load = async () => {
    if (!bucket) return
    setLoading(true)
    try {
      const r = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix || undefined }))
      setObjects(r.Contents?.map(o => ({ Key: o.Key!, Size: o.Size ?? 0, LastModified: o.LastModified, ETag: o.ETag })) ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [bucket, prefix])

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !bucket) return
    for (const file of Array.from(files)) {
      const body = await file.arrayBuffer()
      await s3Client.send(new PutObjectCommand({ Bucket: bucket, Key: (prefix || '') + file.name, Body: new Uint8Array(body), ContentType: file.type }))
    }
    toast(`${files.length} file(s) uploaded`)
    load()
  }

  const deleteSelected = async () => {
    for (const k of selected) {
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucket!, Key: k }))
    }
    toast(`${selected.size} object(s) deleted`)
    setSelected(new Set()); load()
  }

  const fmt = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`
  const filtered = objects.filter(o => o.Key.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button className="btn-aws-link" onClick={() => navigate('/s3')}>S3</button>
        <span style={{ color: '#545b64' }}>›</span>
        <h1 className="page-title">{bucket}</h1>
      </div>

      <div className="aws-tabs">
        {['objects', 'properties', 'permissions', 'metrics'].map(t => (
          <button key={t} className={`aws-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'objects' && (
        <div className="aws-card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
              <Search size={13} color="#545b64" />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Find objects by prefix" />
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {selected.size > 0 && <button className="btn-aws-danger" onClick={deleteSelected}>Delete ({selected.size})</button>}
              <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
              <label className="btn-aws-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Upload size={13} />Upload
                <input type="file" multiple className="hidden" style={{ display: 'none' }} onChange={upload} />
              </label>
            </div>
          </div>
          <table className="aws-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" className="aws-checkbox" onChange={e => setSelected(e.target.checked ? new Set(objects.map(o => o.Key)) : new Set())} /></th>
                <th>Name</th>
                <th>Type</th>
                <th>Last modified</th>
                <th>Size</th>
                <th>Storage class</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
                  This bucket is empty. Upload objects to get started.
                </td></tr>
              ) : filtered.map(o => (
                <tr key={o.Key} className={selected.has(o.Key) ? 'selected' : ''}>
                  <td><input type="checkbox" className="aws-checkbox" checked={selected.has(o.Key)}
                    onChange={e => { const s = new Set(selected); e.target.checked ? s.add(o.Key) : s.delete(o.Key); setSelected(s) }} /></td>
                  <td><span style={{ color: '#0073bb', fontWeight: 500 }}>{o.Key}</span></td>
                  <td style={{ color: '#545b64', fontSize: 12 }}>{o.Key.split('.').pop()?.toUpperCase() ?? '-'}</td>
                  <td style={{ color: '#545b64', fontSize: 12 }}>{o.LastModified?.toLocaleString() ?? '-'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmt(o.Size)}</td>
                  <td><span className="badge badge-outline-gray">Standard</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'properties' && (
        <div className="aws-card" style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              ['Bucket name', bucket ?? ''],
              ['AWS Region', 'us-east-1'],
              ['ARN', `arn:aws:s3:::${bucket}`],
              ['Creation date', 'N/A'],
              ['Versioning', 'Disabled'],
              ['Static website hosting', 'Disabled'],
            ].map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: 12, color: '#545b64', marginBottom: 2 }}>{k}</p>
                <p style={{ fontSize: 13, fontFamily: 'monospace' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'permissions' && (
        <div className="aws-card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: '#545b64' }}>Block Public Access: <strong style={{ color: '#1d8348' }}>All public access is blocked</strong></p>
        </div>
      )}
    </>
  )
}

export default function S3Page() {
  return (
    <ServiceLayout serviceName="Amazon S3" navItems={NAV}>
      <Routes>
        <Route path="/" element={<BucketList />} />
        <Route path="/:bucket/*" element={<BucketDetail />} />
      </Routes>
    </ServiceLayout>
  )
}
