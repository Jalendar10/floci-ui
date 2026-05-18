# Floci UI — AWS Management Console

A complete AWS Management Console-style UI for [Floci](https://github.com/floci-io/floci), the free LocalStack alternative. Manage all your local AWS services through a browser — no CLI needed.

---

## Quick Start (Docker)

One command to start everything — Floci + the UI together:

```bash
docker compose up
```

Then open **http://localhost:3000** in your browser.

That's it. No configuration needed. Any AWS credentials work (`test`/`test`).

---

## What's included

| Service | What you can do |
|---|---|
| **S3** | Create/delete buckets, browse objects, upload files, delete objects |
| **DynamoDB** | Create tables, scan/query items, put/delete items (full JSON editor) |
| **Lambda** | List functions, invoke with JSON payload, view response |
| **SQS** | Create queues (Standard & FIFO), send/receive/delete messages, purge |
| **SNS** | Create topics, publish messages, view subscriptions |
| **IAM** | Create/delete users, roles, groups; list policies |
| **EC2** | List instances, start/stop/terminate, manage security groups & key pairs |
| **ECS** | Create/delete clusters, view services & tasks |
| **RDS** | Create/delete database instances (MySQL, PostgreSQL, MariaDB) |
| **CloudWatch** | Browse log groups, streams, live log event viewer |
| **Kinesis** | Create streams, put records |
| **Secrets Manager** | Store, retrieve (show/hide), delete secrets |
| **KMS** | Create keys, enable/disable, schedule deletion |
| **Cognito** | Create user pools, manage users |
| **API Gateway v2** | Create HTTP/WebSocket APIs, view routes |
| **EventBridge** | Create event buses, view rules |
| **Step Functions** | Create state machines, start executions, view history |
| **ECR** | Create repositories, list images |
| **CloudFormation** | Create stacks from YAML/JSON templates |
| + 11 more | ElastiCache, MSK, Athena, Glue, Firehose, Route53, OpenSearch, SES, SSM, Transfer, Backup |

---

## Screenshots

The UI looks and works like the real AWS Console:
- Dark top navigation with service search and account info
- Left sidebar with service-specific sub-navigation
- AWS-style tables with sorting, filtering, and row selection
- Create/delete modals with proper form validation
- Toast notifications for every action
- Breadcrumb navigation

---

## How it works

```
Browser (localhost:3000)
       │
       ▼
  nginx (Floci UI container)
       │
       ├── GET /             → serves React SPA
       │
       └── /floci/*          → proxies to Floci container:4566
                                    │
                                    └── All 47 AWS service APIs
```

The nginx reverse proxy handles routing so there are no CORS issues — the browser always talks to the same origin.

---

## Services running

| Container | Port | Purpose |
|---|---|---|
| `floci-ui` | `3000` | React UI served by nginx |
| `floci` | `4566` | Floci AWS emulator (all 47 services) |

---

## AWS CLI access

You can also use the AWS CLI directly against Floci:

```bash
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

aws s3 mb s3://my-bucket
aws dynamodb list-tables
aws sqs create-queue --queue-name my-queue
aws lambda list-functions
```

---

## Development

Run the UI locally against a running Floci container:

```bash
# Start Floci
docker run -d --name floci \
  -p 4566:4566 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e FLOCI_DEFAULT_REGION=us-east-1 \
  -u root \
  floci/floci:latest

# Run the UI dev server
npm install
npm run dev
# → http://localhost:3000
```

### Build for production

```bash
npm run build          # outputs to dist/
docker compose build   # builds the Docker image
docker compose up      # runs everything
```

---

## Tech stack

- **React 18** + TypeScript + Vite
- **AWS SDK v3** — browser-compatible, all services
- **Tailwind CSS** — utility styling
- **React Router v6** — client-side routing
- **nginx** — production static file server + reverse proxy
- **Docker Compose** — orchestrates Floci + UI together

---

## Why Floci?

| | Floci | LocalStack Community |
|---|---|---|
| Auth token required | ❌ No | ✅ Yes (since March 2026) |
| Security updates | ✅ Yes | ❌ Frozen |
| Startup time | ~24 ms | ~3.3 s |
| Idle memory | ~13 MiB | ~143 MiB |
| Docker image size | ~90 MB | ~1.0 GB |
| License | MIT | Restricted |

---

## License

MIT — free to use, modify, and distribute.
