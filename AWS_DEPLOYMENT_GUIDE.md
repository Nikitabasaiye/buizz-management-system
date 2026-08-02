# Buizz AWS Production Deployment Guide

> For the selected Terraform-based Phase 1 MVP deployment, start with
> [AWS_MVP_START_HERE.md](./AWS_MVP_START_HERE.md). This older document
> describes the manual EC2/PM2 path and should not be mixed with that workflow.

> For the full service-selection rationale, storage and ticket architecture,
> GitHub OIDC CI/CD, DevSecOps controls, cost strategy, performance plan, and
> explicit Redis/BullMQ/Docker/Kubernetes/GraphQL decisions, read
> [AWS_PRODUCTION_ARCHITECTURE_DEVSECOPS.md](./AWS_PRODUCTION_ARCHITECTURE_DEVSECOPS.md).
>
> If you are new to AWS and DevOps, complete the staged exercises in
> [BUIZZ_BEGINNER_LEARNING_ROADMAP.md](./BUIZZ_BEGINNER_LEARNING_ROADMAP.md)
> before changing production.

This runbook deploys the complete Buizz platform:

- Next.js 15 client from `client/`
- Node.js/Express API and Socket.IO server from `server/`
- MySQL database on Amazon RDS
- Public domains:
  - `https://buizz.com`
  - `https://www.buizz.com`
  - `https://api.buizz.com`
- Durable MySQL notification worker
- Google, Facebook, PhonePe, Razorpay, SMTP, WhatsApp/Interakt, and Cloudinary configuration

The commands assume:

- AWS Region: `ap-south-1` (Mumbai)
- Server OS: Ubuntu 24.04 LTS
- Node.js: 22 LTS
- Repository directory on EC2: `/srv/buizz`
- Linux deployment user: `buizz`
- Client port: `3000`
- API port: `5000`

Replace every value written as `<LIKE_THIS>` before running a command.

> Security warning: never commit a production `.env`, database password, JWT
> secret, payment secret, SMTP password, Facebook secret, or private key. A
> database password has previously appeared in an example environment file in
> this repository. Rotate that database credential before migration.

## 1. Recommended AWS architecture

The initial production architecture is:

```text
Internet
   |
Route 53 DNS
   |
Elastic IP
   |
EC2 Ubuntu + Nginx
   |-- buizz.com / www.buizz.com --> Next.js :3000
   |-- api.buizz.com              --> Express + Socket.IO :5000
   |
   +---- private VPC connection ----> RDS MySQL
   |
   +---- HTTPS outbound ------------> Cloudinary / SMTP / PhonePe /
                                      Razorpay / Meta / Google
```

Use this layout for the first AWS production release because the repository
already runs as two long-lived Node processes and uses Socket.IO. It minimizes
application changes while keeping the database private and managed.

Recommended starting sizes:

| Resource | Starting choice | Notes |
|---|---|---|
| EC2 | `t3.medium`, Ubuntu 24.04, 30–50 GB gp3 | Next.js builds can exceed the memory available on a micro instance |
| RDS | MySQL 8.0, `db.t4g.micro` or `db.t4g.small`, 20–50 GB gp3 | Choose Multi-AZ for higher availability |
| DNS | Route 53 public hosted zone | Existing registrar can continue to hold the domain |
| Files | Cloudinary initially | The application already supports it |
| TLS | Let's Encrypt on Nginx | Simple for one EC2 host |
| Secrets | SSM Parameter Store `SecureString` or Secrets Manager | Do not store production secrets in Git |

For a high-availability later phase, move the two applications to ECS/Fargate
behind an Application Load Balancer, store all files in S3/Cloudinary, and run
at least two tasks per service. Do not horizontally scale the current EC2
deployment while KYC/PDF/QR files can still fall back to local disk.

## 2. Pre-deployment checklist

Prepare these items before creating AWS resources:

