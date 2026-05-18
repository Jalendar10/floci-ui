import { useEffect, useState } from 'react'
import { ListUserPoolsCommand, CreateUserPoolCommand, DeleteUserPoolCommand, ListUsersCommand, AdminCreateUserCommand } from '@aws-sdk/client-cognito-identity-provider'
import { cognitoClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw, ChevronLeft } from 'lucide-react'

const NAV = [{ label: 'User pools', path: '/cognito' }]

export default function CognitoPage() {
  const [pools, setPools] = useState<any[]>([])
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [poolName, setPoolName] = useState('')
  const [userForm, setUserForm] = useState({ username: '', email: '' })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await cognitoClient.send(new ListUserPoolsCommand({ MaxResults: 50 }))
      setPools(r.UserPools ?? [])
    } catch { setPools([]) } finally { setLoading(false) }
  }

  const loadUsers = async (poolId: string) => {
    const r = await cognitoClient.send(new ListUsersCommand({ UserPoolId: poolId }))
    setUsers(r.Users ?? [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadUsers(selected.id) }, [selected])

  const createPool = async () => {
    await cognitoClient.send(new CreateUserPoolCommand({ PoolName: poolName.trim() }))
    toast(`User pool "${poolName}" created`)
    setShowCreate(false); setPoolName(''); load()
  }

  const delPool = async (id: string) => {
    await cognitoClient.send(new DeleteUserPoolCommand({ UserPoolId: id }))
    toast('User pool deleted')
    if (selected?.id === id) setSelected(null)
    load()
  }

  const createUser = async () => {
    if (!selected) return
    await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: selected.id, Username: userForm.username,
      UserAttributes: userForm.email ? [{ Name: 'email', Value: userForm.email }] : [],
    }))
    toast(`User "${userForm.username}" created`)
    setShowCreateUser(false); setUserForm({ username: '', email: '' }); loadUsers(selected.id)
  }

  return (
    <ServiceLayout serviceName="Amazon Cognito" navItems={NAV}>
      {showCreate && (
        <Modal title="Create user pool" onClose={() => setShowCreate(false)} onConfirm={createPool} confirmLabel="Create user pool">
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>User pool name</label>
            <input autoFocus className="aws-input" value={poolName} onChange={e => setPoolName(e.target.value)} placeholder="MyUserPool" />
          </div>
        </Modal>
      )}
      {showCreateUser && (
        <Modal title="Create user" onClose={() => setShowCreateUser(false)} onConfirm={createUser} confirmLabel="Create user">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Username</label>
              <input autoFocus className="aws-input" value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Email <span style={{ fontWeight: 400, color: '#545b64' }}>(optional)</span></label>
              <input className="aws-input" type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">{selected ? `User Pool: ${selected.name}` : 'Cognito User Pools'}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {selected && <button className="btn-aws-secondary" onClick={() => setSelected(null)}><ChevronLeft size={13} /> All Pools</button>}
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          {!selected ? (
            <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create user pool</button>
          ) : (
            <button className="btn-aws-primary" onClick={() => setShowCreateUser(true)}>Create user</button>
          )}
        </div>
      </div>

      {!selected ? (
        <div className="aws-card">
          <table className="aws-table">
            <thead><tr><th>Pool name</th><th>Pool ID</th><th>Created</th><th /></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : pools.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No user pools</td></tr>
              ) : pools.map(p => (
                <tr key={p.Id}>
                  <td><button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => setSelected({ id: p.Id, name: p.Name })}>{p.Name}</button></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.Id}</td>
                  <td style={{ fontSize: 12, color: '#545b64' }}>{p.CreationDate?.toLocaleDateString()}</td>
                  <td><button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => delPool(p.Id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="aws-card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed' }}>
            <p className="section-title">Users ({users.length})</p>
          </div>
          <table className="aws-table">
            <thead><tr><th>Username</th><th>Status</th><th>Email</th><th>Created</th></tr></thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#545b64' }}>No users in this pool</td></tr>
              ) : users.map(u => (
                <tr key={u.Username}>
                  <td style={{ fontWeight: 600 }}>{u.Username}</td>
                  <td><span className={`badge ${u.UserStatus === 'CONFIRMED' ? 'badge-outline-green' : 'badge-outline-gray'}`}>● {u.UserStatus}</span></td>
                  <td style={{ fontSize: 12 }}>{u.Attributes?.find((a: any) => a.Name === 'email')?.Value ?? '-'}</td>
                  <td style={{ fontSize: 12, color: '#545b64' }}>{u.UserCreateDate?.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ServiceLayout>
  )
}
