#!/usr/bin/env bash
# ==============================================================================
# SCRIPT OFICIAL DE RESPALDO PARA TIDB CLOUD (MYSQL 8.0)
# MTC Marcona - Unidad 4: Mantenimiento y Respaldo Automatizado
# ==============================================================================
# Reglas de Seguridad: Cero contraseñas hardcodeadas. Lee únicamente variables de entorno.
# Compatible con TiDB Serverless: SSL VERIFY_IDENTITY, skip-lock-tables, no GTID.
# ==============================================================================

set -euo pipefail

# Directorio base de respaldos (por defecto backups/ en la raíz del proyecto)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
mkdir -p "${BACKUP_DIR}"

# 1. Validación estricta de variables de entorno requeridas
DB_HOST="${DB_HOST:-${SPRING_DATASOURCE_HOST:-}}"
DB_PORT="${DB_PORT:-${SPRING_DATASOURCE_PORT:-4000}}"
DB_NAME="${DB_NAME:-${SPRING_DATASOURCE_NAME:-marcona_permisos}}"
DB_USER="${DB_USER:-${SPRING_DATASOURCE_USERNAME:-}}"
DB_PASSWORD="${DB_PASSWORD:-${SPRING_DATASOURCE_PASSWORD:-}}"

if [[ -z "${DB_HOST}" || -z "${DB_USER}" || -z "${DB_PASSWORD}" ]]; then
  echo "❌ [ERROR] Faltan variables de entorno obligatorias para el respaldo de TiDB Cloud."
  echo "    Variables requeridas:"
  echo "      - DB_HOST (o SPRING_DATASOURCE_HOST)"
  echo "      - DB_USER (o SPRING_DATASOURCE_USERNAME)"
  echo "      - DB_PASSWORD (o SPRING_DATASOURCE_PASSWORD)"
  echo "    Variables opcionales con valor por defecto:"
  echo "      - DB_PORT (actual: ${DB_PORT})"
  echo "      - DB_NAME (actual: ${DB_NAME})"
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

echo "================================================================="
echo "📦 Iniciando respaldo de TiDB Cloud: ${DB_NAME}"
echo "    Host: ${DB_HOST}:${DB_PORT}"
echo "    Usuario: ${DB_USER}"
echo "    Destino: ${BACKUP_FILE}"
echo "================================================================="

# 2. Autodetección del bundle de certificados CA del sistema para SSL
SSL_CA="${DB_SSL_CA:-}"
if [[ -z "${SSL_CA}" ]]; then
  for candidate in \
    "/etc/ssl/certs/ca-certificates.crt" \
    "/etc/pki/tls/certs/ca-bundle.crt" \
    "/etc/ssl/cert.pem"; do
    if [[ -f "${candidate}" ]]; then
      SSL_CA="${candidate}"
      break
    fi
  done
fi

if [[ -z "${SSL_CA}" || ! -f "${SSL_CA}" ]]; then
  echo "❌ [ERROR] No se encontró el bundle de certificados CA del sistema."
  echo "    Requerido por mysqldump para '--ssl-mode=VERIFY_IDENTITY'."
  echo "    Por favor instala 'ca-certificates' (ej. apt install -y ca-certificates o apk add ca-certificates)"
  echo "    o define la ruta manualmente exportando la variable 'DB_SSL_CA'."
  exit 1
fi

echo "🔒 Usando certificado CA: ${SSL_CA}"

# 3. Ejecutar mysqldump con parámetros compatibles con TiDB Cloud Serverless
# NOTA: MYSQL_PWD evita exponer la contraseña en la tabla de procesos ps
export MYSQL_PWD="${DB_PASSWORD}"

mysqldump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USER}" \
  --ssl-mode=VERIFY_IDENTITY \
  --ssl-ca="${SSL_CA}" \
  --set-gtid-purged=OFF \
  --column-statistics=0 \
  --skip-lock-tables \
  --skip-add-locks \
  --no-tablespaces \
  --skip-triggers \
  --default-character-set=utf8mb4 \
  "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"

unset MYSQL_PWD

# 3. Generar archivo de integridad SHA-256
echo "🔒 Generando suma de verificación SHA-256..."
cd "${BACKUP_DIR}"
sha256sum "$(basename "${BACKUP_FILE}")" > "${CHECKSUM_FILE}"
cd - > /dev/null

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Respaldo completado exitosamente: ${BACKUP_FILE} (${FILE_SIZE})"
echo "✅ Checksum generado: ${CHECKSUM_FILE}"

# 4. Política de retención: eliminar respaldos con más de 14 días
echo "🧹 Aplicando política de retención (eliminando copias de más de 14 días)..."
find "${BACKUP_DIR}" -type f \( -name "*.sql.gz" -o -name "*.sha256" \) -mtime +14 -exec rm -f {} +
echo "✅ Política de retención ejecutada."