- AWS account with MFA enabled on the root user
- A non-root IAM administrator for deployment
- `buizz.com` access at the current registrar
- Git repository containing the latest tested code
- Production database export from the existing host, if preserving data
- Cloudinary production account
- SMTP provider credentials
- PhonePe and/or Razorpay production credentials
- Meta Facebook App ID and secret
- Google OAuth client ID
- WhatsApp/Interakt credentials
- A deployment maintenance window

Confirm the local build before deployment:

```powershell
cd D:\buizz_management_system\client
npm ci
npm run build

cd D:\buizz_management_system\server
npm ci
node --check server.js
```

The server requires Node 22. The client supports Node 20 or later; use Node 22
for both to keep the host consistent.

## 3. Create the VPC security groups

The default VPC works for an initial deployment, although a dedicated VPC is
preferred for long-term production.

Create an EC2 security group named `buizz-app-sg`:

| Direction | Protocol/port | Source | Purpose |
|---|---|---|---|
| Inbound | TCP 22 | Your fixed office/home IP only | SSH |
| Inbound | TCP 80 | `0.0.0.0/0`, `::/0` | HTTP and certificate validation |
| Inbound | TCP 443 | `0.0.0.0/0`, `::/0` | HTTPS |
| Outbound | All | `0.0.0.0/0` | RDS and third-party APIs |

Do **not** expose ports 3000, 5000, or 3306 publicly.

Create an RDS security group named `buizz-rds-sg`:

| Direction | Protocol/port | Source |
|---|---|---|
| Inbound | MySQL TCP 3306 | Security group `buizz-app-sg` |

The RDS inbound source must be the EC2 security group, not `0.0.0.0/0`.

AWS can automatically configure EC2-to-RDS security groups when both resources
are in the same VPC. See the official AWS procedure:

- <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/ec2-rds-connect.html>

## 4. Create the RDS MySQL database

In **AWS Console → RDS → Create database**:

1. Choose **Standard create**.
2. Engine: **MySQL**.
3. Version: a supported MySQL 8.0 release.
4. Template: **Production** or **Dev/Test** for a temporary staging database.
5. DB instance identifier: `buizz-production`.
6. Master username: `buizz_admin`.
7. Generate a strong password and store it in Secrets Manager or an encrypted
   password manager.
8. Instance: `db.t4g.micro` or `db.t4g.small` initially.
9. Storage: gp3, at least 20 GB, with storage autoscaling enabled.
10. Enable storage encryption.
11. Select the same VPC as the EC2 instance.
12. Set **Public access: No**.
13. Attach `buizz-rds-sg`.
14. Initial database name: `buizz`.
15. Enable automated backups with 7–14 days retention.
16. Enable deletion protection for production.
17. Enable Performance Insights if the selected class supports it.

Record the RDS endpoint, for example:

```text
buizz-production.xxxxxxxxxxxx.ap-south-1.rds.amazonaws.com
```

RDS security guidance:

- <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/securing-mysql-connections.html>
- <https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/advanced-security.html>

## 5. Migrate the existing MySQL data

If this is a new empty installation, skip to the next section and let the
server initialize its core schema. If production data already exists, export
and restore it before starting the API.

### 5.1 Export from the existing database

Run from a trusted machine with MySQL client tools:

```bash
mysqldump \
  --host=<OLD_DB_HOST> \
  --user=<OLD_DB_USER> \
  --password \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  <OLD_DB_NAME> > buizz-production.sql
```

Do not place the dump inside the public web directory or commit it to Git.

### 5.2 Temporarily allow migration access

The preferred method is to copy the dump to EC2 and import from EC2, since RDS
already permits the EC2 security group:

```bash
scp -i <KEY_FILE.pem> buizz-production.sql ubuntu@<ELASTIC_IP>:/tmp/
```

On EC2:

```bash
sudo apt-get update
sudo apt-get install -y mysql-client

mysql \
  --host=<RDS_ENDPOINT> \
  --port=3306 \
  --user=buizz_admin \
  --password \
  buizz < /tmp/buizz-production.sql
```

After verifying the import, remove the temporary dump:

```bash
shred -u /tmp/buizz-production.sql
```

