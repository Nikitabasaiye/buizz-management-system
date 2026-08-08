# SSH-based AWS deployment guide

This project is now designed to use direct SSH access to an EC2 instance instead of Terraform-managed AWS role auth.

## 1) Create the EC2 instance

- Launch an Ubuntu or Amazon Linux 2023 instance.
- Open ports:
  - 22 for SSH
  - 80 and 443 for web traffic
  - optionally 3000 or 8080 if you use custom app ports
- Attach an IAM role if you want the EC2 instance to access AWS services like SSM, S3, ECR, or CloudWatch.

## 2) Configure SSH access

- Add your public key to the EC2 instance using `~/.ssh/authorized_keys`.
- Test the connection:

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

## 3) Run bootstrap on the server

From your local machine:

```bash
chmod +x scripts/run-ec2-bootstrap.sh
./scripts/run-ec2-bootstrap.sh -i ~/.ssh/your-key.pem ubuntu@<EC2_PUBLIC_IP> /opt/buizz/repository main
```

This installs the required system packages, Node.js LTS, Git, Nginx, PM2, and project dependencies.

If your EC2 user is not `ubuntu`, replace it with the correct user name (for example `ec2-user` on Amazon Linux).

## 4) Deploy the app from your local machine

After bootstrap, deploy updates using SSH with the same key:

```bash
chmod +x scripts/ec2-deploy.sh
./scripts/ec2-deploy.sh -i ~/.ssh/your-key.pem ubuntu@<EC2_PUBLIC_IP> /opt/buizz/repository main
```

This pulls the latest branch, installs dependencies, builds the client, and reloads PM2.

## 5) Verify the deployment

After bootstrap, install and start your app as needed:

```bash
cd /opt/buizz/repository/server
npm install
npm start
```

For production, use PM2 or a systemd service.

## 5) Package update automation

You can automate dependency refreshes with a script that checks:

- Node version
- npm version
- package manager lockfile health
- installed packages
- missing packages
- deprecated or vulnerable packages

Typical approach:

```bash
cd /opt/buizz/repository/server
npm install
npm outdated
npm audit fix
```

For a fully unattended approach, use a CI/CD runner or a cron job that runs a health script and then triggers a redeploy.

## 6) Best practice for auto-healing package drift

There is no universal “auto uninstall deprecated package and install new one” without risk, because:

- some packages break APIs without warning
- some dependency trees are version-sensitive
- app restarts may be needed after upgrades

The safest pattern is:

1. run a package health check
2. compare against lockfile / approved versions
3. install updated versions in a controlled environment
4. run build/test
5. deploy only after success

This is much safer than an unrestricted auto-upgrade script.

## 7) Recommended solution

Use a bootstrap + update script on EC2 together with GitHub Actions or a cron job:

- install missing system packages
- install Node.js LTS if missing
- run `npm ci` from the repo snapshot
- run app smoke tests
- restart the process
- alert on failure

This gives you unattended server setup without manual steps on the EC2 instance.
