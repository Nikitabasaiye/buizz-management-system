# Buizz Beginner-to-Production Learning Roadmap

This is a beginner-first curriculum for learning enough development, AWS,
DevOps, DevSecOps, database, storage, CI/CD, security, and operations to deploy
and maintain Buizz responsibly.

It is not necessary to become an expert in every AWS service before deploying.
Learn in the order below, practice in a non-production AWS account, and use the
two project runbooks:

- [AWS_PRODUCTION_ARCHITECTURE_DEVSECOPS.md](./AWS_PRODUCTION_ARCHITECTURE_DEVSECOPS.md)
- [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)

## Important safety rule

Do not practice directly in production. Use:

- a GitHub practice repository
- an AWS development account or isolated development environment
- fake users and fake KYC documents
- Razorpay/PhonePe sandbox credentials
- Meta/test phone numbers
- a separate development database

Never upload real PAN, Aadhaar, bank documents, passwords, access keys, or
payment secrets while learning.

---

## 1. What you actually need to learn

Learn now:

1. terminal and Linux fundamentals
2. Git and GitHub
3. how web applications work
4. JavaScript, Node.js, Express, and Next.js fundamentals
5. HTTP, DNS, TLS, cookies, JWT, REST, and CORS
6. MySQL and database transactions
7. AWS accounts, IAM, VPC, EC2, RDS, S3, CloudFront, Route 53, SSM, and
   CloudWatch
8. Nginx and PM2
9. GitHub Actions, OIDC, CI/CD, releases, and rollback
10. application and cloud security
11. backup, monitoring, incident response, and cost control
12. Docker fundamentals
13. Terraform fundamentals

Learn later:

- Amazon SQS
- ECS/Fargate
- Redis/ElastiCache
- advanced load testing and autoscaling

Do not learn for this deployment now:

- Kubernetes/EKS
- Kafka
- RabbitMQ
- service mesh
- GraphQL
- multi-region architecture
- complex microservices

Those subjects will delay the launch without solving a current Buizz problem.

---

## 2. How to use this roadmap

Recommended pace:

- Fast, full-time: 8 weeks, 4-6 hours per day
- Safer part-time: 12 weeks, 2-3 hours per day
- Weekend-only: approximately 5-6 months

Use a 30/70 split:

- 30% watching or reading
- 70% typing commands, breaking a practice system, fixing it, and documenting
  what happened

For each topic:

1. watch only the relevant sections
2. repeat every command yourself
3. write a one-page summary in your own words
4. complete the checkpoint without copying
5. delete temporary AWS resources at the end of practice

Videos are supporting material, not the source of truth. When a video conflicts
with current AWS or GitHub documentation, follow the official documentation.

---

## 3. Week 0 — setup and cost protection

### Learn

- what local, development, staging, and production mean
- why secrets must never enter Git
- AWS pay-as-you-go billing
- AWS root user versus IAM administrator
- MFA
- AWS Budgets and billing alarms

### Watch

- AWS official channel:
  https://www.youtube.com/@amazonwebservices
- AWS account setup and MFA search:
  https://www.youtube.com/results?search_query=AWS+account+setup+MFA+IAM+beginner+official
- AWS Budgets search:
  https://www.youtube.com/results?search_query=AWS+Budgets+billing+alarm+beginner
- GitHub beginner channel:
  https://www.youtube.com/@GitHub

### Do

1. Create a personal password manager vault.
2. Create the AWS account with a monitored business email.
3. Enable MFA on the AWS root user.
4. Do not create root access keys.
5. Create an administrative identity for learning.
6. Create AWS Budget notifications.
7. Turn on Free Tier usage alerts.
8. Set a calendar reminder to review Cost Explorer every week.
9. Create a separate GitHub practice repository.
10. Install:
    - Git
    - VS Code
    - Node.js 22 LTS
    - MySQL client
    - AWS CLI v2
    - Windows Terminal or WSL2

### Checkpoint

You can sign in without using the root account, MFA works, and a small test
budget alert reaches your email.

---

## 4. Week 1 — terminal and Linux

Buizz production will run on Ubuntu. You must be comfortable without a graphical
file manager.

### Learn