### 5.3 New database initialization

For a completely new database, the API's `connectMySQL()` function creates the
core tables on startup. The repository also contains supplemental SQL files
for historical features. Do not blindly execute every SQL file because many
overlap.

Use this order:

1. Start with `server/database/buizz_fresh_restore_schema.sql` when you want a
   fully explicit clean schema, **or** allow `server/src/database/mysql.js` to
   initialize the core schema.
2. Run only supplemental migrations required by a feature that is missing
   from the selected base schema.
3. Take an RDS snapshot before applying later schema changes.
4. Test every migration on staging first.

To apply the full fresh schema explicitly:

```bash
mysql \
  --host=<RDS_ENDPOINT> \
  --user=buizz_admin \
  --password \
  buizz < /srv/buizz/server/database/buizz_fresh_restore_schema.sql
```

## 6. Launch the EC2 instance

In **AWS Console → EC2 → Launch instance**:

1. Name: `buizz-production-app`.
2. AMI: Ubuntu Server 24.04 LTS 64-bit.
3. Instance type: `t3.medium`.
4. Create or select an SSH key pair.
5. Select the same VPC as RDS.
6. Attach `buizz-app-sg`.
7. Storage: 30–50 GB gp3, encrypted.
8. Enable detailed monitoring if desired.
9. Launch the instance.

Allocate and associate an **Elastic IP** with the instance. Without an Elastic
IP, the public address can change after stop/start.

AWS Route 53 also recommends using an Elastic IP when routing directly to EC2:

- <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-ec2-instance.html>

## 7. Prepare Ubuntu

Connect:

```bash
ssh -i <KEY_FILE.pem> ubuntu@<ELASTIC_IP>
```

Update packages and install required tools:

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y git nginx mysql-client build-essential curl unzip jq
```

Create a restricted deployment user:

```bash
sudo adduser --disabled-password --gecos "" buizz
sudo usermod -aG sudo buizz
sudo mkdir -p /srv/buizz
sudo chown -R buizz:buizz /srv/buizz
```

Install Node 22 using `nvm` as the `buizz` user:

```bash
sudo -iu buizz
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 22
nvm alias default 22
node --version
npm --version
```

Install PM2:

```bash
npm install --global pm2
```

Configure PM2 startup later, after the processes are created.

## 8. Deploy the repository

### Option A: clone with a deploy key

Create a read-only deploy key in the Git provider, then:

```bash
cd /srv
git clone <YOUR_PRIVATE_REPOSITORY_SSH_URL> buizz
cd /srv/buizz
git checkout <PRODUCTION_BRANCH>
```

### Option B: copy a release archive

From the development machine:

```bash
git archive --format=tar.gz --output=buizz-release.tar.gz HEAD
scp -i <KEY_FILE.pem> buizz-release.tar.gz ubuntu@<ELASTIC_IP>:/tmp/
```

On EC2:

```bash
sudo -u buizz tar -xzf /tmp/buizz-release.tar.gz -C /srv/buizz
rm /tmp/buizz-release.tar.gz
```

Never deploy `node_modules`, `.next-dev`, old ZIP backups, log files, or local
`.env` files.

## 9. Configure production secrets

For the first release, create files readable only by the `buizz` user:

```bash
sudo -u buizz install -m 600 /dev/null /srv/buizz/server/.env
sudo -u buizz install -m 600 /dev/null /srv/buizz/client/.env.production
```

Longer term, store values under `/buizz/production/` in AWS Systems Manager
Parameter Store using `SecureString`, or use Secrets Manager for credentials
that require rotation. Parameter Store supports encrypted `SecureString`
values with KMS:

- <https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html>

### 9.1 Generate application secrets

Run separately for each secret:

```bash
openssl rand -base64 64
```

Use different values for:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_REGISTRATION_SECRET`
- `META_WEBHOOK_VERIFY_TOKEN`

### 9.2 Server environment

Edit:

```bash
nano /srv/buizz/server/.env
```

Use:

