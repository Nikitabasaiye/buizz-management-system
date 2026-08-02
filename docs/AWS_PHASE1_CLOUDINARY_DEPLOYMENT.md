# Buizz Phase 1 AWS deployment runbook

This runbook matches the code in this repository. It deploys the Next.js client,
Express API, admin API, BullMQ worker, and Nginx to one EC2 instance. MySQL runs
in private RDS, BullMQ uses private ElastiCache for Valkey, deployment images are
stored in ECR, and secrets are rendered from SSM Parameter Store. Cloudinary is
the temporary production media provider while AWS verifies CloudFront.

## 1. Architecture and responsibility

```text
GitHub main
  -> GitHub Actions (OIDC; no AWS access keys)
  -> ECR immutable images tagged with commit SHA
  -> Systems Manager Run Command
  -> EC2 Docker Compose
       - Nginx :80/:443
       - client :3000
       - api :5000
       - admin-api :5001
       - worker :9090 health endpoint

API/worker -> private RDS MySQL
API/worker -> private ElastiCache Valkey -> BullMQ
API/worker -> Cloudinary
EC2 -> SSM Parameter Store
```

Cloudinary classifications:

| Data | Delivery |
|---|---|
| Event images, profile/organizer images | Public Cloudinary CDN URL |
| KYC, address and bank proof | Authenticated asset through authorized API proxy |
| Support attachments | Authenticated asset |
| Ticket and invoice PDF | Authenticated, signed delivery URL |

Never upload KYC, bank documents, or tickets as ordinary public assets.

## 2. Cloudinary account setup

1. Create or select the Buizz product environment in Cloudinary.
2. Open **Settings -> API Keys** and create a dedicated production API key.
3. Record `Cloud name`, `API key`, and `API secret` in a password manager.
4. Do not use an unsigned upload preset.
5. If PDF delivery is restricted in Cloudinary security settings, enable PDF delivery.
6. Never add the API secret to GitHub, Terraform variables, client code, or a
   `NEXT_PUBLIC_*` variable.

## 3. Store production configuration in SSM

In `ap-south-1`, use **SecureString** for credentials and **String** for flags.
Create these server `String` parameters:

```text
/buizz/production/server/NODE_ENV=production
/buizz/production/server/PORT=5000
/buizz/production/server/BASE_URL=https://api.buizz.com
/buizz/production/server/BACKEND_URL=https://api.buizz.com
/buizz/production/server/FRONTEND_URL=https://www.buizz.com
/buizz/production/server/ADMIN_FRONTEND_URL=https://admin.buizz.com
/buizz/production/server/CORS_ORIGINS=https://www.buizz.com,https://buizz.com,https://admin.buizz.com
/buizz/production/server/QUEUE_PROVIDER=bullmq
/buizz/production/server/REDIS_DISABLED=false
/buizz/production/server/DISABLE_REDIS=false
/buizz/production/server/REDIS_TLS=true
/buizz/production/server/REDIS_TLS_REJECT_UNAUTHORIZED=true
/buizz/production/server/BULLMQ_PREFIX=buizz
/buizz/production/server/MEDIA_STORAGE_PROVIDER=cloudinary
/buizz/production/server/CLOUDINARY_REQUIRED=true
/buizz/production/server/MAX_UPLOAD_BYTES=5242880
```

Create these server `SecureString` parameters:

```text
/buizz/production/server/CLOUDINARY_CLOUD_NAME
/buizz/production/server/CLOUDINARY_API_KEY
/buizz/production/server/CLOUDINARY_API_SECRET
/buizz/production/server/JWT_SECRET
/buizz/production/server/JWT_REFRESH_SECRET
/buizz/production/server/ADMIN_REGISTRATION_SECRET
/buizz/production/server/SMTP_USER
/buizz/production/server/SMTP_PASS
/buizz/production/server/FACEBOOK_APP_SECRET
/buizz/production/server/META_APP_SECRET
/buizz/production/server/INTERAKT_API_KEY
/buizz/production/server/PHONEPE_CLIENT_SECRET
```

Add corresponding non-secret SMTP, Facebook, Meta, Interakt, and PhonePe values
from `server/.env.production.example`. The worker safely inherits `/shared/` and
`/server/`, then overlays:

```text
/buizz/production/worker/NODE_ENV=production
/buizz/production/worker/WORKER_HEALTH_PORT=9090
```

Admin parameters:

```text
/buizz/production/admin/NODE_ENV=production
/buizz/production/admin/ADMIN_PORT=5001
/buizz/production/admin/JWT_SECRET                    (SecureString)
/buizz/production/admin/JWT_REFRESH_SECRET            (SecureString)
/buizz/production/admin/ADMIN_REGISTRATION_SECRET     (SecureString)
```

