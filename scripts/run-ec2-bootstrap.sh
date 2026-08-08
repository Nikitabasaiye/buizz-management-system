#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  echo "Usage: $0 [-i <ssh-key.pem>] <user@host> [remote-path-to-repo] [branch]"
  exit 1
}

SSH_KEY=""
while getopts ":i:" opt; do
  case "${opt}" in
    i) SSH_KEY="${OPTARG}" ;;
    *) print_usage ;;
  esac
done
shift $((OPTIND - 1))

if [ "$#" -lt 1 ]; then
  print_usage
fi

SSH_TARGET="$1"
REMOTE_PATH="${2:-/opt/buizz/repository}"
BRANCH="${3:-main}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -n "${SSH_KEY}" ]; then
  SSH_OPTS=(-i "${SSH_KEY}" "${SSH_OPTS[@]}")
fi

ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "bash -s" <<REMOTE
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

if [ ! -f /etc/os-release ]; then
  echo "This bootstrap script only supports Linux hosts."
  exit 1
fi

apt-get update
apt-get install -y curl git ca-certificates build-essential gnupg

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is still unavailable after installing nodejs."
  exit 1
fi

npm install -g npm@latest pm2

mkdir -p /opt/buizz /opt/buizz/releases /opt/buizz/shared /opt/buizz/logs "${REMOTE_PATH}"

if [ ! -d "${REMOTE_PATH}/.git" ]; then
  git clone -b "${BRANCH}" --single-branch "https://github.com/devopsbuizz/buizz-management-system.git" "${REMOTE_PATH}"
fi

cd "${REMOTE_PATH}"
git fetch origin --prune
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

if [ -f "server/package-lock.json" ]; then
  (cd server && npm ci --include=dev)
fi
if [ -f "admin/package-lock.json" ]; then
  (cd admin && npm ci --include=dev)
fi
if [ -f "client/package-lock.json" ]; then
  (cd client && npm ci --include=dev)
fi

if ! systemctl is-enabled --quiet nginx 2>/dev/null; then systemctl enable nginx; fi
if ! systemctl is-active --quiet nginx 2>/dev/null; then systemctl start nginx; fi

echo "Bootstrap completed."
REMOTE

ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "ls -ld /opt/buizz /opt/buizz/repository"
