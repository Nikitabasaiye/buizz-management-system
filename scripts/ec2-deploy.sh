#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  echo "Usage: $0 [-i <ssh-key.pem>] <ec2-user@host> [repo-dir] [branch]"
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

TARGET="$1"
REPO_DIR="${2:-/opt/buizz/repository}"
BRANCH="${3:-main}"
GIT_REPO="https://github.com/devopsbuizz/buizz-management-system.git"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -n "${SSH_KEY}" ]; then
  SSH_OPTS=(-i "${SSH_KEY}" "${SSH_OPTS[@]}")
fi

ssh "${SSH_OPTS[@]}" "$TARGET" "bash -s" <<REMOTE
set -euo pipefail
REPO_DIR="$REPO_DIR"
GIT_REPO="$GIT_REPO"
BRANCH="$BRANCH"

if [[ \
  -n "\${REPO_DIR}" && \
  "\${REPO_DIR}" != "/" && \
  "\${REPO_DIR}" != "" ]]; then
  mkdir -p "\${REPO_DIR}"
fi

if [ ! -d "\${REPO_DIR}/.git" ]; then
  git clone --branch "\${BRANCH}" --single-branch "\${GIT_REPO}" "\${REPO_DIR}"
fi

cd "\${REPO_DIR}"
git fetch origin --prune
git checkout "\${BRANCH}"
git pull --ff-only origin "\${BRANCH}"

if [ -f "server/package-lock.json" ]; then
  (cd server && npm ci --include=dev)
fi
if [ -f "admin/package-lock.json" ]; then
  (cd admin && npm ci --include=dev)
fi
if [ -f "client/package-lock.json" ]; then
  (cd client && npm ci --include=dev)
fi

if [ -f "client/package.json" ]; then
  (cd client && npm run build)
fi

if [ -f "ecosystem.config.cjs" ]; then
  pm2 startOrReload "\${REPO_DIR}/ecosystem.config.cjs" --update-env
  pm2 save
fi

pm2 status
REMOTE

ssh "${SSH_OPTS[@]}" "$TARGET" "pm2 status"
