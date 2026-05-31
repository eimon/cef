# CEF

Sistema de gestión para un centro de actividad física.

Desarrollado con FastAPI (backend) y Next.js (frontend), con autenticación JWT y base de datos PostgreSQL.

## Requisitos

- Docker y Docker Compose
- [mkcert](https://github.com/FiloSottile/mkcert) (para HTTPS local)

## Inicio rápido

### 1. Variables de entorno

```bash
cp .env.example .env   # completar SECRET_KEY y POSTGRES_PASSWORD
```

### 2. Certificados SSL (una sola vez por máquina)

**Instalar mkcert:**

```bash
# Ubuntu / Debian / WSL2
sudo apt install libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64 && sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# macOS
brew install mkcert
```

**Generar los certificados:**

```bash
bash scripts/setup-ssl.sh
```

**Hacer que el navegador confíe en los certificados:**

Los certificados son válidos para Chrome y Edge sin configuración adicional en Linux nativo. En **WSL2** (browser corriendo en Windows) hay un paso extra para instalar la CA en el almacén de Windows.

**Opción A — mkcert nativo en Windows (recomendado, sin WSL):**

Abrir PowerShell y ejecutar:

```powershell
# Instalar mkcert en Windows (una sola vez por máquina)
winget install FiloSottile.mkcert

# Instalar la CA en el almacén de Windows
# (también la propaga a WSL automáticamente si está disponible)
mkcert -install

# Generar los certificados directamente en la carpeta del proyecto
cd ruta\al\proyecto\cef\frontend\certs
mkcert localhost 127.0.0.1
```

Esto reemplaza el script `setup-ssl.sh`: los archivos `localhost+1.pem` y `localhost+1-key.pem` quedan listos en `frontend\certs\` sin pasos adicionales.

**Opción B — PowerShell + mkcert en WSL (una sola línea):**

Abrir PowerShell **como Administrador** y ejecutar:

```powershell
Import-Certificate -FilePath ((wsl wslpath -w ((wsl mkcert -CAROOT).Trim() + '/rootCA.pem')).Trim()) -CertStoreLocation 'Cert:\LocalMachine\Root'
```

**Opción C — Manual (bash + asistente de Windows):**

```bash
# Copiar la CA de mkcert al Escritorio de Windows
cp "$(mkcert -CAROOT)/rootCA.pem" /mnt/c/Users/$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')/Desktop/mkcert-rootCA.crt
```

Luego en Windows:
1. Doble clic en `mkcert-rootCA.crt` → **"Instalar certificado..."**
2. Seleccionar **"Equipo local"** → Siguiente
3. Elegir **"Colocar todos los certificados en el siguiente almacén"** → Browse → **"Entidades de certificación raíz de confianza"**
4. Siguiente → Finalizar → reiniciar el navegador

Para **Firefox** (cualquier sistema), importar manualmente en `about:preferences#privacy` → Certificados → Ver certificados → Autoridades → Importar → seleccionar `mkcert-rootCA.crt` → tildar "Confiar en esta CA para identificar sitios web".

### 3. Levantar el stack

```bash
docker compose up --build
```

La API queda disponible en `http://localhost:8000` y el frontend en `https://localhost:3000`.
