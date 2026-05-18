import { useParams } from 'react-router-dom'
import ServiceLayout from '../components/ServiceLayout'

const SERVICE_INFO: Record<string, { name: string; desc: string; features: string[] }> = {
  elasticache: { name: 'Amazon ElastiCache', desc: 'In-memory caching service supporting Redis and Memcached', features: ['Redis clusters', 'Memcached clusters', 'Replication groups', 'Snapshots', 'IAM auth'] },
  msk: { name: 'Amazon MSK', desc: 'Managed Streaming for Apache Kafka', features: ['Kafka clusters', 'Redpanda support', 'Topic management', 'Consumer groups', 'Schema Registry'] },
  athena: { name: 'Amazon Athena', desc: 'Interactive query service powered by DuckDB', features: ['SQL queries on S3', 'Glue Data Catalog integration', 'Query history', 'Result storage', 'Workgroups'] },
  glue: { name: 'AWS Glue', desc: 'ETL and Data Catalog service', features: ['Data Catalog databases', 'Table definitions', 'Schema Registry', 'ETL jobs', 'Crawlers'] },
  firehose: { name: 'Amazon Data Firehose', desc: 'Real-time streaming data delivery', features: ['Delivery streams', 'S3 destinations', 'NDJSON delivery', 'Buffering', 'Compression'] },
  route53: { name: 'Amazon Route 53', desc: 'Scalable DNS and domain name service', features: ['Hosted zones', 'DNS records', 'Health checks', 'Traffic policies', 'Resolver'] },
  elb: { name: 'Elastic Load Balancing', desc: 'Application and Network load balancers', features: ['Application Load Balancers', 'Network Load Balancers', 'Target groups', 'Listeners', 'Rules'] },
  opensearch: { name: 'Amazon OpenSearch', desc: 'Search and analytics service', features: ['Domains', 'Index management', 'Dashboards', 'Snapshots', 'Access policies'] },
  backup: { name: 'AWS Backup', desc: 'Centralized backup management', features: ['Backup plans', 'Backup vaults', 'Recovery points', 'Rules', 'Selections'] },
  ses: { name: 'Amazon SES', desc: 'Email sending and receiving', features: ['Identities', 'Email sending', 'Suppression list', 'Configuration sets', 'Templates'] },
  transfer: { name: 'AWS Transfer Family', desc: 'Managed SFTP/FTPS/FTP service', features: ['SFTP servers', 'Users', 'SSH key management', 'VPC endpoints', 'Logging'] },
  ssm: { name: 'AWS Systems Manager', desc: 'Operational data from multiple services', features: ['Parameter Store', 'Run Command', 'Session Manager', 'Patch Manager', 'Automation'] },
  codebuild: { name: 'AWS CodeBuild', desc: 'Fully managed build service', features: ['Build projects', 'Build history', 'Environments', 'S3 artifacts', 'CloudWatch logs'] },
  codedeploy: { name: 'AWS CodeDeploy', desc: 'Automated application deployments', features: ['Applications', 'Deployment groups', 'Lambda deployments', 'Traffic shifting', 'Rollback'] },
  autoscaling: { name: 'Auto Scaling', desc: 'Automatically adjust compute capacity', features: ['Auto Scaling groups', 'Launch configurations', 'Scaling policies', 'ELB integration', 'Lifecycle hooks'] },
  textract: { name: 'Amazon Textract', desc: 'Extract text and data from documents', features: ['Document analysis', 'Form extraction', 'Table extraction', 'Async jobs'] },
  transcribe: { name: 'Amazon Transcribe', desc: 'Automatic speech recognition', features: ['Transcription jobs', 'Custom vocabulary', 'Speaker diarization', 'Medical transcription'] },
  bedrock: { name: 'Amazon Bedrock Runtime', desc: 'Foundation models via API', features: ['Model invocation', 'Streaming responses', 'Text generation', 'Embeddings'] },
}

export default function Placeholder() {
  const { service } = useParams<{ service: string }>()
  const info = SERVICE_INFO[service ?? ''] ?? { name: service?.toUpperCase() ?? 'Service', desc: 'AWS Service', features: [] }

  return (
    <ServiceLayout serviceName={info.name} navItems={[{ label: 'Overview', path: `/placeholder/${service}` }]}>
      <div style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: '#f2f3f3', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            {service === 'elasticache' ? '⚡' : service === 'msk' ? '🎯' : service === 'athena' ? '🔍' : service === 'glue' ? '🧬' : '📦'}
          </div>
          <div>
            <h1 className="page-title">{info.name}</h1>
            <p style={{ fontSize: 13, color: '#545b64' }}>{info.desc}</p>
          </div>
        </div>

        <div className="aws-card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <p style={{ fontWeight: 700, fontSize: 14 }}>Supported by Floci</p>
          </div>
          <p style={{ fontSize: 13, color: '#545b64', lineHeight: 1.6 }}>
            This service is fully supported by Floci. Use the AWS CLI or SDK to interact with it:
          </p>
          <pre className="code-block" style={{ marginTop: 12 }}>
{`export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

aws ${service} help`}
          </pre>
        </div>

        {info.features.length > 0 && (
          <div className="aws-card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Supported features</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {info.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#1d8348', fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 13 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: '#f8f9fa', border: '1px solid #e9ebed', borderRadius: 4, padding: 16, fontSize: 13, color: '#545b64' }}>
          💡 Full UI management for this service is coming soon. In the meantime, all API operations work via the AWS CLI and SDK pointed at <code style={{ background: '#fff', padding: '1px 4px', borderRadius: 2 }}>http://localhost:4566</code>.
        </div>
      </div>
    </ServiceLayout>
  )
}
