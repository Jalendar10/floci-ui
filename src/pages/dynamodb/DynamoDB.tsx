import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import {
  ListTablesCommand, CreateTableCommand, DeleteTableCommand,
  ScanCommand, PutItemCommand, DeleteItemCommand, DescribeTableCommand,
} from '@aws-sdk/client-dynamodb'
import { dynamoClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Search, RefreshCw, Database } from 'lucide-react'

const NAV = [
  { label: 'Tables', path: '/dynamodb' },
]

function TableList() {
  const [tables, setTables] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', hashKey: 'id', hashType: 'S', sortKey: '', sortType: 'S' })
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const r = await dynamoClient.send(new ListTablesCommand({}))
      setTables(r.TableNames ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.name.trim() || !form.hashKey.trim()) return
    const attrs = [{ AttributeName: form.hashKey, AttributeType: form.hashType as any }]
    const keys = [{ AttributeName: form.hashKey, KeyType: 'HASH' as any }]
    if (form.sortKey.trim()) {
      attrs.push({ AttributeName: form.sortKey, AttributeType: form.sortType as any })
      keys.push({ AttributeName: form.sortKey, KeyType: 'RANGE' as any })
    }
    await dynamoClient.send(new CreateTableCommand({
      TableName: form.name.trim(),
      KeySchema: keys,
      AttributeDefinitions: attrs,
      BillingMode: 'PAY_PER_REQUEST',
    }))
    toast(`Table "${form.name}" created`)
    setShowCreate(false)
    setForm({ name: '', hashKey: 'id', hashType: 'S', sortKey: '', sortType: 'S' })
    load()
  }

  const deleteSelected = async () => {
    for (const t of selected) await dynamoClient.send(new DeleteTableCommand({ TableName: t }))
    toast(`${selected.size} table(s) deleted`)
    setSelected(new Set()); load()
  }

  const filtered = tables.filter(t => t.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      {showCreate && (
        <Modal title="Create table" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create table">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Table name</label>
              <input autoFocus className="aws-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="my-table" />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Partition key</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="aws-input" style={{ flex: 1 }} value={form.hashKey} onChange={e => setForm(f => ({ ...f, hashKey: e.target.value }))} placeholder="id" />
                <select className="aws-select" value={form.hashType} onChange={e => setForm(f => ({ ...f, hashType: e.target.value }))}>
                  <option value="S">String</option>
                  <option value="N">Number</option>
                  <option value="B">Binary</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Sort key <span style={{ color: '#545b64', fontWeight: 400 }}>(optional)</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="aws-input" style={{ flex: 1 }} value={form.sortKey} onChange={e => setForm(f => ({ ...f, sortKey: e.target.value }))} placeholder="sk (optional)" />
                <select className="aws-select" value={form.sortType} onChange={e => setForm(f => ({ ...f, sortType: e.target.value }))}>
                  <option value="S">String</option>
                  <option value="N">Number</option>
                </select>
              </div>
            </div>
            <div style={{ background: '#f2f3f3', padding: 12, borderRadius: 4, fontSize: 12, color: '#545b64' }}>
              Billing mode: <strong>Pay per request (on-demand)</strong>
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">DynamoDB Tables</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {selected.size > 0 && <button className="btn-aws-danger" onClick={deleteSelected}>Delete table{selected.size > 1 ? 's' : ''} ({selected.size})</button>}
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create table</button>
        </div>
      </div>

      <div className="aws-card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="search-box" style={{ width: 300 }}>
            <Search size={13} color="#545b64" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search tables" />
          </div>
          <p style={{ fontSize: 12, color: '#545b64' }}>{filtered.length} table{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <table className="aws-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}><input type="checkbox" className="aws-checkbox" onChange={e => setSelected(e.target.checked ? new Set(tables) : new Set())} /></th>
              <th>Name</th>
              <th>Status</th>
              <th>Partition key</th>
              <th>Sort key</th>
              <th>Billing mode</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
                <Database size={32} style={{ margin: '0 auto 8px', display: 'block', color: '#aab7b8' }} />
                No tables found.
              </td></tr>
            ) : filtered.map(t => (
              <tr key={t} className={selected.has(t) ? 'selected' : ''}>
                <td><input type="checkbox" className="aws-checkbox" checked={selected.has(t)}
                  onChange={e => { const s = new Set(selected); e.target.checked ? s.add(t) : s.delete(t); setSelected(s) }} /></td>
                <td><button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => navigate(`/dynamodb/${t}`)}>{t}</button></td>
                <td><span className="badge badge-outline-green">● Active</span></td>
                <td style={{ color: '#545b64', fontSize: 12 }}>id (String)</td>
                <td style={{ color: '#545b64', fontSize: 12 }}>-</td>
                <td style={{ fontSize: 12 }}>On-demand</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TableDetail() {
  const tableName = window.location.pathname.split('/dynamodb/')[1]?.split('/')[0]
  const [items, setItems] = useState<Record<string, any>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [tab, setTab] = useState('items')
  const [showPut, setShowPut] = useState(false)
  const [json, setJson] = useState('{\n  "id": {"S": "item1"},\n  "name": {"S": "Example"}\n}')
  const [filter, setFilter] = useState('')
  const [tableInfo, setTableInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const load = async () => {
    if (!tableName) return
    setLoading(true)
    try {
      const [scan, desc] = await Promise.all([
        dynamoClient.send(new ScanCommand({ TableName: tableName })),
        dynamoClient.send(new DescribeTableCommand({ TableName: tableName })),
      ])
      const its = scan.Items ?? []
      setItems(its)
      setTableInfo(desc.Table)
      const cols = Array.from(new Set(its.flatMap(i => Object.keys(i))))
      setColumns(cols)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tableName])

  const putItem = async () => {
    try {
      const parsed = JSON.parse(json)
      await dynamoClient.send(new PutItemCommand({ TableName: tableName!, Item: parsed }))
      toast('Item created successfully')
      setShowPut(false)
      load()
    } catch (e: any) { toast(e.message, 'error') }
  }

  const deleteItem = async (item: Record<string, any>) => {
    const key: Record<string, any> = {}
    tableInfo?.KeySchema?.forEach((k: any) => { key[k.AttributeName] = item[k.AttributeName] })
    await dynamoClient.send(new DeleteItemCommand({ TableName: tableName!, Key: key }))
    toast('Item deleted')
    load()
  }

  const formatVal = (v: any) => v?.S ?? v?.N ?? v?.BOOL ?? v?.NULL ?? (v?.L ? `[${v.L.length}]` : v?.M ? '{...}' : JSON.stringify(v))

  const filteredItems = items.filter(item =>
    Object.values(item).some(v => String(formatVal(v)).toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <>
      {showPut && (
        <Modal title="Create item" onClose={() => setShowPut(false)} onConfirm={putItem} confirmLabel="Create item" wide>
          <div>
            <p style={{ fontSize: 12, color: '#545b64', marginBottom: 8 }}>Enter item as DynamoDB JSON format</p>
            <textarea value={json} onChange={e => setJson(e.target.value)}
              className="aws-input" style={{ height: 200, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
            <div className="code-block" style={{ marginTop: 8, fontSize: 11 }}>
              {`Example: {"id": {"S": "val"}, "count": {"N": "42"}, "active": {"BOOL": true}}`}
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button className="btn-aws-link" onClick={() => navigate('/dynamodb')}>DynamoDB</button>
        <span style={{ color: '#545b64' }}>›</span>
        <button className="btn-aws-link" onClick={() => navigate('/dynamodb')}>Tables</button>
        <span style={{ color: '#545b64' }}>›</span>
        <h1 className="page-title">{tableName}</h1>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          ['Items', items.length.toString()],
          ['Status', 'Active'],
          ['Billing', 'On-demand'],
          ['Region', 'us-east-1'],
        ].map(([k, v]) => (
          <div key={k} className="aws-card" style={{ padding: 12 }}>
            <p style={{ fontSize: 11, color: '#545b64' }}>{k}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#16191f' }}>{v}</p>
          </div>
        ))}
      </div>

      <div className="aws-tabs">
        {['items', 'indexes', 'monitoring', 'exports & streams', 'triggers'].map(t => (
          <button key={t} className={`aws-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <div className="aws-card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="search-box" style={{ flex: 1 }}>
              <Search size={13} color="#545b64" />
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter items" />
            </div>
            <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
            <button className="btn-aws-primary" onClick={() => setShowPut(true)}>Create item</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="aws-table">
              <thead>
                <tr>
                  {columns.map(c => <th key={c}>{c}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={columns.length + 1} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={columns.length + 1} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
                    No items. Create your first item to get started.
                  </td></tr>
                ) : filteredItems.map((item, i) => (
                  <tr key={i}>
                    {columns.map(c => (
                      <td key={c} style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item[c] ? formatVal(item[c]) : <span style={{ color: '#aab7b8' }}>-</span>}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => deleteItem(item)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 16px', fontSize: 12, color: '#545b64', borderTop: '1px solid #e9ebed' }}>
            Showing {filteredItems.length} of {items.length} item{items.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {tab !== 'items' && (
        <div className="aws-card" style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>
          <p>Coming soon in this view</p>
        </div>
      )}
    </>
  )
}

export default function DynamoDBPage() {
  return (
    <ServiceLayout serviceName="Amazon DynamoDB" navItems={NAV}>
      <Routes>
        <Route path="/" element={<TableList />} />
        <Route path="/:table/*" element={<TableDetail />} />
      </Routes>
    </ServiceLayout>
  )
}
