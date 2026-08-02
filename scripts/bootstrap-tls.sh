#!/usr/bin/env bash
set -euo pipefail

email="${1:-contact@buizz.com}"
domain="${2:-buizz.com}"
root="${BUZZ_REPOSITORY_DIR:-/opt/buizz/repository}"
cert_root="${root}/docker/production/certbot"

mkdir -p "${cert_root}/conf/live/${domain}" "${cert_root}/www"

if [ ! -f "${cert_root}/conf/live/${domain}/fullchain.pem" ]; then
  docker run --rm \
    -v "${cert_root}/conf:/etc/letsencrypt" \
    alpine:3.21 sh -c \
    "apk add --no-cache openssl >/dev/null && openssl req -x509 -nodes -newkey rsa:2048 -days 1 -keyout /etc/letsencrypt/live/${domain}/privkey.pem -out /etc/letsencrypt/live/${domain}/fullchain.pem -subj '/CN=${domain}'"
fi

cd "${root}"
docker compose --env-file docker/production/.env -f docker/production/compose.yml up -d nginx

# Remove the one-day bootstrap certificate before Certbot creates its managed
# certificate. Leaving it in live/ can make Certbot select a -0001 lineage that
# does not match the paths mounted by Nginx.
rm -rf "${cert_root}/conf/live/${domain}"

docker run --rm \
  -v "${cert_root}/conf:/etc/letsencrypt" \
  -v "${cert_root}/www:/var/www/certbot" \
  certbot/certbot:latest certonly --webroot \
  --webroot-path /var/www/certbot \
  --email "${email}" --agree-tos --no-eff-email \
  -d "${domain}" -d "www.${domain}" -d "api.${domain}" -d "admin-api.${domain}"

docker compose --env-file docker/production/.env -f docker/production/compose.yml restart nginx