- filesystem paths
- files and directories
- relative versus absolute paths
- users, groups, permissions, and `sudo`
- processes, ports, signals, and services
- environment variables
- stdout, stderr, pipes, and exit codes
- package installation
- logs and disk usage
- SSH concepts, although production should later use SSM

### Watch

- Linux command line full course search:
  https://www.youtube.com/results?search_query=freeCodeCamp+Linux+command+line+full+course+beginners
- Ubuntu server beginner search:
  https://www.youtube.com/results?search_query=Ubuntu+Server+22.04+24.04+beginner+tutorial
- Linux permissions search:
  https://www.youtube.com/results?search_query=Linux+permissions+chmod+chown+sudo+beginner
- Linux processes and systemd search:
  https://www.youtube.com/results?search_query=Linux+processes+systemd+journalctl+beginner

### Commands to understand

```bash
pwd
ls -la
cd
mkdir
cp
mv
rm
less
head
tail
grep
find
df -h
du -sh
ps aux
kill
ss -lntp
curl
chmod
chown
sudo
systemctl
journalctl
env
export
```

Do not memorize destructive commands. Understand the target path before using
`rm`, `mv`, `chmod -R`, or `chown -R`.

### Practice

1. Create an Ubuntu VM using WSL2 or VirtualBox.
2. Create a non-root `buizz` user.
3. Create `/srv/buizz-practice`.
4. Give only that user ownership of the directory.
5. Start a simple Node HTTP server.
6. Find its process and listening port.
7. stop and restart it
8. inspect logs
9. fill a temporary practice directory, inspect disk usage, then clean only that
   directory

### Checkpoint

Without a tutorial, you can find why a Node process is not running, identify a
port conflict, read its logs, and correct file ownership.

---

## 5. Week 2 — Git and GitHub

### Learn

- repository, commit, branch, merge, pull request, tag, and release
- working tree, staging area, and history
- `.gitignore`
- resolving a small merge conflict
- branch protection
- code review
- why secrets remain in Git history

### Watch

- Git and GitHub full course search:
  https://www.youtube.com/results?search_query=freeCodeCamp+Git+and+GitHub+full+course+beginners
- GitHub Skills:
  https://www.youtube.com/@GitHubSkills
- Pull request tutorial:
  https://www.youtube.com/results?search_query=GitHub+pull+request+branch+protection+beginner
- Git merge conflicts:
  https://www.youtube.com/results?search_query=Git+merge+conflict+beginner+tutorial

### Practice

1. Clone the practice repository.
2. Create `feature/readme`.
3. Add a file, commit it, and push the branch.
4. Create and review a pull request.
5. Merge it.
6. Create a version tag.
7. Reproduce and solve a harmless merge conflict.
8. Add `.env`, `node_modules`, build outputs, logs, and uploads to `.gitignore`.
9. Use `git status`, `git diff`, `git log`, and `git show`.
10. Enable protection on the practice `main` branch.

### Checkpoint

You can explain exactly what code a deployment tag contains and can prove that
`.env` is not tracked.

---

## 6. Week 3 — web, networking, and application fundamentals

### Learn first

- client, server, database, and object storage
- IP address, port, subnet, router, and firewall
- domain, DNS A/CNAME records, and TTL
- HTTP request/response
- methods, headers, body, status code
- HTTPS and TLS certificates
- reverse proxy
- REST API
- cookies, sessions, JWT, refresh tokens
- browser same-origin policy and CORS
- WebSocket and Socket.IO

### Watch

- Networking fundamentals:
  https://www.youtube.com/results?search_query=freeCodeCamp+computer+networking+course+DNS+HTTP+HTTPS
- HTTP course:
  https://www.youtube.com/results?search_query=HTTP+HTTPS+DNS+cookies+CORS+explained+web+developers
- REST API explanation:
  https://www.youtube.com/results?search_query=REST+API+beginner+Node.js+Express
- JWT and cookie authentication:
  https://www.youtube.com/results?search_query=JWT+refresh+token+HttpOnly+cookie+authentication+explained
- CORS:
  https://www.youtube.com/results?search_query=CORS+same+origin+policy+explained
- Socket.IO:
  https://www.youtube.com/results?search_query=Socket.IO+Node.js+beginner+tutorial

