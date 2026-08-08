echo "All EC2 services are healthy"
#!/usr/bin/env bash
set -euo pipefail

# Production-ready health check script
# - Accepts SERVICE_URLS env var with comma-separated NAME=URL pairs
# - Or reads SERVICE_SSM_PARAM (SSM parameter containing same CSV string)
# - Logs to /var/log/buizz/health-check.log
# - Uses exponential backoff with configurable limits

LOG_DIR=${LOG_DIR:-/var/log/buizz}
LOG_FILE=${LOG_FILE:-$LOG_DIR/health-check.log}
mkdir -p "$LOG_DIR"
touch "$LOG_FILE"

RETRIES=${RETRIES:-5}
INITIAL_DELAY=${INITIAL_DELAY:-2}
MAX_DELAY=${MAX_DELAY:-30}

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "$(timestamp) $*" | tee -a "$LOG_FILE"; }

# Fetch SERVICE_URLS from SSM if requested
if [ -n "${SERVICE_SSM_PARAM:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    log "Fetching service list from SSM param ${SERVICE_SSM_PARAM}"
    SERVICE_URLS=$(aws ssm get-parameter --name "$SERVICE_SSM_PARAM" --with-decryption --query Parameter.Value --output text)
  else
    log "AWS CLI not available; cannot fetch SSM parameter ${SERVICE_SSM_PARAM}"
    exit 2
  fi
fi

if [ -z "${SERVICE_URLS:-}" ]; then
  # Default to sensible production endpoints if SERVICE_URLS not provided
  SERVICE_URLS="API=https://api.buizz.com/health,Admin=https://admin.buizz.com/health,Client=https://buizz.com/_buizz/health"
  log "No SERVICE_URLS provided; using default production endpoints"
fi

check_url() {
  local name="$1" url="$2"
  local attempt=1
  local delay=$INITIAL_DELAY

  log "Checking ${name} -> ${url} (up to ${RETRIES} attempts)"
  while [ "$attempt" -le "$RETRIES" ]; do
    if curl --silent --show-error --max-time 10 --fail -I "$url" >/dev/null 2>&1; then
      log "OK: ${name} is healthy"
      return 0
    fi
    log "WARN: ${name} check failed (attempt ${attempt}). Retrying in ${delay}s"
    sleep "$delay"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
    if [ "$delay" -gt "$MAX_DELAY" ]; then delay=$MAX_DELAY; fi
  done

  log "ERROR: ${name} failed after ${RETRIES} attempts"
  return 1
}

# Parse comma-separated NAME=URL pairs
FAILED=0
OLD_IFS="$IFS"
IFS=','
for pair in $SERVICE_URLS; do
  IFS='=' read -r name url <<< "$pair"
  IFS=','
  if [ -z "$name" ] || [ -z "$url" ]; then
    log "Skipping invalid service entry: $pair"
    continue
  fi
  if ! check_url "$name" "$url"; then
    FAILED=1
  fi
done
IFS="$OLD_IFS"

if [ "$FAILED" -ne 0 ]; then
  log "One or more health checks failed"
  exit 2
fi

log "All services healthy"
