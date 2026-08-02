# Buizz AWS Production Architecture, DevSecOps, and Delivery Handbook

This handbook is the production architecture and operating plan for Buizz. It
complements [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md), which contains
the first-server deployment commands.

If these technologies are new to you, follow
[BUIZZ_BEGINNER_LEARNING_ROADMAP.md](./BUIZZ_BEGINNER_LEARNING_ROADMAP.md)
before operating production.

It is written for the repository as it exists today:

- Next.js 15 client in `client/`
- Express, Socket.IO, PDFKit, QRCode, MySQL, and notification workers in `server/`
- public website at `buizz.com`
- API at `api.buizz.com`
- payments through PhonePe and Razorpay
- email, WhatsApp/Interakt, Google, and Meta integrations
- KYC/bank documents, event media, QR codes, tickets, and invoices

All costs and service limits change. Confirm them in the AWS Pricing Calculator
for `ap-south-1` before purchasing a commitment.

---

## 1. Executive decision

### What Buizz should use now

| Capability | Initial production choice | Reason |
|---|---|---|
| Web/API compute | One EC2 instance, Nginx, PM2 | Lowest-complexity migration for two long-running Node processes and Socket.IO |
| Database | Private Amazon RDS for MySQL, Single-AZ initially | Managed backups, patching, monitoring, and no database on the web host |
| Public media | Private S3 bucket delivered by CloudFront OAC | Durable, inexpensive object storage with CDN delivery; bucket remains private |
| KYC/bank documents | Separate private S3 bucket | Strict access, audit, retention, and encryption boundary |
| Tickets/invoices/QR | Separate private S3 bucket or private prefix | Durable artifacts; short-lived authorized download URLs |
| Background notifications | Existing MySQL queue plus cron | Already implemented, no new service bill, adequate at modest traffic |
| PDF jobs | Move to the MySQL queue now; SQS when volume warrants | Removes the hidden Redis dependency and makes work retryable |
| Secrets | SSM Parameter Store `SecureString` initially | Lower cost than Secrets Manager for mostly static secrets |
| Deployment | GitHub Actions OIDC to AWS, SSM Run Command, immutable releases | No long-lived AWS or SSH keys in GitHub |
| Metrics/logs | CloudWatch agent, alarms, structured application logs | AWS-native baseline with controlled retention |
| Infrastructure | Terraform in a separate `infra/` directory | Repeatable, reviewed infrastructure and disaster recovery |

### What Buizz should not use now

| Technology | Decision | Reconsider when |
|---|---|---|
| Kubernetes/EKS | Do not use | Several independent services, multiple platform teams, and a real need for Kubernetes APIs |
| Redis/ElastiCache | Do not use initially | Measured cache need, distributed Socket.IO, shared rate limits, or BullMQ-specific requirements |
| BullMQ | Do not use for the initial architecture | Redis is deliberately adopted and queue semantics justify its cost |
| GraphQL | Do not introduce | Multiple clients repeatedly require complex aggregation that a REST BFF cannot handle cleanly |
| NAT Gateway | Avoid in the minimum-budget topology | Private application subnets require controlled outbound access at larger scale |
| Self-hosted MySQL/Redis | Do not use | Never for production cost saving; operational and recovery risk exceeds the saving |

This is deliberately a modular monolith. A well-instrumented modular monolith is
cheaper and safer than premature microservices.

---

## 2. Target architecture

```text
Users
  |
Route 53
  |
  +--> CloudFront --> private S3 public-media bucket
  |
  +--> Elastic IP --> Nginx on EC2
                       |-- Next.js :3000
                       |-- Express/Socket.IO :5000
                       |-- MySQL queue worker/cron
                       |
                       +--> private RDS MySQL
                       +--> private S3 KYC bucket
                       +--> private S3 ticket bucket
                       +--> SSM Parameter Store
                       +--> CloudWatch
                       +--> SES/SMTP, Meta, payment providers

GitHub pull request
  --> tests/security/build
  --> protected production environment approval
  --> GitHub OIDC assumes a narrow AWS role
  --> artifact uploaded to deployment S3
  --> SSM deploys a release directory on EC2
  --> health checks
  --> atomic switch or automatic rollback
```

### Availability trade-off

The minimum-budget design has one EC2 failure domain and a Single-AZ database.
It is production-capable for an early-stage platform, but it is not highly
available. It targets recoverability, not zero downtime.

Upgrade to an ALB plus at least two ECS tasks and Multi-AZ RDS when downtime has
a measurable business cost. Before scaling horizontally, remove every local
file dependency and configure a shared Socket.IO adapter.

---

## 3. Data classification and storage

Treat storage by data sensitivity, not merely by file extension.

| Class | Examples | Exposure | Encryption | Suggested retention |
|---|---|---|---|---|
| Public | event banners, venue thumbnails | CloudFront | SSE-S3 is adequate | While referenced, then lifecycle cleanup |
| Customer-private | ticket PDF, invoice, QR | Authenticated user/organizer only | SSE-S3 or SSE-KMS | Business/tax policy |
| Highly sensitive | PAN, Aadhaar, address proof, bank proof | Authorized reviewers only | SSE-KMS | Legal policy; delete when no longer required |
| Operational | logs, deploy artifacts, backups | Operations only | AWS-managed or customer KMS | Defined per incident/recovery need |

