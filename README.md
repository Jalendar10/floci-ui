# Floci UI — AWS Management Console

A complete AWS Management Console-style UI for [Floci](https://github.com/floci-io/floci), the free LocalStack alternative. Manage all your local AWS services through a browser — no CLI needed.

---

## Quick Start

One script does everything — installs Docker if missing, pulls the image, and opens your browser:

```bash
curl -fsSL https://raw.githubusercontent.com/Jalendar10/floci-ui/main/start.sh | bash
```

Or if you already cloned the repo:

```bash
./start.sh
```

Then open **http://localhost:3000** — that's it. No configuration needed. Any AWS credentials work (`test`/`test`).

---

## How it works

Everything runs inside **one Docker container**:

```
Browser (localhost:3000)
       │
       ▼
  nginx (port 3000, inside container)
       │
       ├── GET /             → React SPA (built UI)
       │
       └── /floci/*          → Floci AWS emulator (port 4566, same container)
                                    │
                                    └── All 47 AWS service APIs
```

**supervisord** manages both nginx and Floci inside the container. No CORS issues — the browser always talks to the same origin.

---

## Commands

```bash
./start.sh           # start (auto-installs Docker if needed)
./start.sh stop      # stop and remove container
./start.sh logs      # tail live logs
./start.sh status    # show running status
./start.sh update    # pull latest image and restart
```

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

## AWS CLI access

Use the AWS CLI directly against Floci:

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

### Build the combined image

```bash
docker build -t jalendar10/floci-ui:latest .
docker push jalendar10/floci-ui:latest
```

---

## Tech stack

- **React 18** + TypeScript + Vite
- **AWS SDK v3** — browser-compatible, all services
- **Tailwind CSS** — utility styling
- **React Router v6** — client-side routing
- **nginx** — static file server + reverse proxy inside the container
- **supervisord** — manages nginx + Floci in one container
- **Debian bookworm-slim** — container base (supports Floci's native binary)

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
