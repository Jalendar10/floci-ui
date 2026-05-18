import { useEffect, useState } from 'react'
import { DescribeRepositoriesCommand, CreateRepositoryCommand, DeleteRepositoryCommand, ListImagesCommand } from '@aws-sdk/client-ecr'
import { ecrClient } from '../../aws/clients'
import ServiceLayout from '../../components/ServiceLayout'
import Modal from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { RefreshCw } from 'lucide-react'

const NAV = [{ label: 'Repositories', path: '/ecr' }]

export default function ECRPage() {
  const [repos, setRepos] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [images, setImages] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', visibility: 'private', mutableTags: true })
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const r = await ecrClient.send(new DescribeRepositoriesCommand({}))
      setRepos(r.repositories ?? [])
    } catch { setRepos([]) } finally { setLoading(false) }
  }

  const loadImages = async (name: string) => {
    const r = await ecrClient.send(new ListImagesCommand({ repositoryName: name }))
    setImages(r.imageIds ?? [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadImages(selected.repositoryName) }, [selected])

  const create = async () => {
    await ecrClient.send(new CreateRepositoryCommand({
      repositoryName: form.name.trim(),
      imageTagMutability: form.mutableTags ? 'MUTABLE' : 'IMMUTABLE',
    }))
    toast(`Repository "${form.name}" created`)
    setShowCreate(false); setForm({ name: '', visibility: 'private', mutableTags: true }); load()
  }

  const del = async (name: string) => {
    await ecrClient.send(new DeleteRepositoryCommand({ repositoryName: name, force: true }))
    toast('Repository deleted')
    if (selected?.repositoryName === name) setSelected(null)
    load()
  }

  return (
    <ServiceLayout serviceName="Amazon ECR" navItems={NAV}>
      {showCreate && (
        <Modal title="Create repository" onClose={() => setShowCreate(false)} onConfirm={create} confirmLabel="Create repository">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 4 }}>Repository name</label>
              <input autoFocus className="aws-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="my-app/backend" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.mutableTags} onChange={e => setForm(f => ({ ...f, mutableTags: e.target.checked }))} />
              Mutable image tags
            </label>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title">ECR Repositories</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-aws-secondary" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn-aws-primary" onClick={() => setShowCreate(true)}>Create repository</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div className="aws-card">
          <table className="aws-table">
            <thead><tr><th>Repository name</th><th>URI</th><th>Tag mutability</th><th /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
                : repos.length === 0 ? <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#545b64' }}>No repositories</td></tr>
                : repos.map(r => (
                  <tr key={r.repositoryName} className={selected?.repositoryName === r.repositoryName ? 'selected' : ''}>
                    <td><button className="btn-aws-link" style={{ fontWeight: 700 }} onClick={() => setSelected(r)}>{r.repositoryName}</button></td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#545b64' }}>{r.repositoryUri}</td>
                    <td><span className="badge badge-outline-gray">{r.imageTagMutability}</span></td>
                    <td><button className="btn-aws-link" style={{ color: '#d13212' }} onClick={() => del(r.repositoryName)}>Delete</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="aws-card">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed' }}>
              <p className="section-title">Images in {selected.repositoryName}</p>
              <p style={{ fontSize: 11, color: '#545b64', fontFamily: 'monospace', marginTop: 4 }}>
                docker push {selected.repositoryUri}:latest
              </p>
            </div>
            <table className="aws-table">
              <thead><tr><th>Image tag</th><th>Image digest</th></tr></thead>
              <tbody>
                {images.length === 0 ? <tr><td colSpan={2} style={{ padding: 24, textAlign: 'center', color: '#545b64' }}>No images pushed</td></tr>
                  : images.map((img, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace' }}>{img.imageTag ?? '(untagged)'}</td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#545b64' }}>{img.imageDigest?.slice(0, 20)}...</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ServiceLayout>
  )
}