### Node/Next material

- JavaScript full course:
  https://www.youtube.com/results?search_query=freeCodeCamp+JavaScript+full+course+beginners
- Node.js and Express:
  https://www.youtube.com/results?search_query=freeCodeCamp+Node.js+Express+full+course
- Next.js App Router:
  https://www.youtube.com/results?search_query=Next.js+15+App+Router+beginner+course
- Next.js official channel:
  https://www.youtube.com/@VercelHQ

### Practice

Build a tiny application, separate from Buizz:

1. Express `GET /health` returns JSON.
2. Express `POST /login` validates a fake user.
3. Next.js displays the health result.
4. Nginx proxies `/api` to Express.
5. Browser sends a cookie.
6. CORS accepts only one configured origin.
7. `curl` demonstrates 200, 400, 401, 403, 404, and 500 responses.

### Checkpoint

Given a browser error, you can determine whether it is DNS, TLS, CORS, 401,
403, 404, 500, or a frontend runtime failure.

---

## 7. Week 4 — MySQL and data integrity

### Learn

- databases, tables, rows, columns, keys, and relationships
- SQL SELECT, INSERT, UPDATE, DELETE
- JOIN, GROUP BY, ORDER BY, and pagination
- primary, unique, and foreign keys
- indexes and query plans
- transaction, commit, rollback
- isolation and concurrent updates
- connection pools
- migrations
- backup, restore, RPO, and RTO
- why payment and inventory operations must be idempotent

### Watch

- MySQL full course:
  https://www.youtube.com/results?search_query=freeCodeCamp+MySQL+full+course+beginners
- Database design:
  https://www.youtube.com/results?search_query=database+design+normalization+indexes+beginner
- SQL transactions:
  https://www.youtube.com/results?search_query=MySQL+transactions+ACID+isolation+levels+explained
- MySQL indexing and EXPLAIN:
  https://www.youtube.com/results?search_query=MySQL+indexes+EXPLAIN+ANALYZE+beginner
- Database migrations:
  https://www.youtube.com/results?search_query=database+migrations+Node.js+MySQL+production

### Practice

Create a small event database with:

- users
- organizers
- events
- ticket types
- bookings
- payments
- tickets

Then:

1. use foreign keys
2. prevent duplicate payment transaction IDs
3. perform booking plus inventory decrement in one transaction
4. roll back a deliberately failed booking
5. demonstrate a paginated event query
6. inspect its query plan
7. create a dump
8. restore the dump into a new database

### Checkpoint

You can explain why a “successful backup” is not proven until restoration has
been tested.

---

## 8. Week 5 — AWS foundations

### Learn

- Region and Availability Zone
- shared responsibility model
- IAM user, role, policy, principal, action, resource, and condition
- least privilege
- VPC, subnet, route table, Internet Gateway, security group, and NACL
- public versus private subnet
- EC2 and EBS
- RDS
- AWS CLI and IAM roles
- tags and billing

### Watch

- AWS Cloud Practitioner course search:
  https://www.youtube.com/results?search_query=AWS+Cloud+Practitioner+full+course+freeCodeCamp
- AWS official IAM:
  https://www.youtube.com/results?search_query=AWS+IAM+roles+policies+least+privilege+official
- AWS VPC:
  https://www.youtube.com/results?search_query=AWS+VPC+public+private+subnet+security+group+beginner
- AWS EC2:
  https://www.youtube.com/results?search_query=AWS+EC2+EBS+security+groups+beginner
- AWS RDS:
  https://www.youtube.com/results?search_query=AWS+RDS+MySQL+private+subnet+beginner

### Practice architecture

```text
Internet --> practice EC2
                 |
                 +--> private practice RDS
```

### Practice

1. Select Mumbai `ap-south-1`.
2. Create a VPC.
3. Create public and private subnets.
4. Create only the required routes.
5. Launch the smallest suitable practice EC2 instance.
6. Attach an IAM role.
7. Connect using Systems Manager Session Manager.
8. Install Node and run the practice API.
9. Create private RDS MySQL.
10. Allow MySQL only from the EC2 security group.
11. Prove that RDS is not publicly reachable.
12. Stop or delete resources after the exercise.

