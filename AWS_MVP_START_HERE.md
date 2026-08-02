# Buizz Phase 1 AWS MVP: Start Here

This is the execution order for the selected Phase 1 architecture:

- One EC2 instance for the Next.js client, main API, admin API, Nginx, and a
  continuously running BullMQ worker container.
- One private Single-AZ RDS MySQL instance.
- One private single-node ElastiCache for Valkey deployment for BullMQ.
- Three private S3 buckets: public media, KYC/bank documents, and tickets.
- CloudFront in front of the public-media bucket using Origin Access Control.
- Terraform for infrastructure.
- GitHub Actions with AWS OIDC for verification and deployment.

This topology is suitable for learning, launch, and early traffic. It is not
high availability: an EC2 or Single-AZ RDS interruption can cause downtime.

## 0. Stop conditions

Do not run `terraform apply` until all of these are true:

- The AWS account has MFA, billing alerts, and an administrator identity.
- The current Free Tier/credit eligibility is visible in AWS Billing.
- Production database, JWT, payment, SMTP, Meta, and OAuth secrets are not in
  Git or Terraform variables.
- The Terraform plan has been reviewed line by line.
- A database migration and rollback plan exists.

AWS Free Tier is an allowance/credit program, not a guarantee of a zero bill.
RDS, public IPv4, Route 53, data transfer, EBS, CloudFront, snapshots, logs, and
resources left running can generate charges.

## 1. Secure the AWS account first

1. Create or sign in to the AWS account.
2. Enable MFA on the root user.
3. Do not create root access keys.
4. Create an administrative user in IAM Identity Center for daily work.
5. Select `ap-south-1` (Mumbai) as the working region.
6. In **Billing and Cost Management**:
   - Enable Free Tier usage alerts.
   - Create a monthly AWS Budget for a small amount you can afford.
   - Add alerts at 50%, 85%, and 100%.
   - Create a zero-spend or low-spend notification where available.
7. Record the AWS account ID, but never store credentials in the repository.

Cost gate: finish the billing alerts before creating EC2 or RDS.

## 2. Prepare GitHub

Repository:

```text
devopsbuizz/buizz-management-system
```

1. Confirm the complete project is on `main`.
2. Protect `main`.
3. Require pull requests and successful checks.
4. Create a GitHub Environment named `production`.
5. Add manual approval to the production environment.
6. Do not add `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`.

GitHub will use OpenID Connect to assume a narrowly scoped AWS deployment role.

## 3. Prepare the local workstation

Install:

- Git
- Node.js 22 LTS and npm 10+
- Docker Desktop
- AWS CLI v2
- Terraform 1.10 or newer

Verify:

```powershell
git --version
node --version
npm --version
docker version
aws --version
terraform version
```

Authenticate with temporary credentials:

```powershell
aws login
aws sts get-caller-identity
aws configure set region ap-south-1
aws configure set output json
```

The account returned by `get-caller-identity` must be the intended deployment
account.

## 4. Verify the project before AWS

From `D:\buizz_management_system`:

```powershell
Set-Location D:\buizz_management_system

Set-Location client
npm ci
npm run build

Set-Location ..\server
npm ci
node --check server.js

Set-Location ..\admin
npm ci
npm run build
node --check server.js

Set-Location ..
```

Do not deploy if any command fails.

The production examples must contain placeholders only:

```text
server/.env.production.example
admin/.env.production.example
```

If a real credential was ever committed, removing it from the latest file is
not enough. Rotate it in the source system because it remains in Git history.

## 5. Final MVP network design

Terraform should create:

```text
VPC 10.30.0.0/16
|
+-- Public subnet A: EC2
|   +-- inbound 80/443
|   +-- no inbound SSH
|   +-- administration through Systems Manager
|
+-- Private database subnet A: RDS
+-- Private database subnet B: RDS subnet-group requirement
    +-- MySQL 3306 allowed only from the EC2 security group
```

Supporting resources:

- EC2 IAM role with Systems Manager, S3 object access, and deployment access.
- Three encrypted, private S3 buckets with public access blocked.
- CloudFront Origin Access Control for public media.
- ECR repositories if GitHub builds immutable Docker images.
- GitHub OIDC provider and deployment role.
- Systems Manager Parameter Store values for runtime configuration.
- A private ElastiCache subnet group and security group that accepts TLS
  connections only from the application security group.

Do not create a NAT Gateway for this MVP. It is a common unexpected fixed cost.
The EC2 instance remains in a public subnet, while RDS remains private.

### BullMQ decision

