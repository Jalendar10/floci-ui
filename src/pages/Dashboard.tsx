import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ListBucketsCommand } from '@aws-sdk/client-s3'
import { ListTablesCommand } from '@aws-sdk/client-dynamodb'
import { ListQueuesCommand } from '@aws-sdk/client-sqs'
import { ListFunctionsCommand } from '@aws-sdk/client-lambda'
import { s3Client, dynamoClient, sqsClient, lambdaClient } from '../aws/clients'

const SERVICES = [
  { label: 'S3', desc: 'Scalable object storage', path: '/s3', color: '#e8721c', icon: '🪣' },
  { label: 'DynamoDB', desc: 'NoSQL key-value database', path: '/dynamodb', color: '#3184c2', icon: '🗄️' },
  { label: 'Lambda', desc: 'Run code without servers', path: '/lambda', color: '#e8981d', icon: '⚡' },
  { label: 'SQS', desc: 'Managed message queues', path: '/sqs', color: '#e9278a', icon: '📨' },
  { label: 'SNS', desc: 'Pub/sub messaging', path: '/sns', color: '#e9278a', icon: '🔔' },
  { label: 'IAM', desc: 'Access management', path: '/iam', color: '#dd3524', icon: '🔐' },
  { label: 'EC2', desc: 'Virtual machines', path: '/ec2', color: '#e8721c', icon: '🖥️' },
  { label: 'RDS', desc: 'Managed databases', path: '/rds', color: '#3184c2', icon: '💾' },
  { label: 'ECS', desc: 'Container orchestration', path: '/ecs', color: '#e8721c', icon: '🐳' },
  { label: 'CloudWatch', desc: 'Monitoring & logs', path: '/cloudwatch', color: '#e9278a', icon: '📊' },
  { label: 'Kinesis', desc: 'Real-time data streams', path: '/kinesis', color: '#3184c2', icon: '🌊' },
  { label: 'Secrets Manager', desc: 'Store & rotate secrets', path: '/secrets', color: '#dd3524', icon: '🔑' },
  { label: 'KMS', desc: 'Key management service', path: '/kms', color: '#dd3524', icon: '🛡️' },
  { label: 'API Gateway', desc: 'Build & manage APIs', path: '/apigateway', color: '#a855f7', icon: '🔗' },
  { label: 'Cognito', desc: 'User authentication', path: '/cognito', color: '#e8721c', icon: '👤' },
  { label: 'Step Functions', desc: 'Visual workflows', path: '/sfn', color: '#e8981d', icon: '🔄' },
  { label: 'EventBridge', desc: 'Event-driven integration', path: '/eventbridge', color: '#e9278a', icon: '📡' },
  { label: 'CloudFormation', desc: 'Infrastructure as code', path: '/cloudformation', color: '#e8721c', icon: '🏗️' },
  { label: 'ECR', desc: 'Container registry', path: '/ecr', color: '#e8721c', icon: '📦' },
  { label: 'Athena', desc: 'Query S3 with SQL', path: '/placeholder/athena', color: '#3184c2', icon: '🔍' },
  { label: 'Glue', desc: 'ETL & data catalog', path: '/placeholder/glue', color: '#3184c2', icon: '🧬' },
  { label: 'Firehose', desc: 'Data delivery streams', path: '/placeholder/firehose', color: '#3184c2', icon: '🚒' },
  { label: 'MSK', desc: 'Managed Kafka', path: '/placeholder/msk', color: '#3184c2', icon: '🎯' },
  { label: 'ElastiCache', desc: 'Redis / Memcached', path: '/placeholder/elasticache', color: '#3184c2', icon: '⚡' },
  { label: 'Route 53', desc: 'DNS service', path: '/placeholder/route53', color: '#a855f7', icon: '🌐' },
  { label: 'SES', desc: 'Email service', path: '/placeholder/ses', color: '#e9278a', icon: '✉️' },
  { label: 'Transfer Family', desc: 'SFTP service', path: '/placeholder/transfer', color: '#e8721c', icon: '📁' },
  { label: 'OpenSearch', desc: 'Search & analytics', path: '/placeholder/opensearch', color: '#3184c2', icon: '🔭' },
  { label: 'Backup', desc: 'Centralized backup', path: '/placeholder/backup', color: '#e8721c', icon: '💿' },
  { label: 'SSM', desc: 'Systems Manager', path: '/placeholder/ssm', color: '#e8721c', icon: '🔧' },
]