### Checkpoint

You can draw the request path from a browser to EC2 to RDS and explain every
security group rule.

---

## 9. Week 6 — S3, image uploads, KYC, tickets, and CloudFront

### Learn

- object storage versus filesystem storage
- bucket, key, object, metadata, and version
- Block Public Access
- IAM and bucket policies
- SSE-S3 and SSE-KMS
- presigned upload/download URLs
- object lifecycle
- CloudFront CDN and Origin Access Control
- public media versus private documents
- MIME type versus real file signature
- malware quarantine workflow

### Watch

- S3 beginner tutorial:
  https://www.youtube.com/results?search_query=AWS+S3+beginner+bucket+policy+block+public+access
- Presigned URLs:
  https://www.youtube.com/results?search_query=AWS+S3+presigned+URL+Node.js+upload
- CloudFront and private S3 OAC:
  https://www.youtube.com/results?search_query=CloudFront+S3+Origin+Access+Control+OAC+tutorial
- S3 encryption:
  https://www.youtube.com/results?search_query=S3+SSE-S3+SSE-KMS+encryption+explained
- Secure file uploads:
  https://www.youtube.com/results?search_query=secure+file+upload+magic+bytes+malware+scan+Node.js

### Practice

Create separate practice buckets:

- public event media
- private documents
- private ticket artifacts

Then:

1. enable Block Public Access
2. disable ACL use through bucket-owner-enforced ownership
3. enable encryption and versioning
4. upload directly using a short-lived presigned URL
5. reject an oversized file
6. prevent overwriting an arbitrary key
7. serve event media through CloudFront OAC
8. access a private fake KYC document only through an authenticated API flow
9. generate a PDF and QR, store them privately, and issue a short-lived download
10. add lifecycle cleanup for incomplete uploads and old versions

### Checkpoint

Opening an S3 URL directly must not expose event originals, KYC, tickets, or
invoices.

---

## 10. Week 7 — production Linux, Nginx, PM2, DNS, and TLS

### Learn

- Node production process lifecycle
- Nginx virtual hosts and reverse proxy
- forwarded headers
- WebSocket proxying
- DNS records
- TLS certificate creation and renewal
- health checks
- graceful restart
- release directories and rollback

### Watch

- Nginx reverse proxy:
  https://www.youtube.com/results?search_query=Nginx+reverse+proxy+Node.js+Next.js+WebSocket+tutorial
- PM2:
  https://www.youtube.com/results?search_query=PM2+Node.js+production+startup+logs+graceful+reload
- DNS:
  https://www.youtube.com/results?search_query=Route+53+DNS+A+CNAME+record+beginner
- Let's Encrypt:
  https://www.youtube.com/results?search_query=Certbot+Nginx+Ubuntu+HTTPS+Let%27s+Encrypt
- Linux server hardening:
  https://www.youtube.com/results?search_query=Ubuntu+server+hardening+UFW+fail2ban+automatic+security+updates

### Practice

1. Deploy the small practice app, not Buizz.
2. Run client and API under PM2.
3. Proxy both with Nginx.
4. Configure a practice subdomain.
5. obtain a TLS certificate
6. test automatic renewal
7. proxy a Socket.IO connection
8. restart processes without corrupting requests
9. create release directories
10. deploy a broken version and roll back

### Checkpoint

You can recover from a failed process, invalid Nginx config, expired-looking
certificate problem, and bad application release.

---

## 11. Week 8 — GitHub Actions and CI/CD

### Learn

- CI versus CD
- workflow, trigger, job, step, runner, action, artifact, and environment
- `npm ci`
- build once and deploy the same artifact
- immutable action SHA pinning
- GitHub environments and approvals
- OIDC
- short-lived AWS credentials
- SSM Run Command
- migration and rollback ordering

### Watch

- GitHub Actions official:
  https://www.youtube.com/@GitHub
- GitHub Actions beginner course:
  https://www.youtube.com/results?search_query=GitHub+Actions+full+course+beginners
- GitHub Actions environments:
  https://www.youtube.com/results?search_query=GitHub+Actions+environments+required+reviewers+deployment