```dotenv
NODE_ENV=production
PORT=5000
API_VERSION=v1

BASE_URL=https://api.buizz.com
BACKEND_URL=https://api.buizz.com
PUBLIC_API_URL=https://api.buizz.com
FRONTEND_URL=https://www.buizz.com
ADMIN_FRONTEND_URL=https://www.buizz.com
CORS_ORIGINS=https://buizz.com,https://www.buizz.com

MYSQL_HOST=<RDS_ENDPOINT>
MYSQL_PORT=3306
MYSQL_DATABASE=buizz
MYSQL_USER=buizz_admin
MYSQL_PASSWORD=<RDS_PASSWORD>
MYSQL_CONNECTION_LIMIT=10
SCHEMA_INIT_STRICT=true

JWT_SECRET=<GENERATED_ACCESS_SECRET>
JWT_REFRESH_SECRET=<GENERATED_REFRESH_SECRET>
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
ADMIN_REGISTRATION_SECRET=<GENERATED_ADMIN_SECRET>

GOOGLE_CLIENT_ID=<GOOGLE_WEB_CLIENT_ID>
FACEBOOK_APP_ID=<META_APP_ID>
FACEBOOK_APP_SECRET=<META_APP_SECRET>
FACEBOOK_LOGIN_CONFIG_ID=<META_LOGIN_CONFIG_ID>
FACEBOOK_API_VERSION=v25.0

DISABLE_REDIS=true
REDIS_DISABLED=true

CLOUDINARY_CLOUD_NAME=<CLOUDINARY_CLOUD>
CLOUDINARY_API_KEY=<CLOUDINARY_KEY>
CLOUDINARY_API_SECRET=<CLOUDINARY_SECRET>

SMTP_HOST=<SMTP_HOST>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<SMTP_USER>
SMTP_PASS=<SMTP_PASSWORD>
SMTP_TLS_REJECT_UNAUTHORIZED=true

PHONEPE_ENV=PRODUCTION
PHONEPE_CLIENT_VERSION=1
PHONEPE_CLIENT_ID=<PHONEPE_CLIENT_ID>
PHONEPE_CLIENT_SECRET=<PHONEPE_CLIENT_SECRET>
PHONEPE_MERCHANT_ID=<PHONEPE_MERCHANT_ID>
PHONEPE_SALT_KEY=<PHONEPE_SALT_KEY_IF_REQUIRED>
PHONEPE_SALT_INDEX=<PHONEPE_SALT_INDEX_IF_REQUIRED>
PHONEPE_API_URL=<PHONEPE_PRODUCTION_API_URL>
PHONEPE_CHECKOUT_URL=<PHONEPE_PRODUCTION_CHECKOUT_URL>
PHONEPE_IDENTITY_URL=<PHONEPE_PRODUCTION_IDENTITY_URL>
PHONEPE_CALLBACK_USERNAME=<PHONEPE_CALLBACK_USERNAME>
PHONEPE_CALLBACK_PASSWORD=<PHONEPE_CALLBACK_PASSWORD>
PHONEPE_REDIRECT_URL=https://www.buizz.com/payment/callback
PHONEPE_CALLBACK_URL=https://api.buizz.com/api/v1/payments/phonepe/callback

RAZORPAY_KEY_ID=<RAZORPAY_KEY_ID>
RAZORPAY_KEY_SECRET=<RAZORPAY_KEY_SECRET>
RAZORPAY_WEBHOOK_SECRET=<RAZORPAY_WEBHOOK_SECRET>

META_WEBHOOK_VERIFY_TOKEN=<GENERATED_META_VERIFY_TOKEN>
META_APP_SECRET=<META_APP_SECRET>
INTERAKT_API_URL=<INTERAKT_API_URL>
INTERAKT_API_KEY=<INTERAKT_API_KEY>
INTERAKT_PHONE_NUMBER_ID=<INTERAKT_PHONE_NUMBER_ID>
WHATSAPP_PUBLIC_BASE_URL=https://api.buizz.com

PLATFORM_FEE_PERCENT=10
SETTLEMENT_HOLD_DAYS=7
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
NOTIFICATION_CRON_BATCH_SIZE=50
```