Do not put KYC, bank documents, tickets, or QR codes at public object URLs.
Do not store raw objects in the Git repository, database blobs, or EC2 disk.

### Recommended buckets

Use separate production and non-production buckets:

```text
buizz-prod-public-media-<account-id>
buizz-prod-private-documents-<account-id>
buizz-prod-private-tickets-<account-id>
buizz-prod-deployments-<account-id>
```

Separation makes policies, deletion rules, audit, and blast radius easier to
reason about. If the absolute lowest cost is required, private documents and
tickets can be prefixes in one private bucket, but IAM must restrict prefixes.

For every bucket:

1. Enable all four S3 Block Public Access controls.
2. Use Object Ownership `Bucket owner enforced`; disable ACLs.
3. Deny requests that do not use TLS.
4. Enable default encryption.
5. Enable versioning for sensitive and deployment buckets.
6. Add lifecycle rules for noncurrent versions and incomplete multipart uploads.
7. Log important data access through CloudTrail data events selectively; these
   events cost money, so prioritize sensitive buckets.
8. Never place a secret, email address, phone number, PAN number, or user name
   in the object key.

Use opaque keys:

```text
kyc/<tenant-id>/<uuid>
tickets/<yyyy>/<mm>/<booking-uuid>/ticket.pdf
invoices/<yyyy>/<mm>/<booking-uuid>/invoice.pdf
events/<organizer-uuid>/<event-uuid>/<asset-uuid>.webp
```

The database stores the bucket, object key, content type, size, checksum,
classification, owner, status, and timestamps. It does not store a presigned
URL because that URL expires.

### Encryption decision

- Public event media: SSE-S3 is inexpensive and sufficient.
- KYC/bank documents: SSE-KMS gives stronger key-policy control and auditable
  key use. It adds request cost and key administration.
- Tickets: SSE-S3 is normally sufficient; use SSE-KMS if policy requires it.
- RDS: enable encryption when the database is created. Retrofitting it later
  requires snapshot/copy/restore work.

KMS is not a substitute for authorization. An application role permitted to
decrypt everything remains a broad risk; restrict it to required buckets and
prefixes.

---

## 4. Image upload, processing, viewing, and deletion

### Recommended upload flow

```text
Browser --> API: request upload authorization
API --> DB: verify identity, role, ownership, quota
API --> Browser: one-time object key + short-lived presigned PUT/POST
Browser --> S3: upload directly
Browser --> API: complete upload with key/checksum
API/worker: inspect, validate, scan, transform
API --> DB: mark READY
Viewer --> CloudFront: public event asset
Reviewer --> API --> short-lived signed access: private document
```

Direct browser-to-S3 uploads remove large file bodies from Node and reduce EC2
bandwidth and memory. A presigned URL is a bearer capability, so keep it short
lived, bind it to one generated key, limit content length/type, and never let
the client choose an arbitrary existing key.

### Validation requirements

The current Multer filter trusts the supplied MIME type and filename extension.
That is not enough for production. Validate:

- maximum byte size before signing and after upload
- detected file signature/magic bytes, not only `Content-Type`
- allowed dimensions and pixel count for images
- PDFs are parseable, non-encrypted if reviewers must open them, and within a
  page-count policy
- image re-encoding strips metadata and embedded payloads
- unique server-generated object key
- checksum where the client supports it
- ownership and purpose in the completion request

Use a quarantine prefix. A worker scans and validates the object, copies or
moves it to the accepted prefix, then marks the DB record `READY`. Until then,
the application must not display or process it. For the smallest launch,
virus-scanning can begin as a synchronous worker step; later use S3 event ->
SQS -> Lambda/ECS scanner.

### Public viewing

Deliver accepted event images through CloudFront with an S3 Origin Access
Control. Keep the bucket private. Set immutable cache headers on content-addressed
object keys:

```http
Cache-Control: public, max-age=31536000, immutable
```

Changing an image creates a new key, so invalidations are rarely needed.
Generate WebP/AVIF and a few fixed sizes rather than dynamically transforming
every request. Cloudinary remains a valid alternative when its transformation,
moderation, and delivery features save more engineering time than S3 costs.
Avoid running both indefinitely; select one source of truth.

### Private viewing

For KYC:

1. Reviewer requests `GET /api/v1/kyc/documents/:id/access`.
2. API authenticates the session and checks explicit permission and case scope.
3. API records an audit event.
4. API returns a 60-300 second S3 presigned GET URL, or streams the object.
5. Response uses `Cache-Control: private, no-store` and safe
   `Content-Disposition`.

Never expose a permanent Cloudinary/S3 KYC URL in API payloads. Do not log
signed URLs because their query string contains temporary credentials.

### Deletion

Use soft deletion in the database followed by an idempotent asynchronous object
delete. Record who requested deletion and why. Lifecycle rules are a safety net,
not the business deletion workflow. Legal/tax retention must override ordinary
user deletion only where applicable and documented.

---

## 5. Ticket, QR, and invoice generation