Client parameters intentionally contain no database, Valkey, or Cloudinary secret:

```text
/buizz/production/client/NODE_ENV=production
/buizz/production/client/PORT=3000
```

Terraform manages `/buizz/production/shared/*`. Never overwrite its generated
database or Valkey passwords. List names without decryption:

```powershell
aws ssm get-parameters-by-path --region ap-south-1 --path "/buizz/production/" --recursive --query "Parameters[].{Name:Name,Type:Type}" --output table
```

## 4. Terraform while CloudFront is pending

Keep `enable_cloudfront = false` in `terraform.tfvars`, then:

```powershell
cd infra/terraform/environments/production
terraform fmt -recursive
terraform validate
terraform --% plan -out=without-cloudfront.tfplan
terraform show without-cloudfront.tfplan
terraform apply without-cloudfront.tfplan
```

Apply only after confirming no unexpected replacement and `0 to destroy`. After
AWS enables CloudFront, set the flag to `true`, create a new saved plan, and apply.

## 5. Prepare GitHub

The remote is `https://github.com/devopsbuizz/buizz-management-system.git`.
Before committing:

```powershell
git status
git diff --check
git diff --stat
```

Never stage `.env`, `terraform.tfstate`, `*.tfplan`, credentials, database
exports, KYC files, or generated tickets. Review all pre-existing deleted files.
The EC2 bootstrap clones HTTPS; the repository must be public, or bootstrap must
be changed to a secure private artifact/deploy-key flow before recreating EC2.

## 6. Configure GitHub OIDC environments

Create a protected `production` environment with repository variables:

```text
AWS_REGION=ap-south-1
AWS_DEPLOY_ROLE_ARN=<terraform output github_deploy_role_arn>
EC2_INSTANCE_ID=<terraform output ec2_instance_id>
```

Create a more strongly protected `production-infrastructure` environment:

```text
AWS_REGION=ap-south-1
AWS_TERRAFORM_ROLE_ARN=<terraform output github_terraform_role_arn>
TF_STATE_BUCKET=buizz-terraform-state-686090304995
```

Do not create long-lived AWS access-key GitHub secrets; workflows use OIDC.

## 7. DNS and TLS

Get `terraform output -raw application_public_ip`. Point `buizz.com`, `www`,
`api`, and `admin-api` A records to it. After DNS resolves and the first deploy
has created `docker/production/.env`, use Systems Manager to run:

```bash
sudo AWS_REGION=ap-south-1 bash /opt/buizz/repository/scripts/bootstrap-tls.sh contact@buizz.com buizz.com
```

Do not open SSH port 22.

## 8. CI/CD deployment

`ci.yml` validates application, Terraform, and Docker builds.
`deploy-production.yml` assumes AWS access through OIDC, builds immutable SHA
images, pushes them to ECR, invokes EC2 through Systems Manager, renders SSM
configuration, deploys Compose, and waits for health checks. Protect `main`,
require CI, and require a reviewer on the production environment.

## 9. Production verification

On EC2 through Systems Manager:

```bash
cd /opt/buizz/repository
docker compose --env-file docker/production/.env -f docker/production/compose.yml ps
docker compose --env-file docker/production/.env -f docker/production/compose.yml exec api npm run verify:cloudinary -- --write-test
```

Expected output confirms connection, authenticated upload, and deletion. Then:

On Windows development machines behind a TLS-inspecting proxy, keep certificate
validation enabled and use the Windows system trust store:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
cd server
npm run verify:cloudinary -- --write-test
```

Never work around certificate errors with `NODE_TLS_REJECT_UNAUTHORIZED=0` or
`npm config set strict-ssl false`.

```bash
curl --fail https://api.buizz.com/health
curl --fail https://admin-api.buizz.com/health
curl --fail https://www.buizz.com/_buizz/health
```

Test an event image, PAN/address/bank documents, authorization on KYC viewing,
a booking ticket PDF, worker completion, and asset deletion. API and worker must
refuse startup if required Cloudinary credentials are removed or invalid.

## 10. Rollback

Images use immutable commit SHA tags. Roll back through Systems Manager:

```bash
sudo AWS_REGION=ap-south-1 bash /opt/buizz/repository/scripts/deploy-production.sh <previous-good-commit-sha>
```

Monitor CloudWatch logs, EC2 status, RDS, Valkey, BullMQ failures, Cloudinary
usage, and the SNS subscription for `contact@buizz.com`.