Remove unused provider variables rather than inserting fake values.

Do not configure the development-only super-admin password variables after the
initial account has been created. Prefer a controlled database seed or one-time
administrative process.

### 9.3 Client build environment

Edit:

```bash
nano /srv/buizz/client/.env.production
```

Use:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://api.buizz.com/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<GOOGLE_WEB_CLIENT_ID>
NEXT_PUBLIC_FACEBOOK_APP_ID=<META_APP_ID>
NEXT_PUBLIC_FACEBOOK_LOGIN_CONFIG_ID=<META_LOGIN_CONFIG_ID>
NEXT_PUBLIC_FACEBOOK_API_VERSION=v25.0
```

Every `NEXT_PUBLIC_*` value is embedded into the browser bundle at build time.
Never place a Facebook secret, payment secret, SMTP password, database
password, or JWT secret in the client environment.

## 10. Configure OAuth and payment callback URLs

### Google OAuth

Authorized JavaScript origins:

```text
https://buizz.com
https://www.buizz.com
```

Authorized redirect URI:

```text
https://www.buizz.com/auth/google/callback
```

### Facebook Login

Valid OAuth redirect URIs:

```text
https://www.buizz.com/auth/facebook/callback
https://buizz.com/auth/facebook/callback
```

App domain:

```text
buizz.com
```

Put the Meta app into Live mode only after its required actions and permission
review are complete.

### PhonePe

```text
Redirect: https://www.buizz.com/payment/callback
Callback: https://api.buizz.com/api/v1/payments/phonepe/callback
```

### Razorpay

Configure the webhook URL that corresponds to the server route:

```text
https://api.buizz.com/api/v1/webhooks/razorpay
```

Use a new webhook signing secret and place the same value in
`RAZORPAY_WEBHOOK_SECRET`.

## 11. Install dependencies and build

As the `buizz` user:

```bash
sudo -iu buizz
source ~/.nvm/nvm.sh

cd /srv/buizz/server
npm ci --omit=dev

cd /srv/buizz/client
npm ci
npm run build
```

The client build output is `client/next-build`, not the default `.next`.

If the build is killed due to memory pressure, temporarily enable a 4 GB swap
file:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 12. Configure PM2

Create `/srv/buizz/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: "buizz-api",
      cwd: "/srv/buizz/server",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "5000",
      },
      max_memory_restart: "750M",
      time: true,
    },
    {
      name: "buizz-client",
      cwd: "/srv/buizz/client",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "900M",
      time: true,
    },
  ],
};
```

Start and save:

```bash
cd /srv/buizz
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs --lines 100
pm2 save
```

Enable boot startup:

```bash
pm2 startup systemd -u buizz --hp /home/buizz
```

PM2 prints a `sudo` command. Run that exact command, then:

```bash
sudo systemctl enable pm2-buizz
sudo systemctl status pm2-buizz
```

Local health checks:

```bash
curl --fail http://127.0.0.1:5000/health
curl --fail http://127.0.0.1:3000/_buizz/health
```

Do not continue until both return success.

## 13. Configure Nginx

Create `/etc/nginx/sites-available/buizz`:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

server {
    listen 80;
    listen [::]:80;
    server_name buizz.com www.buizz.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}

server {
    listen 80;
    listen [::]:80;
    server_name api.buizz.com;

    client_max_body_size 20m;

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
    }

    location / {
        limit_req zone=api_limit burst=60 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 180s;
        proxy_send_timeout 180s;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/buizz /etc/nginx/sites-enabled/buizz
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

At this point HTTP should work after DNS is configured.

## 14. Configure Route 53

Create or open the public hosted zone for `buizz.com`.

If Route 53 is not the registrar, replace the domain's current nameservers at
the registrar with the four Route 53 nameservers shown in the hosted zone.

Create:

| Record | Type | Value |
|---|---|---|
| `buizz.com` | A | `<ELASTIC_IP>` |
| `www.buizz.com` | A | `<ELASTIC_IP>` |
| `api.buizz.com` | A | `<ELASTIC_IP>` |

Use TTL 300 during migration. AWS documents direct EC2 routing here:

- <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-ec2-instance.html>

Verify:

```bash
dig +short buizz.com
dig +short www.buizz.com
dig +short api.buizz.com
```

All three should return the Elastic IP.

## 15. Enable HTTPS

Install Certbot:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Request certificates:

```bash
sudo certbot --nginx \
  -d buizz.com \
  -d www.buizz.com \
  -d api.buizz.com