The repository already generates PDFs in memory using PDFKit and QR codes using
`qrcode`. That is a good implementation choice. The unsafe part is durability:
the PDF worker writes to `server/storage/pdfs`, may upload to Cloudinary, and
returns a public-looking local path. Local disk disappears during replacement
and cannot support multiple instances.

### Production workflow

```text
Payment provider callback
  --> verify signature and amount
  --> one database transaction:
        confirm booking
        allocate inventory
        create artifact job/outbox row
  --> return success promptly

Worker
  --> atomically claim job
  --> generate deterministic QR token and PDF
  --> upload private object to S3
  --> save object key, checksum, version, generated_at
  --> enqueue email/WhatsApp delivery
  --> mark job completed
```

The payment callback must not wait for PDF generation, WhatsApp, or email.
Booking confirmation is the source of truth; delivery is retried independently.

### Idempotency

Payment webhooks and queues can deliver more than once. Enforce:

- unique provider transaction/order identifier
- unique booking confirmation transition
- unique artifact job key such as `ticket:<booking-id>:v1`
- stable S3 key per artifact version
- conditional DB updates
- worker-safe retries

If the same job runs twice, the result must be the same valid ticket, not two
bookings or two inventory decrements.

### Secure QR content

Do not encode customer PII, sequential database IDs, price, or authorization
claims directly in the QR. Encode an opaque random ticket token. At check-in:

1. authenticate the organizer/scanner
2. hash the presented token and find the ticket
3. verify event, venue, time window, status, and scanner permission
4. atomically change `VALID` to `CHECKED_IN`
5. return a minimal result

Use a unique constraint or atomic update so two scanners cannot check in the
same ticket simultaneously. Offline check-in requires a separately designed,
signed manifest and later conflict reconciliation; it must not be simulated by
disabling server verification.

### Suggested artifact schema

```sql
CREATE TABLE booking_artifacts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  artifact_type ENUM('TICKET','INVOICE','QR') NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('PENDING','PROCESSING','READY','FAILED') NOT NULL DEFAULT 'PENDING',
  bucket_name VARCHAR(255) NULL,
  object_key VARCHAR(1024) NULL,
  sha256 CHAR(64) NULL,
  content_type VARCHAR(100) NULL,
  size_bytes BIGINT UNSIGNED NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at DATETIME NULL,
  last_error TEXT NULL,
  generated_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_booking_artifact (booking_id, artifact_type, version),
  KEY ix_artifact_worker (status, available_at, id)
);
```

Apply schema changes through versioned migrations. Do not rely on application
startup `CREATE TABLE` statements as the long-term migration system.

---

## 6. Database production design

### Why RDS MySQL

Benefits:

- automated backups and point-in-time restore
- managed engine patching and storage
- encryption, metrics, alarms, and controlled networking
- easier resize, replica, and Multi-AZ upgrade

Costs/trade-offs:

- more expensive than MySQL on the same EC2
- no operating-system access
- maintenance and failover events still need application resilience
- Single-AZ is not highly available

The benefits dominate for bookings, payments, KYC state, and inventory.

### Network and identity

- RDS is in private subnets and is never publicly accessible.
- RDS security group accepts port 3306 only from the application security group.
- Administrators connect through SSM port forwarding or a controlled bastion,
  not by opening MySQL to an office IP forever.
- The application gets a narrowly scoped runtime IAM role for AWS services.
- Database credentials live in SSM SecureString initially.

### Initial settings

- MySQL 8 supported release
- `db.t4g.micro` only for very low usage; prefer `db.t4g.small` when imports,
  reporting, or concurrent bookings begin
- gp3 storage with storage autoscaling and an explicit maximum
- encryption enabled
- deletion protection enabled in production
- 7-14 days automated backup retention initially
- automatic minor version upgrades during a defined maintenance window
- Performance Insights/Database Insights according to current pricing
- slow query log with controlled CloudWatch retention

### Backups are not proven until restored

Set targets:

| Stage | RPO | RTO |
|---|---:|---:|
| Minimum launch | <= 24 hours business target; RDS PITR configured tighter | <= 4 hours |
| Revenue-critical | <= 5 minutes | <= 60 minutes |

RPO is acceptable data loss; RTO is acceptable recovery time. Run a quarterly
restore into an isolated database, execute integrity checks, and record actual
recovery time. A green “backup completed” icon is not a recovery test.

Take a manual snapshot before high-risk migrations. Keep forward and backward
application compatibility during rolling changes:

1. add nullable/new structures
2. deploy code that can read both forms
3. backfill
4. switch writes
5. remove old structures in a later release

### Query and schema performance

- Index foreign keys and common filter/order combinations.
- Use `EXPLAIN ANALYZE` on slow queries.
- Paginate every admin listing; never use an unbounded `limit=10000`.
- Avoid N+1 queries in bookings/events/reports.
- Keep transactions short; never call payment/email/S3 inside a DB transaction.
- Set connection pool maximum from database capacity, not EC2 enthusiasm.
- Store money in integer minor units or fixed `DECIMAL`, never floating point.
- Store timestamps in UTC and format in the user/event timezone.
- Reconcile booking inventory with database constraints and atomic operations.

RDS Proxy is not needed for one long-lived Express process. Consider it for
Lambda or severe connection spikes after measuring.

---

## 7. Queues: MySQL, SQS, Redis, and BullMQ

