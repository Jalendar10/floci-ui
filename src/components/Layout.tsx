import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, ChevronDown, Bell, HelpCircle, Settings, Globe, User, Menu, Bot } from 'lucide-react'
import AIPanel from './AIPanel'

const SERVICE_GROUPS = [
  {
    name: 'Compute',
    services: [
      { id: 'ec2', label: 'EC2', path: '/ec2', desc: 'Virtual Servers' },
      { id: 'lambda', label: 'Lambda', path: '/lambda', desc: 'Serverless Functions' },
      { id: 'ecs', label: 'ECS', path: '/ecs', desc: 'Container Service' },
      { id: 'ecr', label: 'ECR', path: '/ecr', desc: 'Container Registry' },
    ],
  },
  {
    name: 'Storage',
    services: [
      { id: 's3', label: 'S3', path: '/s3', desc: 'Object Storage' },
      { id: 'efs', label: 'EFS', path: '/placeholder/efs', desc: 'File Storage' },
    ],
  },
  {
    name: 'Database',
    services: [
      { id: 'dynamodb', label: 'DynamoDB', path: '/dynamodb', desc: 'NoSQL Database' },
      { id: 'rds', label: 'RDS', path: '/rds', desc: 'Relational Database' },
      { id: 'elasticache', label: 'ElastiCache', path: '/placeholder/elasticache', desc: 'In-Memory Cache' },
    ],
  },
  {
    name: 'Messaging',
    services: [
      { id: 'sqs', label: 'SQS', path: '/sqs', desc: 'Message Queue' },
      { id: 'sns', label: 'SNS', path: '/sns', desc: 'Notifications' },
      { id: 'kinesis', label: 'Kinesis', path: '/kinesis', desc: 'Data Streams' },
      { id: 'eventbridge', label: 'EventBridge', path: '/eventbridge', desc: 'Event Bus' },
    ],
  },
  {
    name: 'Security',
    services: [
      { id: 'iam', label: 'IAM', path: '/iam', desc: 'Access Management' },
      { id: 'kms', label: 'KMS', path: '/kms', desc: 'Key Management' },
      { id: 'secrets', label: 'Secrets Manager', path: '/secrets', desc: 'Secrets' },
      { id: 'cognito', label: 'Cognito', path: '/cognito', desc: 'User Auth' },
    ],
  },
  {
    name: 'Networking',
    services: [
      { id: 'apigateway', label: 'API Gateway', path: '/apigateway', desc: 'API Management' },
      { id: 'elb', label: 'Load Balancing', path: '/placeholder/elb', desc: 'ELB v2' },
      { id: 'route53', label: 'Route 53', path: '/placeholder/route53', desc: 'DNS Service' },
    ],
  },
  {
    name: 'Developer Tools',
    services: [
      { id: 'cloudformation', label: 'CloudFormation', path: '/cloudformation', desc: 'Infrastructure as Code' },
      { id: 'sfn', label: 'Step Functions', path: '/sfn', desc: 'Workflows' },
      { id: 'ssm', label: 'Systems Manager', path: '/placeholder/ssm', desc: 'SSM' },
      { id: 'codebuild', label: 'CodeBuild', path: '/placeholder/codebuild', desc: 'Build Service' },
    ],
  },
  {
    name: 'Analytics',
    services: [
      { id: 'athena', label: 'Athena', path: '/placeholder/athena', desc: 'Query Service' },
      { id: 'glue', label: 'Glue', path: '/placeholder/glue', desc: 'ETL Service' },
      { id: 'firehose', label: 'Firehose', path: '/placeholder/firehose', desc: 'Data Delivery' },
      { id: 'msk', label: 'MSK', path: '/placeholder/msk', desc: 'Kafka' },
    ],
  },
  {
    name: 'Management',
    services: [
      { id: 'cloudwatch', label: 'CloudWatch', path: '/cloudwatch', desc: 'Monitoring & Logs' },
      { id: 'transfer', label: 'Transfer Family', path: '/placeholder/transfer', desc: 'SFTP Service' },
      { id: 'backup', label: 'Backup', path: '/placeholder/backup', desc: 'Backup Service' },
    ],
  },
]

const ALL_SERVICES = SERVICE_GROUPS.flatMap(g => g.services)

