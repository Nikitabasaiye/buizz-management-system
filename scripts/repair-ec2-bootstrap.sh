#!/usr/bin/env bash
set -euo pipefail

repository_url="${BUZZ_REPOSITORY_URL:-https://github.com/devopsbuizz/buizz-management-system.git}"
repository_dir="${BUZZ_REPOSITORY_DIR:-/opt/buizz/repository}"
compose_version="v2.40.3"

for attempt in 1 2 3 4 5; do
  if dnf install -y docker git jq curl; then
    break
  fi
  if [ "${attempt}" -eq 5 ]; then
    echo "Unable to install EC2 deployment dependencies" >&2
    exit 1
  fi
  sleep $((attempt * 15))
done

systemctl enable --now docker
usermod -aG docker ec2-user

mkdir -p /usr/local/lib/docker/cli-plugins
curl --fail --location --retry 3 \
  "https://github.com/docker/compose/releases/download/${compose_version}/docker-compose-linux-x86_64" \
  --output /usr/local/lib/docker/cli-plugins/docker-compose
chmod 0755 /usr/local/lib/docker/cli-plugins/docker-compose

mkdir -p "$(dirname "${repository_dir}")"
if [ -d "${repository_dir}/.git" ]; then
  git -C "${repository_dir}" remote set-url origin "${repository_url}"
  git -C "${repository_dir}" fetch --prune origin main
  echo "Repository already exists; leaving its working tree unchanged"
elif [ -e "${repository_dir}" ]; then
  echo "${repository_dir} exists but is not a Git repository; refusing to overwrite it" >&2
  exit 2
else
  git clone --branch main --single-branch "${repository_url}" "${repository_dir}"
fi

mkdir -p "${repository_dir}/docker/production/env"
mkdir -p "${repository_dir}/docker/production/certbot/www"
mkdir -p "${repository_dir}/docker/production/certbot/conf"
chown -R ec2-user:ec2-user /opt/buizz

docker version
docker compose version
git -C "${repository_dir}" remote -v
echo "EC2 deployment bootstrap repaired successfully"