### Decision for Buizz now

Keep the existing MySQL notification queue and extend the pattern to PDF jobs.
Run the worker every minute through system cron, plus an optional continuously
running worker for lower latency. Use atomic claiming, lock expiry, exponential
backoff, max retries, and a failed/dead state.

Current code has a useful retry foundation, but `SELECT ... FOR UPDATE` without
`SKIP LOCKED` effectively serializes claimers. That is acceptable initially.
When adding multiple workers, use MySQL 8 `FOR UPDATE SKIP LOCKED`, or move to
SQS.

### Comparison

| Choice | Pros | Cons | Buizz decision |
|---|---|---|---|
| MySQL queue | Already available, transactional outbox, no new bill | Polling and DB load; limited queue tooling | Use now |
| Amazon SQS | Managed, durable, elastic, DLQ, no servers | At-least-once; requires idempotency; separate transaction from DB | Preferred next queue |
| BullMQ + ElastiCache | Rich Node job APIs, delayed/repeatable jobs, fast | Redis cost/operations, persistence/configuration matter | Only with proven need |
| Redis on EC2 | Cheap-looking and fast | Same-host failure, memory pressure, backup/failover burden | Never for production queue |

### When to move to SQS

Move when one or more are true:

- queue delay violates the product SLO
- workers materially affect the primary DB
- sustained thousands of jobs per hour or large event bursts
- independent worker scaling is required
- dead-letter/redrive operations are becoming important

Use an outbox relay: the booking transaction writes an `outbox_events` row; a
relay publishes it to SQS and marks it published. Consumers remain idempotent
because SQS standard queues can deliver a message more than once.

### When Redis is justified

Add managed ElastiCache, not self-hosted Redis, only after measurement shows a
need for:

- hot read caching with a defined invalidation strategy
- distributed rate limiting
- Socket.IO pub/sub across multiple application instances
- sub-second job scheduling features specifically requiring BullMQ

Do not put durable booking truth, inventory, payment state, or the only copy of
a job in a cache. Define TTL, eviction behavior, failure behavior, and cache-hit
metrics before adding Redis.

---

## 8. REST versus GraphQL

Keep REST.

REST is already implemented, maps well to resources and webhooks, is easy to
cache and observe, and keeps authorization paths explicit. GraphQL would add a
schema/runtime, resolver-level authorization, query cost controls, persisted
queries, N+1 prevention, and a new caching model. It does not automatically make
the product faster.

First improve REST:

- consistent `/api/v1` resources
- OpenAPI contract and generated types where useful
- cursor pagination for large collections
- sparse/summary endpoints for dashboards
- a purpose-built dashboard aggregation endpoint
- ETag/conditional responses for stable resources
- standardized problem/error responses

Reconsider GraphQL only if at least two materially different clients need
rapidly changing combinations of deeply related data and REST aggregation has
become a measured delivery bottleneck. If adopted, begin as a BFF over existing
services, not a rewrite.

---

## 9. Docker, ECS, and Kubernetes

### Docker

Docker is recommended in phase 2 for repeatable builds, but it is not required
for the minimum-budget first deployment.

Benefits:

- same Node/runtime/native dependencies in CI and production
- immutable image with a release identifier
- easier ECS migration and rollback
- clearer health checks and resource limits

Costs:

- image/build/security maintenance
- registry and deployment changes
- volumes and logging must be designed correctly
- Docker alone does not provide HA

Never bake `.env`, credentials, uploads, or logs into an image. Use a
multi-stage build, non-root runtime user, read-only filesystem where practical,
`.dockerignore`, pinned base-image digest, health check, and image scanning.

### ECS/Fargate

Use ECS/Fargate as the next compute platform when Buizz needs two or more
instances, independent client/API/worker scaling, or automated replacement.
Place an ALB in front, keep tasks in private subnets, store all state externally,
and use ECR. Fargate costs more than one EC2 instance but removes host patching
and simplifies scaling.

### Kubernetes/EKS

Do not use EKS now.

Kubernetes becomes rational when the organization—not merely the application—
needs a shared platform: many services, several teams, policy controllers,
custom scheduling, service mesh, standardized operators, and engineers able to
run the control/data plane. Otherwise it introduces upgrades, ingress, DNS,
autoscaling, network policy, secrets, observability, and incident complexity
without improving the product.

If ECS no longer meets a documented requirement, write an architecture decision
record comparing EKS, not a technology-preference proposal.

---

## 10. GitHub repository setup

The current remote is a GitHub repository and the active branch is
`development`. Establish:

- `main`: production
- `development`: integration/staging
- short-lived `feature/*` branches
- release tags such as `v1.4.0`

Protect `main`:

1. pull requests required
2. at least one qualified approval; two for auth/payment/infrastructure
3. dismiss stale approvals
4. required status checks
5. conversations resolved
6. no force push or deletion
7. linear history if the team uses squash merging
8. CODEOWNERS review for security-sensitive paths

Example:

```text
# .github/CODEOWNERS
/server/src/modules/auth/       @devopsbuizz
/server/src/modules/payments/   @devopsbuizz
/server/src/modules/kyc/        @devopsbuizz
/.github/workflows/             @devopsbuizz
/infra/                         @devopsbuizz
```