```

Choose the HTTP-to-HTTPS redirect option.

Test renewal:

```bash
sudo certbot renew --dry-run
systemctl status certbot.timer
```

Recheck Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 16. Configure the notification worker

The application uses a durable MySQL `notification_queue`; Redis is not
required for the current worker.

Create a log directory:

```bash
sudo -u buizz mkdir -p /srv/buizz/server/logs
```

Edit the `buizz` user's crontab:

```bash
sudo crontab -u buizz -e
```

Add:

```cron
* * * * * flock -n /tmp/buizz-notifications.lock bash -lc 'cd /srv/buizz/server && /home/buizz/.nvm/versions/node/v22.*/bin/node cron/process-notifications.js >> logs/notification-cron.log 2>&1'
```

Because wildcard expansion in cron can vary, determine the exact Node path:

```bash
sudo -iu buizz bash -lc 'which node'
```

Replace `/home/buizz/.nvm/versions/node/v22.*/bin/node` in the cron entry with
the exact returned path.

Verify after two minutes:

```bash
tail -n 100 /srv/buizz/server/logs/notification-cron.log
```

Only one worker invocation should run at a time; `flock` enforces this.

## 17. Durable file storage

The server currently supports Cloudinary but still contains local-disk
fallbacks under:

```text
server/storage/kyc-documents
server/storage/pdfs
server/storage/qrcodes
```

For production:

1. Configure all Cloudinary values.
2. Test KYC upload, PDF ticket generation, and QR delivery.
3. Confirm returned URLs use durable cloud storage.
4. Treat EC2 local files as temporary, not authoritative.

If any flow still produces only `/storage/...` URLs, either:

- keep the EC2 EBS volume backed up and avoid replacing the instance, or
- complete an S3/Cloudinary migration for that flow before enabling Auto
  Scaling or multiple application instances.

KYC documents are sensitive. Use private/authenticated Cloudinary delivery or
private S3 objects with short-lived signed URLs; do not make identity documents
public.

## 18. First production verification

### Infrastructure

```bash
pm2 status
sudo systemctl status nginx
curl -I https://www.buizz.com
curl https://api.buizz.com/health
curl https://api.buizz.com/api/v1/health
curl https://www.buizz.com/_buizz/health
```

Expected:

- Client health: HTTP 200 with a non-missing build ID
- API health: HTTP 200 and database connected/schema ready
- No public response from ports 3000, 5000, or 3306
- HTTPS certificate is valid for all three domains

### Authentication

Test separately:

1. Customer email/password signup and login
2. Customer phone OTP login with email fallback
3. Organizer signup, email OTP, phone OTP, KYC, and bank upload
4. Organizer login and dashboard navigation
5. Admin login
6. Super-admin login and support endpoint access
7. Google OAuth
8. Facebook OAuth
9. Access-token refresh after the short access token expires
10. Logout and protected-route rejection

### Business flows

Test:

1. Draft event creation
2. Admin/super-admin event review
3. Event publish
4. Online booking
5. PhonePe and Razorpay callback signature validation
6. Ticket/QR generation
7. Email and WhatsApp delivery
8. Offline organizer booking
9. QR check-in
10. KYC approval reflected in organizer UI
11. Support ticket creation and super-admin listing
12. Settlement and revenue views

### Browser checks

Open DevTools and confirm:

- No mixed-content requests
- API calls use `https://api.buizz.com/api/v1`
- No CORS failures
- No stale Next.js chunk 404/503 errors
- Socket.IO connects through HTTPS/WSS
- OAuth callbacks return to `www.buizz.com`