- AWS OIDC:
  https://www.youtube.com/results?search_query=GitHub+Actions+AWS+OIDC+IAM+role+tutorial
- AWS SSM Run Command:
  https://www.youtube.com/results?search_query=AWS+Systems+Manager+Run+Command+EC2+deployment

### Official OIDC reading

https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws

### Practice pipeline

Pull request:

```text
npm ci --> type check --> tests --> build --> security checks
```

Production:

```text
merge main
  --> protected environment approval
  --> OIDC short-lived AWS role
  --> upload immutable artifact
  --> SSM deployment
  --> health test
  --> success or rollback
```

### Practice

1. Create CI for the small app.
2. Give workflow default `contents: read`.
3. Pin actions to full commit SHAs.
4. Create staging and production environments.
5. Configure AWS OIDC without access key secrets.
6. Limit the IAM trust policy to the repository and environment.
7. Limit deployment permissions to a practice bucket and tagged instance.
8. Deploy through SSM.
9. verify the release SHA
10. deliberately fail the health check and verify rollback

### Checkpoint

There is no AWS access key or SSH private key in GitHub, and a random branch
cannot deploy production.

---

## 12. Week 9 — DevSecOps and application security

### Learn

- authentication versus authorization
- role-based and object-level access control
- OWASP Top 10
- SQL injection, XSS, CSRF, SSRF, IDOR/BOLA, and command injection
- rate limiting and brute-force protection
- password hashing
- OTP security
- webhook signature validation
- secret management
- dependency and supply-chain risk
- audit logging
- KYC and payment data minimization

### Watch

- OWASP Top 10:
  https://www.youtube.com/results?search_query=OWASP+Top+10+2025+beginner
- Node.js security:
  https://www.youtube.com/results?search_query=Node.js+Express+security+OWASP+authentication+authorization
- OAuth:
  https://www.youtube.com/results?search_query=OAuth+2.0+authorization+code+flow+PKCE+explained
- CSRF, XSS, cookies:
  https://www.youtube.com/results?search_query=CSRF+XSS+HttpOnly+SameSite+cookie+explained
- GitHub CodeQL and secret scanning:
  https://www.youtube.com/results?search_query=GitHub+CodeQL+secret+scanning+Dependabot+tutorial
- Payment webhook security:
  https://www.youtube.com/results?search_query=payment+webhook+signature+verification+idempotency+Node.js

### Practice

1. Threat-model signup, OTP login, KYC review, booking, payment callback, ticket
   download, QR check-in, and super-admin support access.
2. Test ordinary users against organizer/admin endpoints.
3. Test one organizer against another organizer's records.
4. limit OTP expiry, attempts, resend, and request rate
5. use at least six-digit OTPs; never use three digits in production
6. verify webhook signatures before trusting payloads
7. enable CodeQL, dependency review, Dependabot, and secret scanning where
   available
8. rotate a practice secret and verify the old one stops working
9. review logs for PII and tokens
10. create a security incident runbook

### Checkpoint

You can demonstrate both allowed and denied test cases for every sensitive
Buizz role and resource.

---

## 13. Week 10 — queues, payments, email, WhatsApp, and reliability

### Learn

- synchronous versus asynchronous processing
- queue, job, worker, retry, backoff, dead-letter state
- at-least-once delivery
- idempotency
- transactional outbox
- third-party timeout and outage handling
- payment reconciliation
- notification delivery tracking

### Watch

- Queue fundamentals:
  https://www.youtube.com/results?search_query=message+queue+worker+retry+dead+letter+queue+explained
- SQS:
  https://www.youtube.com/results?search_query=AWS+SQS+Node.js+beginner+tutorial
- Transactional outbox:
  https://www.youtube.com/results?search_query=transactional+outbox+pattern+explained
- Idempotency:
  https://www.youtube.com/results?search_query=idempotency+payment+webhook+distributed+systems
- Amazon SES:
  https://www.youtube.com/results?search_query=Amazon+SES+domain+verification+DKIM+Node.js

### Buizz decision

Use the existing MySQL notification queue initially. Move to SQS when measured
volume or database pressure requires it. Do not add Redis/BullMQ merely because
the packages exist.

### Practice

