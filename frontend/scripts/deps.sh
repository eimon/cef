#!/usr/bin/env bash
set -euo pipefail

NODE_IMAGE="node:24-alpine"
WORKDIR="/app"

echo "📦 Generando package-lock.json usando Docker ($NODE_IMAGE)"

docker run --rm -it \
  -v "$(pwd):$WORKDIR" \
  -w "$WORKDIR" \
  "$NODE_IMAGE" \
  sh -c "
    npm install &&
    rm -rf node_modules
  "

echo "✅ package-lock.json actualizado"
echo "👉 Recordá commitear el archivo"