#!/usr/bin/env bash
set -euo pipefail

echo "Running docker compose pull/up and pruning images"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI not found"
  exit 1
fi

if [ -f docker-compose.yml ] || [ -f docker-compose.yaml ]; then
  docker compose pull || true
  docker compose up -d || true
else
  echo "docker-compose.yml not found in current directory"
  exit 0
fi

docker image prune -af || true

echo "Docker maintenance completed"