export default function Layout({ children }: { children: React.ReactNode }) {
  const [servicesOpen, setServicesOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [search, setSearch] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setServicesOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = search ? ALL_SERVICES.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase()) ||
    s.desc.toLowerCase().includes(search.toLowerCase())
  ) : []

  return (
    <div style={{ minHeight: '100vh', background: '#f2f3f3' }}>
      {/* Top Nav */}
      <nav style={{ background: '#232f3e', height: 48, display: 'flex', alignItems: 'center', gap: 0, position: 'sticky', top: 0, zIndex: 500 }}>
        {/* AWS Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', height: '100%', textDecoration: 'none', borderRight: '1px solid #3d4f5e' }}>
          <span style={{ color: '#ff9900', fontWeight: 900, fontSize: 15, letterSpacing: -0.5 }}>aws</span>
        </Link>

        {/* Services Menu */}
        <div ref={dropRef} style={{ position: 'relative', height: '100%' }}>
          <button onClick={() => { setServicesOpen(o => !o); setSearch('') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', borderRight: '1px solid #3d4f5e' }}>
            <Menu size={14} />
            Services
            <ChevronDown size={12} />
          </button>
          {servicesOpen && (
            <div style={{ position: 'absolute', top: 48, left: 0, background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', width: 720, zIndex: 600, borderRadius: '0 0 4px 4px' }}>
              {/* Search */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ebed' }}>
                <div className="search-box">
                  <Search size={13} color="#545b64" />
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services..." />
                </div>
              </div>
              {search ? (
                <div style={{ padding: '8px 0', maxHeight: 300, overflowY: 'auto' }}>
                  {filtered.length === 0 ? (
                    <p style={{ padding: '12px 16px', color: '#545b64', fontSize: 13 }}>No results</p>
                  ) : filtered.map(s => (
                    <button key={s.id} onClick={() => { navigate(s.path); setServicesOpen(false); setSearch('') }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f2f3f3')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</span>
                      <span style={{ fontSize: 12, color: '#545b64' }}>{s.desc}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, padding: 16 }}>
                  {SERVICE_GROUPS.map(g => (
                    <div key={g.name} style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#545b64', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{g.name}</p>
                      {g.services.map(s => (
                        <button key={s.id} onClick={() => { navigate(s.path); setServicesOpen(false) }}
                          style={{ display: 'block', width: '100%', padding: '3px 0', background: 'none', border: 'none', color: '#0073bb', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Search */}
        <div style={{ flex: 1, padding: '0 16px', maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#3d4f5e', borderRadius: 2, padding: '5px 12px' }}>
            <Search size={13} color="#aab7b8" />
            <input placeholder="Search services, features, and resources"
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 13, outline: 'none', flex: 1, '::placeholder': { color: '#aab7b8' } } as any} />
          </div>
        </div>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', height: '100%' }}>
          {/* Region */}
          <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', height: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', borderLeft: '1px solid #3d4f5e' }}>
            <Globe size={12} />us-east-1
          </button>
          {/* Notifications */}
          <button style={{ padding: '0 12px', height: '100%', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', borderLeft: '1px solid #3d4f5e' }}>
            <Bell size={14} />
          </button>
          {/* Account */}
          <button onClick={() => setAccountOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', height: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', borderLeft: '1px solid #3d4f5e', position: 'relative' }}>
            <User size={12} />
            floci-user
            <ChevronDown size={11} />
            {accountOpen && (
              <div style={{ position: 'absolute', top: 48, right: 0, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', width: 220, borderRadius: '0 0 4px 4px', zIndex: 600 }}>
                {[['Account ID', '000000000000'], ['Region', 'us-east-1'], ['Endpoint', 'localhost:4566']].map(([k, v]) => (
                  <div key={k} style={{ padding: '8px 16px', borderBottom: '1px solid #e9ebed' }}>
                    <p style={{ fontSize: 11, color: '#545b64', marginBottom: 2 }}>{k}</p>
                    <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#16191f' }}>{v}</p>
                  </div>
                ))}
                <div style={{ padding: '8px 16px' }}>
                  <span style={{ fontSize: 12, color: '#1d8348' }}>● Floci Running</span>
                </div>
              </div>
            )}
          </button>
          <button style={{ padding: '0 12px', height: '100%', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', borderLeft: '1px solid #3d4f5e' }}>
            <HelpCircle size={14} />
          </button>
          <button style={{ padding: '0 12px', height: '100%', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', borderLeft: '1px solid #3d4f5e' }}>
            <Settings size={14} />
          </button>
          {/* AI Agent toggle */}
          <button onClick={() => setAiOpen(o => !o)} title="AI Agent"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: '100%',
              background: aiOpen ? '#ff9900' : 'none', border: 'none',
              color: aiOpen ? '#232f3e' : '#ff9900', cursor: 'pointer',
              borderLeft: '1px solid #3d4f5e', fontSize: 12, fontWeight: 700,
            }}>
            <Bot size={15} />
            AI
          </button>
        </div>
      </nav>

      {/* Breadcrumb bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e9ebed', padding: '0 24px', height: 36, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#545b64' }}>
        <Link to="/" style={{ color: '#0073bb', textDecoration: 'none' }}>Console Home</Link>
        {location.pathname !== '/' && (
          <>
            <span>›</span>
            <span style={{ color: '#16191f' }}>
              {ALL_SERVICES.find(s => location.pathname.startsWith(s.path))?.label ?? location.pathname.split('/')[1]}
            </span>
          </>
        )}
      </div>

      {/* Content + AI Panel side by side */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 84px)', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
        {aiOpen && <AIPanel onClose={() => setAiOpen(false)} />}
      </div>
    </div>
  )
}