## 19. Cut over from the old host

Use this sequence to avoid data loss:

1. Lower existing DNS TTL to 300 at least one day before migration.
2. Deploy and validate AWS using a temporary hosts-file override or staging
   subdomains.
3. Put the old application into maintenance/read-only mode.
4. Take the final MySQL dump.
5. Restore the final dump to RDS.
6. Start AWS API and client.
7. Run smoke tests.
8. Change Route 53 records to the Elastic IP.
9. Monitor both old and new servers during DNS propagation.
10. Keep the old host unchanged for rollback until AWS is stable.

Do not accept bookings simultaneously on old and new databases.

## 20. Routine deployment procedure

On EC2:

```bash
sudo -iu buizz
source ~/.nvm/nvm.sh
cd /srv/buizz

git fetch --all --prune
git checkout <PRODUCTION_BRANCH>
git pull --ff-only

cd /srv/buizz/server
npm ci --omit=dev

cd /srv/buizz/client
npm ci
npm run build

cd /srv/buizz
pm2 reload ecosystem.config.cjs --update-env
pm2 save
```

Then verify:

```bash
curl --fail https://api.buizz.com/health
curl --fail https://www.buizz.com/_buizz/health
pm2 logs --lines 100
```

The client must be built after any `NEXT_PUBLIC_*` value changes.

## 21. Rollback procedure

Before each release:

```bash
cd /srv/buizz
git rev-parse HEAD
```

Record the commit and create an RDS snapshot before schema changes.

To roll back application code:

```bash
sudo -iu buizz
source ~/.nvm/nvm.sh
cd /srv/buizz
git checkout <PREVIOUS_GOOD_COMMIT>

cd server
npm ci --omit=dev

cd ../client
npm ci
npm run build

cd ..
pm2 reload ecosystem.config.cjs --update-env
```

If a schema migration is incompatible, restore the pre-release RDS snapshot
into a new RDS instance, update `MYSQL_HOST`, and reload the API. Never attempt
an untested destructive schema rollback directly on the only production
database.

## 22. Backups and disaster recovery

Configure:

- RDS automated backups: 7–14 days
- RDS deletion protection
- Manual RDS snapshot before every schema release
- EBS snapshots using AWS Backup
- Cloudinary/S3 retention suitable for tickets and KYC policies
- Source code in a private remote Git repository
- Exported secret inventory stored in a secure recovery vault

Test database restoration at least quarterly. A backup is not proven until it
has been restored successfully.

## 23. Monitoring and alerting

Minimum monitoring:

- CloudWatch EC2 CPU, network, and status-check alarms
- RDS CPU, free storage, connections, and freeable-memory alarms
- Disk usage alert for the EC2 EBS volume
- Nginx access/error logs
- PM2 client/API logs
- Notification cron failures
- External HTTPS uptime checks for:
  - `https://www.buizz.com/_buizz/health`
  - `https://api.buizz.com/health`

Useful commands:

```bash
pm2 monit
pm2 logs buizz-api --lines 200
pm2 logs buizz-client --lines 200
sudo tail -f /var/log/nginx/error.log
df -h
free -h
```

Install the CloudWatch Agent if centralized application and Nginx logs are
required.

## 24. Security hardening

Before launch:

- Rotate every credential that has ever appeared in source, chat, screenshots,
  logs, or example files.
- Remove production values from `server/.env.production.example`.
- Confirm `.env*`, SQL dumps, storage documents, and logs are ignored by Git.
- Restrict SSH to a trusted IP or use AWS Systems Manager Session Manager.
- Disable SSH password authentication.
- Do not expose RDS publicly.
- Use encrypted RDS and EBS storage.
- Use least-privilege IAM roles.
- Store secrets in SSM `SecureString` or Secrets Manager.
- Enable AWS account MFA.
- Enable CloudTrail.
- Add AWS WAF when placing the application behind CloudFront or an ALB.
- Patch Ubuntu and Node dependencies regularly.
- Review `npm audit` results manually; do not run `npm audit fix --force`
  directly in production.