Create GitHub Environments:

- `staging`: deploy only from `development`
- `production`: deploy only from `main`, required reviewer, no self-approval

Enable Dependabot alerts/updates, secret scanning and push protection where the
repository plan supports them. Treat every historical secret as compromised:
remove it from current files, rotate it at the provider, then clean history if
necessary. History cleanup does not revoke a credential.

Add a root `.gitignore`; the repository currently has no root one. It must
exclude at least:

```gitignore
**/.env
**/.env.*
!**/.env.example
**/node_modules/
**/.next/
**/next-build/
server/storage/
*.log
coverage/
dist/
.terraform/
*.tfstate*
```

Before adding this file, verify whether any ignored paths are already tracked;
`.gitignore` does not untrack existing files.

---

## 11. CI pipeline

Every pull request should run:

1. checkout with minimum token permissions
2. use Node 22 and `npm ci` independently in client and server
3. validate formatting/linting after those scripts exist
4. run TypeScript checking for the client
5. run server unit/integration tests after a test suite is added
6. build the production client
7. scan dependencies and code
8. create an SBOM for releases

The repository currently has no normal test/lint scripts in the package files.
Creating those tests and gates is a release requirement, not something CI can
invent. Never configure Next.js to ignore type errors merely to get a green
deployment.

Suggested minimum checks:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [development, main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<FULL_COMMIT_SHA>
      - uses: actions/setup-node@<FULL_COMMIT_SHA>
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: |
            client/package-lock.json
            server/package-lock.json
      - run: npm ci
        working-directory: server
      - run: npm ci
        working-directory: client
      - run: npx tsc --noEmit
        working-directory: client
      - run: npm run build
        working-directory: client
```

Replace placeholders with verified action commit SHAs. Full SHA pinning makes
third-party action code immutable. Renovate/Dependabot can propose SHA updates.

Do not blindly run `npm audit fix --force`; it can introduce breaking upgrades.
Triage advisories based on reachability, runtime versus development dependency,
exploitability, and available fixed versions. Record accepted risks with owner
and expiry.

Recommended security gates:

- CodeQL for JavaScript/TypeScript
- dependency review on pull requests
- secret scanning/push protection
- lockfile review
- Semgrep or ESLint security rules where useful
- OWASP ZAP baseline against staging for major releases
- Trivy/Grype if container images are introduced
- CycloneDX SBOM retained with the release

Do not run untrusted fork pull-request code with production secrets or
`pull_request_target`.

---

## 12. Secure CI/CD to EC2

### Authentication

Use GitHub OIDC. Do not store AWS access key IDs, secret access keys, private SSH
keys, or the EC2 `.env` in GitHub.

Create an AWS IAM OIDC provider for:

```text
Provider: https://token.actions.githubusercontent.com
Audience: sts.amazonaws.com
```

The production role trust policy must constrain both repository and environment:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub":
          "repo:devopsbuizz/buizz-management-system:environment:production"
      }
    }
  }]
}
```

The assumed role should only upload to the deployment bucket and invoke a
specific SSM document against instances with tags such as
`Application=buizz,Environment=production`. It does not need database, KYC, or
payment-secret access.

### Deployment artifact

Build once and deploy that exact artifact. Do not `git pull` and build different
code on production.

Artifact contents:

- server source plus production lockfile
- client standalone/build output and required static/public files, or source
  until standalone packaging is implemented
- release metadata: commit SHA, build time, SBOM, migration identifier
- no `.env`, upload, log, cache, or `.git` files

Store it in a versioned deployment bucket with a checksum.

### EC2 release layout

```text
/srv/buizz/
  current -> /srv/buizz/releases/<commit-sha>
  releases/
    <commit-sha>/
  shared/
    server.env
    client.env
  scripts/
    deploy.sh
    rollback.sh
```

Deployment algorithm:

1. acquire a host deployment lock
2. download artifact by exact key
3. verify SHA-256
4. unpack into a new release directory
5. install production dependencies deterministically
6. load secrets from SSM into root-readable temporary files or process env
7. run backward-compatible migrations once
8. start or reload PM2 against the new release
9. check API health, client health, DB connectivity, and a smoke path
10. atomically switch `current`
11. retain the last 3-5 releases
12. on failure, switch back and reload; do not automatically reverse a
    destructive database migration

Use SSM Run Command so port 22 can remain closed. The EC2 instance profile reads
only its environment parameters, deployment objects, runtime buckets, and logs.

### Production workflow outline

```yaml
name: deploy-production
on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

concurrency:
  group: production
  cancel-in-progress: false

jobs:
  deploy:
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<FULL_COMMIT_SHA>
      - name: Build and test
        run: ./scripts/ci-build.sh
      - name: Configure short-lived AWS credentials
        uses: aws-actions/configure-aws-credentials@<FULL_COMMIT_SHA>
        with:
          role-to-assume: arn:aws:iam::<ACCOUNT_ID>:role/buizz-github-production
          aws-region: ap-south-1
      - name: Upload immutable artifact
        run: aws s3 cp "buizz-${GITHUB_SHA}.tar.gz" "s3://<DEPLOY_BUCKET>/releases/${GITHUB_SHA}.tar.gz"
      - name: Deploy through SSM
        run: ./scripts/ssm-deploy.sh "${GITHUB_SHA}"
```

Shell scripts referenced above must be committed, reviewed, linted with
ShellCheck, and fail closed. Do not paste a large mutable deployment script
inside workflow YAML.

---

## 13. Secrets and access control

Use:

- SSM Parameter Store SecureString for application secrets changed manually
- Secrets Manager when automatic rotation or cross-service secret lifecycle is
  worth its additional cost
- IAM instance/task roles instead of AWS keys in `.env`
- separate values for development, staging, and production

Suggested hierarchy:

```text
/buizz/production/server/database/url
/buizz/production/server/jwt/access-secret
/buizz/production/server/jwt/refresh-secret
/buizz/production/server/razorpay/key-secret
/buizz/production/server/phonepe/client-secret
/buizz/production/server/meta/app-secret
/buizz/production/server/smtp/password
```

Never expose secrets in `NEXT_PUBLIC_*`; those are bundled for browsers.
Frontend variables may contain public origins and public OAuth client IDs, not
provider secrets.

Access model:

- humans use IAM Identity Center, MFA, and short-lived roles
- root user has MFA, no access keys, and is not used daily
- production read and production deploy are separate permissions
- emergency/break-glass access is logged and reviewed
- quarterly access review removes stale users and roles

Rotate any database credential that has ever appeared in an example file or Git
history before production.

---

## 14. Network and edge security

Minimum-budget:

- EC2 in a public subnet with Elastic IP
- ports 80/443 from the internet
- port 22 closed when SSM works
- RDS in private subnets
- no NAT Gateway
- Nginx terminates TLS and proxies only expected paths

This saves the recurring NAT Gateway and ALB cost. The trade-off is a single
public host.

Nginx/API protections:

- TLS 1.2/1.3, HSTS after HTTPS is stable
- request body limits by route
- timeouts and upstream limits
- exact CORS allowlist; never reflect arbitrary origins with credentials
- rate limits on login, signup, OTP, password reset, support, upload signing,
  checkout, and webhook endpoints
- webhook signature validation and replay protection
- secure, HttpOnly, SameSite cookies where cookies are used
- CSRF protection for cookie-authenticated state changes
- CSP appropriate to payment/OAuth providers
- no sensitive values in errors or logs

Add AWS WAF only when CloudFront/ALB fronts the relevant application traffic and
the attack/risk justifies the fixed and request costs. Application authorization
remains mandatory behind WAF.

---

## 15. Observability and incident response

### Logs

Emit structured JSON with:

- UTC timestamp
- level and service
- environment and release SHA
- request/correlation ID
- route, method, status, duration
- safe user/organizer identifier where justified
- queue job ID and attempt
- provider request ID

Never log passwords, OTPs, JWTs, cookies, authorization headers, presigned URLs,
KYC content, full payment payloads, PAN/Aadhaar, or complete phone/email data.

Send Nginx, PM2/application, deployment, and cron logs to CloudWatch. Start with
14-30 day retention, then export/extend only what compliance or investigations
need. Unlimited log retention is a cost leak.

### Metrics and alarms

At minimum:

- website/API synthetic health
- EC2 CPU, memory, disk, inode usage
- process restarts and unhealthy PM2 process
- API 5xx count/rate and p95 latency
- RDS CPU, free storage, connections, latency, deadlocks
- queue depth, oldest job age, failures, retry exhaustion
- booking/payment success and reconciliation mismatch
- PDF generation failures
- email/WhatsApp delivery failures
- KYC approval error rate
- S3 access denied and upload validation failures

Alarm on symptoms users feel, not only infrastructure. Queue oldest age is more
useful than queue row count alone.

Create dashboards for product health, application health, dependency health,
and cost. Route critical alarms to at least two people through SNS/email/ChatOps.

### SLO starting points

After collecting a baseline:

- public/API monthly availability: 99.5% minimum-stage target
- authenticated read p95: under 500 ms excluding third-party calls
- checkout internal p95: under 1 second excluding payment UI/provider
- 95% of ticket artifacts ready within 60 seconds
- notification queue oldest age under 5 minutes

Do not promise an SLO without monitoring it and reserving an error budget.

### Incident process

For each incident:

1. name incident commander
2. protect users and data first
3. preserve evidence and timestamps
4. communicate impact and next update time
5. mitigate/rollback
6. verify recovery and reconcile payments/bookings
7. write a blameless post-incident review with assigned actions

Maintain runbooks for expired TLS, bad deploy, full disk, database saturation,
payment webhook outage, queue backlog, compromised secret, and accidental
document exposure.

---

## 16. Performance optimization order

Optimize from measurement, in this order:

1. correctness and database indexes
2. remove unnecessary requests and N+1 queries
3. pagination and response shaping
4. CDN and browser caching for public assets
5. direct-to-S3 uploads
6. asynchronous provider calls and PDF generation
7. process/connection tuning
8. caching with Redis only when a stable hot-read pattern is proven
9. horizontal scaling

### Client

- Analyze the Next.js bundle and lazy-load seat-map/chart/QR scanner libraries.
- Use route-level code splitting and avoid importing admin-only libraries into
  public routes.
- Serve versioned static assets with long cache lifetimes.
- Optimize event images at upload time; do not send originals to listing cards.
- Avoid autoplay loading video on login; provide a small poster/fallback.
- Use React Query caching deliberately and invalidate after mutations.
- Prevent redirect loops by having one authoritative auth hydration state.
- Do not request 100 support records on every dashboard page.

### API

- Keep compression for compressible JSON, not already compressed media.
- Add request IDs and timing.
- Apply per-route body limits.
- Use timeouts and retry only safe/idempotent provider operations with jitter.
- Use circuit-breaking behavior for optional email/WhatsApp dependencies.
- Cache static catalogs in-process initially; accept cold cache after restart.
- Never cache permission decisions longer than their safe revocation window.

### Socket.IO

One EC2 process needs no Redis adapter. With multiple API instances, use sticky
sessions as required by the transport and a supported shared adapter, commonly
Redis. That scaling event is a valid reason to add ElastiCache.

---

## 17. Cost plan

### Minimum responsible production

Recurring cost drivers:

- one EC2 instance and EBS volume
- one Single-AZ RDS instance and storage/backups
- public IPv4 address
- Route 53 hosted zone and queries
- S3 storage/requests
- CloudFront transfer/requests when enabled
- CloudWatch ingestion/retention
- email/SMS/WhatsApp provider usage

Avoid:

- NAT Gateway at this stage
- always-on staging identical to production
- EKS
- ElastiCache without a measured requirement
- ALB until HA/horizontal scaling is adopted
- indefinite log/snapshot/object versions
- cross-region traffic by placing primary services in the same region

Cost controls:

1. Create AWS Budgets alerts at 50%, 80%, 100%, and forecasted 100%.
2. Enable Cost Explorer and cost allocation tags.
3. Tag `Application`, `Environment`, `Owner`, `CostCenter`, and `ManagedBy`.
4. Set CloudWatch log retention explicitly.
5. Use S3 lifecycle and abort incomplete multipart uploads.
6. Set RDS storage autoscaling maximum.
7. Review unattached EBS volumes, old snapshots, Elastic IPs, and stale artifacts.
8. Schedule non-production compute off-hours where safe.
9. After 2-3 months of stable utilization, evaluate Compute Savings Plans and
   RDS Reserved Instances. Do not commit before measuring.

Use separate AWS accounts for production and non-production when governance
allows. This improves isolation and cost visibility. AWS Organizations itself
does not require Kubernetes-scale complexity.

### Cost versus reliability switches

| Upgrade | Benefit | Cost impact | Trigger |
|---|---|---|---|
| RDS Multi-AZ | managed DB failover | substantial DB increase | downtime/revenue demands it |
| ALB + 2 ECS tasks | app HA and scaling | ALB + duplicate compute/NAT design | app host outage is unacceptable |
| SQS workers | elastic durable jobs | low usage-based cost + engineering | MySQL queue becomes bottleneck |
| ElastiCache | distributed cache/pubsub | always-on nodes | measured latency/scale need |
| CloudFront | cache, TLS edge, lower origin load | request/transfer charges | public media/traffic grows |
| WAF | managed edge filtering | fixed + rule/request cost | risk/attack volume justifies it |

---

## 18. Security and compliance checklist

Before handling real KYC and payments:

- document data inventory, purpose, owner, retention, and deletion
- obtain legal guidance for Indian privacy, identity/KYC, financial, invoice,
  and breach obligations
- minimize collection; do not collect a document merely because the UI can
- mask sensitive identifiers in normal UI
- enforce role and object-level authorization server-side
- record KYC view/approval/rejection audit events
- require step-up authentication for sensitive admin operations
- separate super-admin support read access from KYC document read access
- reconcile role claims against current DB state; do not trust stale client role
- protect OTP endpoints with expiry, attempt limit, resend cooldown, and rate
  limits; a six-digit or stronger OTP is standard—three digits has only 1,000
  possibilities and is not production-safe
- verify payment webhook signatures, amounts, currency, order, and replay state
- never store card data
- test backup restoration
- define vulnerability triage and patch SLAs
- conduct an external penetration test before a major public/payment launch

Suggested vulnerability SLAs:

| Severity | Triage | Remediation target |
|---|---:|---:|
| Critical exploitable | same day | 24-72 hours |
| High exploitable | 2 business days | 7-14 days |
| Medium | 1 week | 30-60 days |
| Low | planned | 90 days or accepted risk |

These are operational targets, not compliance guarantees.

---

## 19. Infrastructure as code

Use Terraform for:

- VPC, subnets, routing, security groups
- EC2 role/profile and SSM
- RDS subnet group, parameter group, instance
- S3 buckets, encryption, lifecycle, policies
- CloudFront/OAC
- IAM OIDC provider and deployment roles
- CloudWatch log groups, dashboards, alarms
- budgets and notifications where supported

Recommended layout:

```text
infra/
  modules/
    network/
    database/
    compute/
    storage/
    observability/
    github-oidc/
  environments/
    staging/
    production/
```

Use a remote encrypted S3 Terraform state bucket with versioning and state
locking supported by the chosen Terraform version/backend. The CI plan job may
run on pull requests; apply requires the protected production environment and
human approval. Do not put database/application secrets into Terraform values
if that would persist them in state.

Run `terraform fmt`, `validate`, a linter, and a security scanner in CI. Review
the plan as carefully as application code.

---

## 20. Environments and release management

Minimum:

- local development
- staging with separate database, buckets, provider test credentials, and OAuth
  redirect URLs
- production

Never point staging at the production database or buckets. An economical staging
environment may use a smaller/scheduled EC2 and database, but it must preserve
isolation and production-like configuration.

Release process:

1. issue has acceptance criteria and risk level
2. implementation includes migration, tests, telemetry, and rollback
3. pull request passes required checks/review
4. deploy to staging and run smoke/regression/payment sandbox checks
5. approve production change
6. deploy immutable artifact
7. observe health and business metrics
8. record release and close change

For high-risk auth, KYC, booking, inventory, or payment changes, use feature
flags and a gradual rollout. Flags need owners and deletion dates; stale flags
become permanent complexity.

---

## 21. Delivery roadmap

### Phase 0 — stop known risks (days 1-3)

- Rotate every exposed or possibly exposed credential.
- Add and verify `.gitignore`; audit tracked environment/storage files.
- Establish `main` protection and production GitHub Environment.
- Define backup, RPO/RTO, owners, and an incident contact.
- Keep production traffic off until auth/payment critical paths pass smoke tests.

### Phase 1 — minimum production platform (week 1)

- Deploy EC2/Nginx/PM2 and private encrypted RDS from the companion runbook.
- Enable SSM; close SSH.
- Set CloudWatch retention/alarms and AWS Budgets.
- Put secrets in SSM.
- Configure automated backups and perform the first test restore.

### Phase 2 — durable object storage (weeks 1-2)

- Implement S3 storage adapter and metadata schema.
- Migrate KYC/bank documents first to private S3.
- Add authorized short-lived document access and audit.
- Move ticket/invoice/QR artifacts to private S3.
- Move event media to S3 + CloudFront OAC.
- Remove public local `/storage/pdfs` and `/storage/qrcodes` dependence.

### Phase 3 — queue consistency (week 2)

- Use the MySQL job/outbox pattern for PDF generation.
- Make payment, booking, artifact, and notification paths idempotent.
- Add queue age/failure metrics and a dead-job admin operation.
- Remove BullMQ/Redis packages if no live path needs them.

### Phase 4 — secure delivery (weeks 2-3)

- Add CI checks and baseline test suites.
- Create OIDC deployment role and SSM deployment scripts.
- Deploy immutable artifacts with atomic rollback.
- Add CodeQL, dependency/secret scanning, SBOM, and release evidence.

### Phase 5 — readiness and load testing (weeks 3-4)

- Test expected event-release burst, checkout concurrency, upload limits, and QR
  check-in contention.
- Run restore, rollback, provider outage, and queue backlog drills.
- Penetration test the externally reachable application.
- Set SLOs from measured baselines.

### Phase 6 — scale only on evidence

- SQS when database queue pressure appears.
- ElastiCache when distributed pub/sub/cache is measured.
- ECS/Fargate + ALB and Multi-AZ RDS when availability requires it.
- Kubernetes and GraphQL remain rejected until an ADR demonstrates a real need.

---

## 22. Definition of done for production

Production is ready only when:

- no secrets or user uploads are tracked by Git
- all exposed credentials are rotated
- production build, type checks, tests, and security gates pass
- RDS is private, encrypted, backed up, alarmed, and restore-tested
- KYC/bank/ticket data is private and access-authorized
- public S3 access is blocked
- payment and queue handlers are idempotent
- health checks verify meaningful dependencies without leaking information
- deploy uses OIDC/SSM and has a tested rollback
- logs exclude credentials and PII
- dashboards and actionable alarms exist
- support/admin roles are tested for both allowed and forbidden actions
- incident, backup, restore, and release runbooks have named owners
- staging smoke tests cover signup/login/OTP, KYC, event creation, booking,
  payment callback, PDF/QR generation, delivery, check-in, refund, and admin
  review

---

## 23. Architecture decision records

Store short ADRs under `docs/adr/`. Each records context, options, decision,
consequences, owner, and review date.

Initial ADRs:

```text
0001-modular-monolith.md
0002-rds-mysql.md
0003-s3-storage-classification.md
0004-mysql-queue-then-sqs.md
0005-no-redis-initially.md
0006-no-kubernetes.md
0007-rest-not-graphql.md
0008-github-oidc-ssm-delivery.md
```

Review rejected technologies when their trigger changes, not on a calendar just
to chase industry fashion.

---

## 24. Official references

- AWS S3 presigned URLs:
  https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- AWS S3 Block Public Access:
  https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- CloudFront Origin Access Control:
  https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- CloudFront signed URLs:
  https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html
- RDS automated backups:
  https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html
- RDS for MySQL:
  https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html
- SQS at-least-once delivery:
  https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html
- AWS Systems Manager Run Command:
  https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command.html
- GitHub OIDC with AWS:
  https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- GitHub secure use of Actions:
  https://docs.github.com/en/actions/reference/security/secure-use
- GitHub deployment environments:
  https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub secret scanning:
  https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning
