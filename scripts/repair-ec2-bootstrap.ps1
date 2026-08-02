param(
  [string]$Region = "ap-south-1",
  [string]$InstanceId = "i-0a192492350a69930",
  [string]$RepositoryUrl = "https://github.com/devopsbuizz/buizz-management-system.git"
)

$ErrorActionPreference = "Stop"

$commands = @(
  "set -euo pipefail",
  "for attempt in 1 2 3 4 5; do dnf install -y docker git jq curl && break; test `$attempt -eq 5 && exit 1; sleep `$((attempt * 15)); done",
  "systemctl enable --now docker",
  "usermod -aG docker ec2-user || true",
  "mkdir -p /usr/local/lib/docker/cli-plugins",
  "curl --fail --location --retry 3 https://github.com/docker/compose/releases/download/v2.40.3/docker-compose-linux-x86_64 --output /usr/local/lib/docker/cli-plugins/docker-compose",
  "chmod 0755 /usr/local/lib/docker/cli-plugins/docker-compose",
  "mkdir -p /opt/buizz",
  "if test -d /opt/buizz/repository/.git; then git -C /opt/buizz/repository remote set-url origin '$RepositoryUrl'; git -C /opt/buizz/repository fetch --prune origin main; elif test -e /opt/buizz/repository; then echo '/opt/buizz/repository exists but is not a Git repository; refusing to overwrite it' >&2; exit 2; else git clone --branch main --single-branch '$RepositoryUrl' /opt/buizz/repository; fi",
  "mkdir -p /opt/buizz/repository/docker/production/env /opt/buizz/repository/docker/production/certbot/www /opt/buizz/repository/docker/production/certbot/conf",
  "chown -R ec2-user:ec2-user /opt/buizz",
  "git -C /opt/buizz/repository remote -v",
  "docker version",
  "docker compose version"
)

$parameters = @{ commands = $commands } | ConvertTo-Json -Compress
$commandId = aws ssm send-command `
  --region $Region `
  --instance-ids $InstanceId `
  --document-name AWS-RunShellScript `
  --parameters $parameters `
  --query "Command.CommandId" `
  --output text

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($commandId)) {
  throw "AWS failed to create the SSM repair command."
}

Write-Host "SSM command: $commandId"
aws ssm wait command-executed --region $Region --command-id $commandId --instance-id $InstanceId

$status = aws ssm get-command-invocation `
  --region $Region `
  --command-id $commandId `
  --instance-id $InstanceId `
  --query Status `
  --output text

aws ssm get-command-invocation `
  --region $Region `
  --command-id $commandId `
  --instance-id $InstanceId `
  --query "{Status:Status,Output:StandardOutputContent,Error:StandardErrorContent}"

if ($status -ne "Success") {
  throw "EC2 bootstrap repair failed with SSM status: $status"
}

Write-Host "EC2 bootstrap repair completed successfully."
