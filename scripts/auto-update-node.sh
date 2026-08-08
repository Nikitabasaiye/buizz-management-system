#!/usr/bin/env bash
set -euo pipefail

# Usage: set BUIZZ_SERVER_DIR or rely on default
BUIZZ_SERVER_DIR=${BUIZZ_SERVER_DIR:-/opt/buizz/repository/server}

if [ ! -d "$BUIZZ_SERVER_DIR" ]; then
  echo "Directory $BUIZZ_SERVER_DIR does not exist"
  exit 1
fi

echo "Updating Node packages in $BUIZZ_SERVER_DIR"
cd "$BUIZZ_SERVER_DIR"

# Install production deps and attempt safe fixes
npm install --production || true
npm audit fix || true

echo "Node update completed"
