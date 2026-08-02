#!/usr/bin/env bash
set -euo pipefail

environment="${1:-production}"
destination_root="${2:-/opt/buizz/repository/docker/production/env}"
region="${AWS_REGION:-ap-south-1}"

umask 077
mkdir -p "${destination_root}"

render_path() {
  local parameter_path="$1"
  local target="$2"
  local temporary
  temporary="$(mktemp)"

  aws ssm get-parameters-by-path \
    --region "${region}" \
    --path "${parameter_path}" \
    --recursive \
    --with-decryption \
    --output json |
    jq -r '
      .Parameters
      | sort_by(.Name)
      | .[]
      | select(.Value | contains("\n") | not)
      | ((.Name | split("/")[-1]) + "=" + .Value)
    ' > "${temporary}"

  install -m 600 "${temporary}" "${target}"
  rm -f "${temporary}"
}

shared="$(mktemp)"
render_path "/buizz/${environment}/shared/" "${shared}"

server_parameters="$(mktemp)"
worker_parameters="$(mktemp)"
admin_parameters="$(mktemp)"
client_parameters="$(mktemp)"

render_path "/buizz/${environment}/server/" "${server_parameters}"
render_path "/buizz/${environment}/worker/" "${worker_parameters}"
render_path "/buizz/${environment}/admin/" "${admin_parameters}"
render_path "/buizz/${environment}/client/" "${client_parameters}"

# API and admin need shared infrastructure settings. The worker also inherits
# API delivery credentials (SMTP, Meta, payment callbacks). The public-facing
# Next.js container intentionally receives no database or Valkey secrets.
cat "${shared}" "${server_parameters}" > "${destination_root}/server.env"
cat "${shared}" "${server_parameters}" "${worker_parameters}" > "${destination_root}/worker.env"
cat "${shared}" "${admin_parameters}" > "${destination_root}/admin.env"
cat "${client_parameters}" > "${destination_root}/client.env"
chmod 600 "${destination_root}"/*.env

rm -f "${server_parameters}" "${worker_parameters}" "${admin_parameters}" "${client_parameters}"

rm -f "${shared}"
echo "Rendered encrypted SSM parameters into ${destination_root}"