1. Insert a notification job during a fake booking.
2. process it with a worker
3. fail it intentionally
4. observe retry with backoff
5. exhaust retries into a dead state
6. safely redrive it
7. deliver the same payment webhook twice
8. prove it creates only one booking and inventory change
9. simulate email/WhatsApp outage without failing the confirmed booking
10. reconcile fake provider transactions against the database

### Checkpoint

Repeated delivery produces the same correct business result.

---

## 14. Week 11 — observability, backup, performance, and cost

### Learn

- logs, metrics, traces, events, and alerts
- structured logs and correlation IDs
- latency percentiles
- availability, SLI, SLO, and error budget
- actionable alarms
- backup versus snapshot versus replication
- restore drills
- load testing
- caching and CDN
- AWS tagging, budgets, and Cost Explorer

### Watch

- CloudWatch:
  https://www.youtube.com/results?search_query=AWS+CloudWatch+logs+metrics+alarms+EC2+RDS+beginner
- Observability fundamentals:
  https://www.youtube.com/results?search_query=logs+metrics+traces+observability+SLI+SLO+beginner
- RDS backup/restore:
  https://www.youtube.com/results?search_query=AWS+RDS+automated+backup+point+in+time+restore+tutorial
- Load testing with k6:
  https://www.youtube.com/results?search_query=k6+load+testing+Node.js+API+beginner
- AWS cost optimization:
  https://www.youtube.com/results?search_query=AWS+Cost+Explorer+Budgets+cost+optimization+beginner

### Practice

1. Add request IDs and JSON logs.
2. Create alarms for:
   - site unavailable
   - API 5xx
   - EC2 memory/disk
   - RDS connections/storage
   - queue oldest age
   - failed payment reconciliation
3. redact JWTs, cookies, OTPs, KYC, and payment details from logs
4. set log retention
5. restore RDS backup to an isolated database
6. restore one deleted practice object version
7. run a small booking concurrency test
8. inspect slow queries
9. verify the cost after every load test
10. write actual recovery time in a restore report

### Checkpoint

You can answer: “Is Buizz healthy?”, “What failed?”, “Who is affected?”, “Can
we restore?”, and “What is it costing?” using evidence.

---

## 15. Week 12 — Docker and Terraform

These should follow the manual deployment. If you cannot manually explain a
resource, automating it hides rather than removes confusion.

### Docker

Learn:

- image, container, registry, volume, network, and layer
- Dockerfile and multi-stage build
- non-root runtime
- health check
- immutable image
- ECR

Watch:

- Docker official channel:
  https://www.youtube.com/@DockerInc
- Docker beginner-to-pro:
  https://www.youtube.com/results?search_query=DevOps+Directive+Docker+beginner+to+pro
- Docker full course:
  https://www.youtube.com/results?search_query=freeCodeCamp+Docker+full+course+beginners
- Docker security:
  https://www.youtube.com/results?search_query=Docker+security+non-root+multi-stage+image+scanning

Practice:

1. containerize the small API
2. use a multi-stage build
3. run as non-root
4. inject configuration at runtime
5. scan the image
6. prove deleting the container does not delete S3/RDS data

### Terraform

Learn:

- provider, resource, data source, variable, output, module, plan, and apply
- state and remote state
- drift
- lifecycle and dependency graph
- plan review
- why secrets in Terraform can enter state

Watch:

- HashiCorp official channel:
  https://www.youtube.com/@HashiCorp
- Terraform AWS beginner course:
  https://www.youtube.com/results?search_query=Terraform+AWS+full+course+beginners+freeCodeCamp
- Terraform beginner-to-pro:
  https://www.youtube.com/results?search_query=DevOps+Directive+Terraform+beginner+to+pro
- Terraform state:
  https://www.youtube.com/results?search_query=Terraform+remote+state+S3+state+locking+explained

Practice:

1. recreate the practice VPC with Terraform
2. add security groups
3. add a practice S3 bucket
4. review a plan
5. apply it
6. change one setting manually and observe drift
7. import or correct the drift
8. destroy only the practice environment

### Checkpoint

You can read a Terraform plan and explain every resource it will create, change,
or destroy before approving it.

---

## 16. Final Buizz deployment lab

Do this first in staging.

### Stage 1 — repository readiness