BullMQ is the application queue. ElastiCache for Valkey is its Redis-compatible
managed data store. Use it for email, WhatsApp, ticket/PDF, booking follow-up,
and other background jobs.

This is not permanently free infrastructure:

- BullMQ itself is free and open source.
- ElastiCache usage consumes AWS Free Tier credits for accounts created after
  July 15, 2025.
- Legacy accounts may receive 750 hours of an eligible `cache.t3.micro` for up
  to 12 months.
- After the allowance or credits expire, ElastiCache is billed.

Use a node class shown as eligible in the account's **Explore AWS** page; never
assume eligibility from this document.

## 6. Create a secure Terraform backend

Terraform state can contain sensitive infrastructure data. Use a dedicated S3
state bucket with:

- Block Public Access enabled.
- Versioning enabled.
- Server-side encryption enabled.
- A separate prefix for production.
- Native S3 state locking (`use_lockfile = true`).

Create the state bucket once, separately from the main stack. Give it a globally
unique name such as:

```text
buizz-terraform-state-<aws-account-id>-ap-south-1
```

The backend configuration should follow this shape:

```hcl
terraform {
  backend "s3" {
    bucket       = "buizz-terraform-state-<account-id>-ap-south-1"
    key          = "buizz/prod/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

Never commit `.tfstate`, `.tfstate.backup`, `.terraform/`, or secret tfvars.

## 7. Review Terraform variables

Use non-secret variables for:

```text
aws_region          = "ap-south-1"
environment         = "prod"
github_repository   = "devopsbuizz/buizz-management-system"
instance_type       = "<confirm Free Tier eligibility in this account>"
db_instance_class   = "<confirm Free Tier eligibility in this account>"
database_name       = "buizz"
```

Recommended starting sizes:

- Learning/very-low traffic: eligible micro EC2 and RDS classes.
- Real launch: measure memory first. Three Node.js processes plus Nginx may be
  too large for a 1 GiB EC2 instance.
- Add a 2 GiB swap file on a micro EC2 instance, but treat swap as protection
  from crashes, not as additional performance.

Do not pass database passwords or application secrets through Terraform command
line variables.

## 8. Plan infrastructure

Run from the Terraform MVP directory:

```powershell
terraform fmt -recursive
terraform init
terraform validate
terraform plan -out mvp.tfplan
terraform show mvp.tfplan
```

Review for:

- Only one EC2 and one Single-AZ RDS instance.
- No NAT Gateway.
- No load balancer.
- Only one eligible ElastiCache node for the MVP.
- RDS is not publicly accessible.
- ElastiCache is not publicly accessible.
- No SSH port 22 ingress.
- S3 public access is blocked.
- EC2 has IMDSv2 required.
- Storage is encrypted.
- RDS deletion protection and automated backups are enabled.
- CloudFront reads public media using Origin Access Control.

Save the plan only locally and do not commit it.

## 9. Apply infrastructure

This step can create billable resources:

```powershell
terraform apply mvp.tfplan
```

Record these outputs:

```text
EC2 instance ID
EC2 public IP
RDS endpoint
RDS master secret ARN
ElastiCache primary endpoint and port
S3 bucket names
CloudFront domain
GitHub deployment role ARN
ECR repository URLs, if used
```

Confirm the EC2 instance appears as **Online** in Systems Manager Fleet Manager.
Do not continue if Systems Manager cannot manage the instance.

## 10. Initialize RDS safely

Do not expose RDS publicly.

Connect through the EC2 instance using Systems Manager. Retrieve the
AWS-managed RDS master credential only for initial administration. Then:

1. Create a separate `buizz_app` MySQL user.
2. Grant it only the permissions required by the application database.
3. Store the app credential in Parameter Store as a SecureString.
4. Import a reviewed schema.
5. Never import `test_data.sql` into production.
6. Run migrations in a documented order.
7. Take an RDS snapshot before importing existing production data.

For a fresh database, first review:

```text
server/database/buizz_fresh_restore_schema.sql
server/database/schema_complete.sql
server/database/complete_database_all_tables.sql
```

These files overlap. Do not execute all of them blindly. Generate one clean,
versioned baseline after comparing them with the current production schema.

## 10A. Configure ElastiCache and BullMQ

Provision ElastiCache for Valkey in private subnets:

- Cluster mode disabled for the initial BullMQ deployment.
- One node for the cost-controlled MVP.
- In-transit encryption enabled.
- At-rest encryption enabled.
- Authentication enabled.
- Security-group ingress only from the EC2 application security group.
- No public access.
- `maxmemory-policy` set to `noeviction`; BullMQ cannot safely use a cache that
  arbitrarily evicts queue keys.

Store the connection details as SecureStrings. The application configuration
should use a TLS URL similar to:

```text
REDIS_URL=rediss://default:<auth-token>@<elasticache-endpoint>:6379
```

The API containers produce jobs. A separate continuously running worker
container consumes them. Use deterministic job IDs and idempotent processors so
retries cannot send duplicate tickets, payments, emails, or WhatsApp messages.

Recommended queues:

```text
booking-confirmed
email
whatsapp
pdf-generation
ticket-generation
notifications
```

Configure:

- Bounded retry attempts.
- Exponential backoff.
- Dead-letter handling through a failed-job retention process.
- Graceful shutdown so workers finish or release active jobs.
- QueueEvents monitoring.
- Retention limits for completed and failed jobs.

A single-node cache can still fail and is not highly available. Before large
paid traffic, add replication/Multi-AZ or reconsider Amazon SQS for the most
durable payment and booking workflows.

## 11. Configure S3 and CloudFront

Bucket responsibilities:

| Bucket | Access | Content |
|---|---|---|
| Public media | Private S3, CloudFront read | Event images and public assets |
| Private documents | Private authenticated access | KYC and bank documents |
| Tickets | Private authenticated access | Ticket and invoice PDFs |

Rules:

- Never make any bucket public.
- Use CloudFront only for public media.
- Use short-lived signed URLs or authenticated API streaming for KYC and
  tickets.
- Enable versioning on private documents and tickets.
- Use lifecycle rules for old non-current versions after confirming retention
  requirements.
- Use the EC2 IAM role; do not place AWS keys in application environment files.

Set the CloudFront URL as the public media base URL in the API runtime
configuration.

## 12. Store runtime configuration

Create two SecureString parameters:

```text
/buizz/prod/server-env
/buizz/prod/admin-env
```

Store production environment-file content in them. At minimum configure:

```text
NODE_ENV=production
MYSQL_HOST=<private-rds-endpoint>
MYSQL_PORT=3306
MYSQL_DATABASE=buizz
MYSQL_USER=buizz_app
MYSQL_PASSWORD=<secret>
JWT_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<different-long-random-secret>
FRONTEND_URL=https://www.buizz.com
BACKEND_URL=https://api.buizz.com
CORS_ORIGINS=https://buizz.com,https://www.buizz.com
DISABLE_REDIS=false
REDIS_DISABLED=false
REDIS_URL=<load-rediss-url-from-parameter-store>
```

Also configure:

- S3 bucket names and `AWS_REGION=ap-south-1`.
- SMTP/SES sender `contact@buizz.com`.
- Google and Meta identifiers/secrets.
- PhonePe and Razorpay production credentials and callbacks.
- WhatsApp/Interakt credentials.

Use the same JWT secrets where the main and admin APIs intentionally share
tokens. Never print SecureString values in GitHub Actions logs.

## 13. Configure GitHub OIDC deployment

The Terraform trust policy must permit only:

```text
repo:devopsbuizz/buizz-management-system:ref:refs/heads/main
repo:devopsbuizz/buizz-management-system:environment:production
```

Add these GitHub Environment variables:

```text
AWS_REGION=ap-south-1
AWS_DEPLOY_ROLE_ARN=<terraform output>
AWS_PRODUCTION_INSTANCE_ID=<terraform output>
```

Add public frontend build identifiers as variables, not secrets:

```text
NEXT_PUBLIC_API_BASE_URL=https://api.buizz.com/api/v1
NEXT_PUBLIC_SOCKET_URL=https://api.buizz.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<id>
NEXT_PUBLIC_FACEBOOK_APP_ID=<id>
NEXT_PUBLIC_FACEBOOK_LOGIN_CONFIG_ID=<id>
```

The workflow should:

1. Check out the exact commit.
2. Run `npm ci`, type checks, and production builds.
3. Build immutable images in GitHub, not on the small EC2 instance.
4. Scan dependencies and container images.
5. Push commit-SHA-tagged images to ECR.
6. Assume AWS permissions through OIDC.
7. Deploy through Systems Manager.
8. Wait for health checks.
9. Keep the previous image tag for rollback.

## 14. Configure EC2 runtime

On first boot, install:

- Docker Engine and Compose plugin.
- Nginx.
- AWS CLI and Systems Manager agent if the chosen AMI does not include them.
- Certbot only if TLS terminates directly on Nginx.

Run services only on loopback:

```text
127.0.0.1:3000 -> Next.js
127.0.0.1:5000 -> main API
127.0.0.1:5001 -> admin API
```

Expose only Nginx on ports 80 and 443. Configure:

- WebSocket proxying for Socket.IO.
- Upload size limits.
- Strict rate limiting on login, OTP, password reset, and payment callbacks.
- Rotated container logs.
- Health checks and automatic restart.

Run one BullMQ worker container continuously. It should restart automatically,
report health separately from the API, and use queue-specific concurrency
limits. Do not run the old MySQL notification cron after the BullMQ cutover.

## 15. Configure DNS and HTTPS

At the current DNS provider, create:

```text
buizz.com          -> EC2 public address
www.buizz.com      -> EC2 public address
api.buizz.com      -> EC2 public address
admin-api.buizz.com -> EC2 public address, if used separately
```

A normal EC2 public IP can change after stop/start. Use an Elastic IP only after
checking its current price, or automate DNS updates.

For the MVP, terminate HTTPS at Nginx with Let's Encrypt. Redirect all HTTP to
HTTPS. Test certificate renewal.

CloudFront uses its own AWS-managed HTTPS domain until a custom media domain is
added. A custom CloudFront certificate must be requested in `us-east-1`.

## 16. Configure external callback URLs

Update external providers only after HTTPS works:

```text
Google callback:
https://www.buizz.com/auth/google/callback

