import { useEffect, useState } from 'react'
import {
  ListUsersCommand, CreateUserCommand, DeleteUserCommand,
  ListRolesCommand, CreateRoleCommand, DeleteRoleCommand,
  ListGroupsCommand, CreateGroupCommand, DeleteGroupCommand,
  ListPoliciesCommand,
} from '@aws-sdk/client-iam'
import { iamClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Search, RefreshCw } from 'lucide-react'

const NAV = [
  { label: 'Dashboard', path: '/iam' },
  { label: 'Users', path: '/iam/users' },
  { label: 'User groups', path: '/iam/groups' },
  { label: 'Roles', path: '/iam/roles' },
  { label: 'Policies', path: '/iam/policies' },
]

function useIAMData() {
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [u, r, g, p] = await Promise.allSettled([
        iamClient.send(new ListUsersCommand({})),
        iamClient.send(new ListRolesCommand({})),
        iamClient.send(new ListGroupsCommand({})),
        iamClient.send(new ListPoliciesCommand({ Scope: 'Local' })),
      ])
      if (u.status === 'fulfilled') setUsers(u.value.Users ?? [])
      if (r.status === 'fulfilled') setRoles(r.value.Roles ?? [])
      if (g.status === 'fulfilled') setGroups(g.value.Groups ?? [])
      if (p.status === 'fulfilled') setPolicies(p.value.Policies ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  return { users, roles, groups, policies, loading, reload: load }
}

export default function IAMPage() {
  const { users, roles, groups, policies, loading, reload } = useIAMData()
  const [tab, setTab] = useState('users')
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [trustPolicy, setTrustPolicy] = useState(`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}`)
  const toast = useToast()

  const create = async () => {
    if (!newName.trim()) return
    if (tab === 'users') {
      await iamClient.send(new CreateUserCommand({ UserName: newName.trim() }))
      toast(`User "${newName}" created`)
    } else if (tab === 'roles') {
      await iamClient.send(new CreateRoleCommand({ RoleName: newName.trim(), AssumeRolePolicyDocument: trustPolicy }))
      toast(`Role "${newName}" created`)
    } else if (tab === 'groups') {
      await iamClient.send(new CreateGroupCommand({ GroupName: newName.trim() }))
      toast(`Group "${newName}" created`)
    }
    setShowCreate(false); setNewName(''); reload()
  }

  const deleteItem = async (name: string) => {
    if (tab === 'users') { await iamClient.send(new DeleteUserCommand({ UserName: name })); toast(`User "${name}" deleted`) }
    else if (tab === 'roles') { await iamClient.send(new DeleteRoleCommand({ RoleName: name })); toast(`Role "${name}" deleted`) }
    else if (tab === 'groups') { await iamClient.send(new DeleteGroupCommand({ GroupName: name })); toast(`Group "${name}" deleted`) }
    reload()
  }

  const currentData = tab === 'users' ? users : tab === 'roles' ? roles : tab === 'groups' ? groups : policies
  const nameKey = tab === 'users' ? 'UserName' : tab === 'roles' ? 'RoleName' : tab === 'groups' ? 'GroupName' : 'PolicyName'
  const arnKey = tab === 'users' ? 'Arn' : tab === 'roles' ? 'Arn' : tab === 'groups' ? 'Arn' : 'Arn'

  const filtered = currentData.filter((item: any) => (item[nameKey] ?? '').toLowerCase().includes(filter.toLowerCase()))

  return (
    <ServiceLayout serviceName="AWS IAM" navItems={NAV}>
      {showCreate && (
        <Modal title={`Create ${tab === 'users' ? 'user' : tab === 'roles' ? 'role' : 'group'}`}
          onClose={() => setShowCreate(false)} onConfirm={create}
          confirmLabel={`Create ${tab.slice(0, -1)}`} wide={tab === 'roles'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                {tab === 'users' ? 'User name' : tab === 'roles' ? 'Role name' : 'Group name'}
              </label>
              <input autoFocus className="aws-input" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            {tab === 'roles' && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Trust policy</label>
                <textarea className="aws-input" value={trustPolicy} onChange={e => setTrustPolicy(e.target.value)}
                  style={{ height: 180, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
              </div>
            )}
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">Identity and Access Management (IAM)</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={reload}><RefreshCw size={13} /></button>
          {tab !== 'policies' && (
            <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>
              Create {tab === 'users' ? 'user' : tab === 'roles' ? 'role' : 'group'}
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[['Users', users.length, 'users'], ['Roles', roles.length, 'roles'], ['Groups', groups.length, 'groups'], ['Policies', policies.length, 'policies']].map(([label, count, t]) => (
          <div key={label as string} className="aws-card" style={{ padding: 16, cursor: 'pointer', border: tab === t ? '2px solid #ec7211' : undefined }}
            onClick={() => { setTab(t as string); setFilter('') }}>
            <p style={{ fontSize: 11, color: '#545b64' }}>{label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#0073bb' }}>{count}</p>
          </div>
        ))}
      </div>

      <div className="aws-tabs">
        {['users', 'roles', 'groups', 'policies'].map(t => (
          <button key={t} className={`aws-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setFilter('') }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="aws-card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed', display: 'flex', gap: 8 }}>
          <div className="search-box" style={{ flex: 1 }}>
            <Search size={13} color="#545b64" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder={`Search ${tab}`} />
          </div>
          <p style={{ fontSize: 12, color: '#545b64', alignSelf: 'center' }}>{filtered.length} {tab}</p>
        </div>
        <table className="aws-table">
          <thead>
            <tr>
              <th>{tab === 'users' ? 'User name' : tab === 'roles' ? 'Role name' : tab === 'groups' ? 'Group name' : 'Policy name'}</th>
              <th>ARN</th>
              <th>Created</th>
              {tab !== 'policies' && <th />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#545b64' }}>No {tab} found</td></tr>
            ) : filtered.map((item: any) => (
              <tr key={item[nameKey]}>
                <td><button className="btn-aws-link" style={{ fontWeight: 700 }}>{item[nameKey]}</button></td>
                <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#545b64', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item[arnKey]}</td>
                <td style={{ fontSize: 12, color: '#545b64' }}>{item.CreateDate?.toLocaleDateString() ?? '-'}</td>
                {tab !== 'policies' && (
                  <td><button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => deleteItem(item[nameKey])}>Delete</button></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ServiceLayout>
  )
}