export default function Dashboard() {
  const [stats, setStats] = useState({ buckets: 0, tables: 0, queues: 0, functions: 0 })
  const [health, setHealth] = useState<'checking' | 'ok' | 'err'>('checking')

  useEffect(() => {
    fetch('/floci/_floci/health')
      .then(r => { setHealth(r.ok ? 'ok' : 'err') })
      .catch(() => setHealth('err'))

    Promise.allSettled([
      s3Client.send(new ListBucketsCommand({})).then(r => r.Buckets?.length ?? 0),
      dynamoClient.send(new ListTablesCommand({})).then(r => r.TableNames?.length ?? 0),
      sqsClient.send(new ListQueuesCommand({})).then(r => r.QueueUrls?.length ?? 0),
      lambdaClient.send(new ListFunctionsCommand({})).then(r => r.Functions?.length ?? 0),
    ]).then(([b, t, q, f]) => {
      setStats({
        buckets: b.status === 'fulfilled' ? b.value : 0,
        tables: t.status === 'fulfilled' ? t.value : 0,
        queues: q.status === 'fulfilled' ? q.value : 0,
        functions: f.status === 'fulfilled' ? f.value : 0,
      })
    })
  }, [])

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#16191f', marginBottom: 4 }}>AWS Management Console</h1>
        <p style={{ fontSize: 13, color: '#545b64' }}>Powered by Floci — Local AWS emulator · 47 services · us-east-1</p>
      </div>

      {/* Health + Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="aws-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: health === 'ok' ? '#1d8348' : health === 'err' ? '#d13212' : '#f39c12', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 11, color: '#545b64' }}>Floci Status</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: health === 'ok' ? '#1d8348' : '#d13212' }}>
              {health === 'ok' ? 'Running' : health === 'err' ? 'Offline' : 'Checking…'}
            </p>
          </div>
        </div>
        {[
          { label: 'S3 Buckets', val: stats.buckets, path: '/s3' },
          { label: 'DynamoDB Tables', val: stats.tables, path: '/dynamodb' },
          { label: 'SQS Queues', val: stats.queues, path: '/sqs' },
          { label: 'Lambda Functions', val: stats.functions, path: '/lambda' },
        ].map(s => (
          <Link key={s.label} to={s.path} style={{ textDecoration: 'none' }}>
            <div className="aws-card" style={{ padding: 16 }}>
              <p style={{ fontSize: 11, color: '#545b64', marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#0073bb' }}>{s.val}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* All Services Grid */}
      <div className="aws-card" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#16191f' }}>All Services</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {SERVICES.map(s => (
            <Link key={s.label} to={s.path} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #e9ebed', borderRadius: 4, background: '#fff', transition: 'all 0.1s', cursor: 'pointer' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = '#0073bb'
                  el.style.boxShadow = '0 0 0 1px #0073bb'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = '#e9ebed'
                  el.style.boxShadow = 'none'
                }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0073bb', margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: 11, color: '#545b64', margin: 0 }}>{s.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div style={{ marginTop: 16, padding: 12, background: '#fff', border: '1px solid #e9ebed', borderRadius: 4, display: 'flex', gap: 24, fontSize: 12, color: '#545b64' }}>
        <span>🖥️ Endpoint: <code style={{ background: '#f2f3f3', padding: '1px 6px', borderRadius: 2 }}>http://localhost:4566</code></span>
        <span>🌍 Region: <strong>us-east-1</strong></span>
        <span>🔑 Credentials: <strong>test / test</strong></span>
        <span>📦 Version: <strong>Floci 1.5.15</strong></span>
      </div>
    </div>
  )
}