Facebook callback:
https://www.buizz.com/auth/facebook/callback

PhonePe callback:
https://api.buizz.com/api/v1/payments/phonepe/callback

Frontend payment return:
https://www.buizz.com/payment/callback
```

Configure Meta’s valid OAuth redirect URI with the exact scheme, hostname,
path, and trailing-slash behavior used by the application.

## 17. First deployment

1. Merge the reviewed change to `main`.
2. Open **GitHub -> Actions**.
3. Run the production workflow manually for the first release.
4. Approve the protected `production` environment.
5. Watch verification, image build, image push, deployment, and health checks.
6. Do not change DNS until direct health checks pass.

Required checks:

```text
GET client health endpoint -> 200
GET https://api.buizz.com/health -> 200
GET admin API health endpoint -> 200
```

## 18. Production acceptance tests

Test with new accounts and non-production payment amounts:

- Customer email/password login and profile navigation.
- Customer phone OTP login and email fallback.
- Organizer signup, email/phone verification, address proof, KYC, and bank
  documents.
- Super-admin KYC/bank approval and immediate organizer status refresh.
- Event creation, approval, publication, and all event status filters.
- Online and offline booking.
- Booking totals and payment states.
- Ticket PDF creation, S3 storage, signed download, and QR validation.
- Support access and super-admin permissions.
- Google and Facebook login.
- PhonePe/Razorpay webhook signature verification.
- Email and WhatsApp notification processing.

Use browser Network tools to confirm there are no requests to localhost.

## 19. Backups, monitoring, and rollback

Minimum controls:

- RDS automated backups for seven days.
- A manual snapshot before every schema migration.
- S3 versioning for private documents and tickets.
- CloudWatch alarms for EC2 CPU/status, disk usage, memory agent metrics, and
  RDS CPU, storage, connections, and free memory.
- Application alerts for 5xx rates, payment webhook failures, OTP failures, and
  BullMQ failed/stalled jobs and queue depth.
- Monthly restore test.

Rollback:

1. Redeploy the previous commit-SHA image.
2. Run health checks.
3. Roll back database changes only with a tested backward migration or snapshot.
4. Never run `terraform destroy` as an application rollback.

## 20. Daily deployment process

```text
feature branch
-> pull request
-> automated checks
-> review
-> merge to main
-> production approval
-> immutable deployment
-> health checks
-> smoke tests
-> monitor
```

Do not edit production source directly on EC2.

## 21. When to upgrade Phase 1

Move to the high-availability architecture when paid bookings make downtime
unacceptable or metrics show resource pressure:

```text
CloudFront/WAF
-> Application Load Balancer
-> ECS Fargate with at least two tasks
-> RDS Multi-AZ or Aurora
-> replicated/Multi-AZ ElastiCache for BullMQ
-> or SQS for workflows requiring AWS-native queue durability
```

For Phase 1:

- Use Docker, but not Kubernetes.
- Use BullMQ with private ElastiCache for Valkey.
- Keep the worker in a separate container.
- Keep REST; GraphQL is not needed for deployment or scaling.

## Official references

- AWS account root-user security:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html
- AWS IAM security best practices:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- Systems Manager instance role:
  https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html
- Terraform backend guidance:
  https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/backend.html
- AWS Free Tier:
  https://aws.amazon.com/free/
