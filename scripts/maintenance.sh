#!/usr/bin/env bash
set -euo pipefail

# Production-grade maintenance runner
# - Safe OS updates only when RUN_OS_UPDATES=true
# - Node updates optional
# - Docker/ECR aware: logs into ECR if ECR_REGISTRY provided
# - Uses production docker-compose file when present

LOG_DIR=${LOG_DIR:-/var/log/buizz}
mkdir -p "$LOG_DIR"
exec >>"$LOG_DIR/maintenance.log" 2>&1

echo "===== Buizz maintenance: started $(date -u) ====="

RUN_OS_UPDATES=${RUN_OS_UPDATES:-false}
BUIZZ_USER=${BUIZZ_USER:-ubuntu}
BUIZZ_HOME=${BUIZZ_HOME:-/opt/buizz}
BUIZZ_APP_DIR=${BUIZZ_APP_DIR:-$BUIZZ_HOME/repository/server}
ECR_REGISTRY=${ECR_REGISTRY:-}
COMPOSE_FILE=${COMPOSE_FILE:-$BUIZZ_HOME/docker-compose.prod.yml}

if [ "$RUN_OS_UPDATES" = "true" ]; then
  if command -v yum >/dev/null 2>&1; then
    echo "Updating OS (yum)"
    sudo yum update -y
  elif command -v apt-get >/dev/null 2>&1; then
    echo "Updating OS (apt)"
    sudo apt-get update -y
    sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
  else
    echo "No supported package manager found; skipping OS update"
  fi
else
  echo "RUN_OS_UPDATES not enabled; skipping OS package upgrades"
fi

# If running with ECR, perform docker login (requires aws CLI and IAM role)
if [ -n "$ECR_REGISTRY" ] && command -v aws >/dev/null 2>&1 && command -v docker >/dev/null 2>&1; then
  echo "Logging into ECR: $ECR_REGISTRY"
  aws ecr get-login-password | docker login --username AWS --password-stdin "$ECR_REGISTRY" || echo "ECR login failed"
fi

# Docker Compose deployment (preferred in production)
if command -v docker >/dev/null 2>&1; then
  if [ -f "$COMPOSE_FILE" ]; then
    echo "Using compose file: $COMPOSE_FILE"
    docker compose -f "$COMPOSE_FILE" pull --ignore-pull-failures || true
    docker compose -f "$COMPOSE_FILE" up -d --remove-orphans || true
    docker image prune -af || true
  else
    echo "Compose file $COMPOSE_FILE not found; skipping compose steps"
  fi
else
  echo "Docker not installed; skipping Docker deployment steps"
fi

# Node/Pm2 fallback for non-containerized apps
if [ -d "$BUIZZ_APP_DIR" ] && command -v pm2 >/dev/null 2>&1; then
  echo "Running Node maintenance in $BUIZZ_APP_DIR"
  cd "$BUIZZ_APP_DIR"
  sudo -u "$BUIZZ_USER" npm ci --production || true
  sudo -u "$BUIZZ_USER" npm audit fix || true
  pm2 restart all || true
else
  echo "No pm2-managed Node app found at $BUIZZ_APP_DIR or pm2 missing"
fi

# Run health checks
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
if [ -x "$SCRIPT_DIR/ec2-health-check.sh" ]; then
  echo "Running health checks"
  "$SCRIPT_DIR/ec2-health-check.sh"
else
  echo "Health-check script missing or not executable: $SCRIPT_DIR/ec2-health-check.sh"
fi

echo "===== Buizz maintenance: completed $(date -u) ====="