- Set Cloudinary/S3 KYC assets to private access.
- Verify PhonePe/Razorpay webhook signatures.
- Keep CORS restricted to the production frontend domains.

## 25. Troubleshooting

### API returns 502

```bash
pm2 status
pm2 logs buizz-api --lines 200
curl http://127.0.0.1:5000/health
sudo nginx -t
sudo tail -n 100 /var/log/nginx/error.log
```

### Client returns 502 or chunk errors

```bash
pm2 logs buizz-client --lines 200
curl http://127.0.0.1:3000/_buizz/health
ls -la /srv/buizz/client/next-build
```

Rebuild and reload:

```bash
cd /srv/buizz/client
npm ci
npm run build
pm2 reload buizz-client --update-env
```

Do not cache HTML at Nginx or a CDN. Hashed `/_next/static` assets may be cached
immutably.

### RDS connection fails

Check:

- RDS and EC2 are in the same VPC
- RDS is available
- `MYSQL_HOST` is the RDS endpoint, not `localhost`
- RDS security group allows port 3306 from `buizz-app-sg`
- Database/user/password are correct
- RDS max connections are not exhausted

Test:

```bash
mysql -h <RDS_ENDPOINT> -u buizz_admin -p -e "SELECT 1" buizz
```

### CORS failure

Confirm:

```dotenv
CORS_ORIGINS=https://buizz.com,https://www.buizz.com
```

Reload the API after changing it:

```bash
pm2 reload buizz-api --update-env
```

### Super-admin receives 403

1. Log out of all panels.
2. Clear old role sessions in browser local storage.
3. Log in through `/super-admin/login`.
4. Confirm the API receives the super-admin bearer token.
5. Confirm the account role is `super_admin` or the admin record has
   `is_super_admin = 1`.

### Facebook login is not configured

Check:

```bash
grep '^FACEBOOK_' /srv/buizz/server/.env
curl https://api.buizz.com/api/v1/meta/facebook-config
```

The response should contain `"configured": true`. Never expose
`FACEBOOK_APP_SECRET` to the client.

### Notification queue does not process

```bash
crontab -u buizz -l
tail -n 200 /srv/buizz/server/logs/notification-cron.log
cd /srv/buizz/server
npm run cron:notifications
```

Check SMTP/WhatsApp credentials and the `notification_queue` rows in RDS.

## 26. Production sign-off checklist

- [ ] EC2 uses Elastic IP
- [ ] RDS is private and encrypted
- [ ] RDS backups and deletion protection enabled
- [ ] Only ports 22/80/443 exposed on EC2
- [ ] SSH restricted to trusted IP or Session Manager
- [ ] `buizz.com`, `www`, and `api` DNS resolve correctly
- [ ] HTTPS certificates valid and auto-renewal tested
- [ ] Client and API PM2 services restart after reboot
- [ ] Both health endpoints return 200
- [ ] Production secrets rotated and absent from Git
- [ ] Cloudinary/private file delivery tested
- [ ] Database migration reconciled and row counts checked
- [ ] Notification cron processes successfully
- [ ] Google and Facebook callbacks tested
- [ ] PhonePe/Razorpay webhooks tested
- [ ] Customer, organizer, admin, and super-admin logins tested
- [ ] Booking, QR, email, WhatsApp, KYC, approval, and check-in tested
- [ ] Monitoring and alarms enabled
- [ ] Rollback commit and RDS snapshot recorded

## 27. Official AWS references

- EC2 security groups:
  <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-security-group.html>
- EC2 and RDS automatic connectivity:
  <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/ec2-rds-connect.html>
- Secure RDS MySQL connections:
  <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/securing-mysql-connections.html>
- RDS encryption and advanced security:
  <https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/advanced-security.html>
- Route 53 to EC2:
  <https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-ec2-instance.html>
- Systems Manager Parameter Store:
  <https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html>