- all secrets rotated
- root `.gitignore` verified
- no `.env`, upload, ticket, PDF, or KYC files tracked
- `main` protected
- CODEOWNERS configured
- staging and production GitHub Environments configured
- builds and tests pass

### Stage 2 — AWS foundation

- root MFA and IAM Identity Center/admin access
- budgets and alerts
- VPC and subnets
- EC2 role and SSM
- private encrypted RDS
- S3 buckets and policies
- Route 53
- CloudWatch

### Stage 3 — application

- migration executed
- Next.js and Express running
- Nginx configured
- TLS valid
- production environment variables loaded from SSM
- OAuth/payment callback URLs configured
- CORS exact
- health checks working

### Stage 4 — storage

- public media through CloudFront OAC
- KYC/private documents through authorized short-lived access
- ticket/QR/invoice artifacts private
- no required artifact remains only on EC2

### Stage 5 — delivery

- GitHub OIDC
- immutable deployment artifact
- SSM deployment
- migration safety
- health validation
- tested rollback

### Stage 6 — acceptance tests

- user registration and login
- organizer registration and KYC/bank submission
- super-admin permission enforcement and approval
- event create/review/publish
- online booking sandbox payment
- offline booking
- ticket PDF and QR
- email and WhatsApp delivery/fallback
- QR check-in and duplicate prevention
- support permissions
- refund/cancellation behavior
- backup restore
- bad-release rollback

Do not send real payment traffic until the sandbox tests, permission tests,
restore test, and rollback test pass.

---

## 17. Daily study template

Use this every day:

```text
Topic:
What problem does it solve?
What could go wrong?
What did I build?
How did I verify it?
What did it cost?
How do I undo it?
What would I do during an incident?
```

Suggested session:

```text
20 minutes  review yesterday
45 minutes  watch/read
90 minutes  hands-on practice
20 minutes  break/fix exercise
15 minutes  notes and cleanup
```

---

## 18. How to know you are ready

You are ready to operate the minimum Buizz production system when you can do
these without blindly copying:

1. explain the full browser-to-database request path
2. explain every open port and IAM permission
3. deploy a tagged release
4. roll back a failed release
5. restore the database into an isolated environment
6. restore or remove an S3 object safely
7. diagnose DNS, TLS, CORS, 401, 403, 404, 500, and timeout failures
8. prove KYC and tickets are private
9. prove duplicate webhooks do not duplicate bookings
10. find queue failures and retry them safely
11. rotate a secret
12. identify current AWS cost and the largest cost driver
13. respond to a disk, database, provider, or deployment incident
14. explain why Buizz does not currently need Kubernetes, Redis, BullMQ, or
    GraphQL

If you cannot do an item, return to that week and repeat the checkpoint in
staging.

---

## 19. Recommended channels

English:

- AWS: https://www.youtube.com/@amazonwebservices
- GitHub: https://www.youtube.com/@GitHub
- GitHub Skills: https://www.youtube.com/@GitHubSkills
- Docker: https://www.youtube.com/@DockerInc
- HashiCorp: https://www.youtube.com/@HashiCorp
- freeCodeCamp: https://www.youtube.com/@freecodecamp
- TechWorld with Nana:
  https://www.youtube.com/@TechWorldwithNana
- DevOps Directive:
  https://www.youtube.com/@DevOpsDirective

Hindi searches:

- AWS Hindi beginner:
  https://www.youtube.com/results?search_query=AWS+complete+course+Hindi+beginner
- Linux Hindi:
  https://www.youtube.com/results?search_query=Linux+complete+course+Hindi+beginner
- Git/GitHub Hindi:
  https://www.youtube.com/results?search_query=Git+GitHub+complete+course+Hindi
- Docker Hindi:
  https://www.youtube.com/results?search_query=Docker+complete+course+Hindi+beginner
- Terraform AWS Hindi:
  https://www.youtube.com/results?search_query=Terraform+AWS+complete+course+Hindi
- GitHub Actions Hindi:
  https://www.youtube.com/results?search_query=GitHub+Actions+CI+CD+AWS+Hindi

Choose one main instructor per topic. Watching five explanations without
practicing is slower than completing one course and building the checkpoint.

