#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

LOG_FILE="/var/log/buizz-bootstrap.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

ensure_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Installing missing dependency: $1"
    apt-get update
    apt-get install -y "$1"
  fi
}

version_gte() {
  local a="${1#v}"
  local b="${2#v}"
  if [ "$(printf '%s\n%s\n' "$a" "$b" | sort -V | tail -n1)" = "$a" ]; then
    return 0
  fi
  return 1
}

check_and_install_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js not found. Installing Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  else
    current_node="$(node -v | tr -d 'v')"
    echo "Current Node.js: ${current_node}"
    if ! version_gte "${current_node}" "22.0.0"; then
      echo "Node.js version is below required minimum 22.0.0. Installing Node.js 22 LTS..."
      curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
      apt-get install -y nodejs
    fi
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is not available after Node installation."
    exit 1
  fi

  npm install -g npm@latest pm2
}

check_and_install_package() {
  local pkg="$1"
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    echo "Installing package: $pkg"
    apt-get update
    apt-get install -y "$pkg"
  fi
}

ensure_cmd curl
ensure_cmd git
ensure_cmd ca-certificates
ensure_cmd build-essential
check_and_install_package nginx
check_and_install_package certbot
check_and_install_package python3-certbot-nginx
check_and_install_node

npm cache clean --force || true

mkdir -p /opt/buizz /opt/buizz/releases /opt/buizz/shared /opt/buizz/logs /opt/buizz/repository

if [ ! -d /opt/buizz/repository/.git ]; then
  echo "Repository not present. Clone it next using SSH..."
fi

if ! systemctl is-enabled --quiet nginx 2>/dev/null; then
  systemctl enable nginx
fi

if ! systemctl is-active --quiet nginx 2>/dev/null; then
  systemctl start nginx
fi

echo "Bootstrap completed successfully."
