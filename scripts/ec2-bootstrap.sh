#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-/opt/buizz/repository}"
GIT_REPO="${2:-https://github.com/devopsbuizz/buizz-management-system.git}"
BRANCH="${3:-main}"

if [[ ${EUID} -ne 0 ]]; then
  echo "This script must run as root."
  exit 1
fi

echo "==> Detecting OS"
if command -v dnf >/dev/null 2>&1; then
  PMGR="dnf"
elif command -v apt-get >/dev/null 2>&1; then
  PMGR="apt"
else
  echo "Unsupported OS package manager."
  exit 1
fi

if [[ "$PMGR" == "dnf" ]]; then
  dnf update -y
  dnf install -y git curl jq unzip nginx ca-certificates
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs
  fi
else
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y git curl jq unzip nginx ca-certificates
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not available after Node installation."
  exit 1
fi

npm install -g npm@latest pm2

mkdir -p /opt/buizz /opt/buizz/releases /opt/buizz/shared /opt/buizz/logs

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "==> Cloning repository"
  git clone --branch "$BRANCH" --single-branch "$GIT_REPO" "$REPO_DIR"
fi

cd "$REPO_DIR"
git fetch origin --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ -f "$REPO_DIR/server/package-lock.json" ]; then
  (cd "$REPO_DIR/server" && npm ci --include=dev)
fi
if [ -f "$REPO_DIR/admin/package-lock.json" ]; then
  (cd "$REPO_DIR/admin" && npm ci --include=dev)
fi
if [ -f "$REPO_DIR/client/package-lock.json" ]; then
  (cd "$REPO_DIR/client" && npm ci --include=dev)
fi

if [ -f "$REPO_DIR/client/package.json" ]; then
  (cd "$REPO_DIR/client" && npm run build)
fi

if ! systemctl is-enabled --quiet nginx 2>/dev/null; then
  systemctl enable nginx
fi
if ! systemctl is-active --quiet nginx 2>/dev/null; then
  systemctl start nginx
fi

echo "==> EC2 bootstrap completed"
echo "Next step: configure .env files and run the deploy script"
