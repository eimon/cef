#!/usr/bin/env bash
# Genera certificados SSL locales de confianza para desarrollo HTTPS.
# Requiere mkcert instalado. Ejecutar una sola vez por máquina.
set -e

CERTS_DIR="$(cd "$(dirname "$0")/.." && pwd)/frontend/certs"

command -v mkcert >/dev/null 2>&1 || {
  echo "Error: mkcert no está instalado."
  echo ""
  echo "  Ubuntu/Debian/WSL2:"
  echo "    sudo apt install libnss3-tools"
  echo "    curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'"
  echo "    chmod +x mkcert-v*-linux-amd64 && sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert"
  echo ""
  echo "  macOS: brew install mkcert"
  exit 1
}

mkcert -install

mkdir -p "$CERTS_DIR"
cd "$CERTS_DIR"
mkcert localhost 127.0.0.1

echo ""
echo "Certificados generados en frontend/certs/"
echo "Ahora podés levantar el stack con: docker compose up"
echo "Accedé a https://localhost:3000"
