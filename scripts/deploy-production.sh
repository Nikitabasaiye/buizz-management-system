#!/usr/bin/env bash
set -euo pipefail

image_tag="${1:?Usage: deploy-production.sh <immutable-image-tag>}"
region="${AWS_REGION:-ap-south-1}"
repository_dir="${BUZZ_REPOSITORY_DIR:-/opt/buizz/repository}"
compose_file="${repository_dir}/docker/production/compose.yml"

cd "${repository_dir}"
git fetch --prune origin main
git checkout --force main
git reset --hard "origin/main"

export AWS_REGION="${region}"
export IMAGE_TAG="${image_tag}"
account_id="$(aws sts get-caller-identity --query Account --output text)"
export ECR_REGISTRY="${account_id}.dkr.ecr.${region}.amazonaws.com"

aws ecr get-login-password --region "${region}" |
  docker login --username AWS --password-stdin "${ECR_REGISTRY}"

bash scripts/render-aws-env.sh production "${repository_dir}/docker/production/env"

cat > "${repository_dir}/docker/production/.env" <<EOF
AWS_REGION=${AWS_REGION}
ECR_REGISTRY=${ECR_REGISTRY}
IMAGE_TAG=${IMAGE_TAG}
EOF

docker compose --env-file docker/production/.env -f "${compose_file}" pull
docker compose --env-file docker/production/.env -f "${compose_file}" up -d --remove-orphans

for attempt in $(seq 1 18); do
  unhealthy="$(docker compose --env-file docker/production/.env -f "${compose_file}" ps --all --format json |
    jq -r 'select(.State != "running" or (.Health != "" and .Health != "healthy")) | .Service' || true)"
  if [ -z "${unhealthy}" ]; then
    docker image prune -f --filter "until=168h"
    echo "Deployment ${IMAGE_TAG} is healthy"
    exit 0
  fi
  echo "Waiting for health checks (${attempt}/18): ${unhealthy}"
  sleep 10
done

docker compose --env-file docker/production/.env -f "${compose_file}" ps
docker compose --env-file docker/production/.env -f "${compose_file}" logs --tail=100
exit 1
