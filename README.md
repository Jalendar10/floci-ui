# Floci UI — AWS Management Console

A complete AWS Management Console-style UI for [Floci](https://github.com/floci-io/floci), the free LocalStack alternative. Manage all your local AWS services through a browser — no CLI needed.

---

## Quick Start

Clone this repo and run one script. It handles everything — installs Docker if missing, builds both Floci and the UI from source, and opens your browser.

```bash
git clone https://github.com/Jalendar10/floci-ui.git
cd floci-ui
./start.sh
```

**First run takes 5-10 minutes** (Maven downloads ~500 MB of dependencies once, then caches them).  
After that, starting is instant.

Open **http://localhost:3000** — any AWS credentials work (`test`/`test`).

---

## Commands

```bash
./start.sh           # build (first time only) then start
./start.sh stop      # stop the container
./start.sh logs      # tail live logs from both services
./start.sh status    # show whether it's running
./start.sh update    # pull latest Floci source from GitHub, rebuild, restart
./start.sh build     # rebuild image without restarting
```

**`./start.sh update`** is how you get the latest Floci code — it re-clones
[floci-io/floci](https://github.com/floci-io/floci) and rebuilds the image from scratch.

---

## How it works

Everything runs inside **one Docker container**, built from two GitHub repos:

```
git clone floci-io/floci       ← Floci AWS emulator (built with Maven)
git clone Jalendar10/floci-ui  ← React UI (built with Vite)
         │
         ▼
  Single Docker container
  ┌─────────────────────────────────────────┐
  │  supervisord                            │
  │  ├── Floci (java -jar, port 4566)       │
  │  └── nginx (port 3000)                  │
  │       ├── GET /  → React SPA            │
  │       └── /floci/* → Floci API          │
  └─────────────────────────────────────────┘
         │
         ▼
  Browser: http://localhost:3000
```

nginx reverse-proxies `/floci/*` → Floci on port 4566 inside the container,
so there are no CORS issues and no separate configuration needed.

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

## Development (UI only)

Run just the React UI against a running Floci container:

```bash
# Start Floci separately
docker run -d --name floci \
  -p 4566:4566 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e FLOCI_DEFAULT_REGION=us-east-1 \
  -u root \
  floci/floci:latest

# Run UI dev server (hot reload)
npm install
npm run dev
# → http://localhost:3000
```

---

## Tech stack

- **React 18** + TypeScript + Vite — UI
- **AWS SDK v3** — browser-compatible, all 47 service clients
- **Tailwind CSS** — styling
- **React Router v6** — client-side routing
- **Floci** — local AWS emulator, built from source at build time
- **nginx** — serves UI + proxies `/floci/*` to Floci inside the container
- **supervisord** — manages both nginx and Floci in one container
- **eclipse-temurin:25-jre** — JVM runtime base image

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
