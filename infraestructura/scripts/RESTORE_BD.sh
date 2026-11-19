#!/usr/bin/env bash
# ==============================================================================
# SCRIPT OFICIAL DE RESTAURACIÓN DE BASE DE DATOS (MYSQL / TIDB CLOUD)
# MTC Marcona - Unidad 4: Mantenimiento y Recuperación ante Desastres
# ==============================================================================

set -euo pipefail

usage() {
  echo "Uso: $0 <archivo_respaldo.sql[.gz]> [--force]"
  echo "Ejemplo: $0 backups/marcona_permisos_20261119_020000.sql.gz"
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

BACKUP_FILE="$1"
FORCE_FLAG="${2:-}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "❌ [ERROR] El archivo de respaldo '${BACKUP_FILE}' no existe."
  exit 1
fi

# Variables de conexión
DB_HOST="${DB_HOST:-${SPRING_DATASOURCE_HOST:-localhost}}"
DB_PORT="${DB_PORT:-${SPRING_DATASOURCE_PORT:-3306}}"
DB_NAME="${DB_NAME:-${SPRING_DATASOURCE_NAME:-marcona_permisos}}"
DB_USER="${DB_USER:-${SPRING_DATASOURCE_USERNAME:-root}}"
DB_PASSWORD="${DB_PASSWORD:-${SPRING_DATASOURCE_PASSWORD:-}}"

echo "================================================================="
echo "⚠️  ADVERTENCIA DE RESTAURACIÓN DE BASE DE DATOS"
echo "================================================================="
echo "Base de datos destino: ${DB_NAME} en ${DB_HOST}:${DB_PORT}"
echo "Usuario: ${DB_USER}"
echo "Archivo origen: ${BACKUP_FILE}"
echo "================================================================="

# Verificación de integridad si existe .sha256
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [[ -f "${CHECKSUM_FILE}" ]]; then
  echo "🔍 Verificando integridad con ${CHECKSUM_FILE}..."
  DIR_NAME="$(dirname "${BACKUP_FILE}")"
  FILE_BASE="$(basename "${BACKUP_FILE}")"
  (cd "${DIR_NAME}" && sha256sum --check --status "${FILE_BASE}.sha256")
  echo "✅ Suma de verificación SHA-256 válida."
else
  echo "ℹ️  No se encontró archivo .sha256 asociado; continuando sin validación hash."
fi

# Confirmación explícita
if [[ "${FORCE_FLAG}" != "--force" ]]; then
  read -rp "¿Está seguro de SOBRESCRIBIR la base de datos '${DB_NAME}'? (escriba 'SI' para continuar): " CONFIRM
  if [[ "${CONFIRM}" != "SI" ]]; then
    echo "Operación cancelada por el usuario."
    exit 0
  fi
fi

echo "🚀 Ejecutando restauración..."
export MYSQL_PWD="${DB_PASSWORD}"

SSL_OPTS=""
if [[ "${DB_PORT}" == "4000" || "${DB_HOST}" == *"tidbcloud.com"* ]]; then
  SSL_OPTS="--ssl-mode=VERIFY_IDENTITY"
fi

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gzip -dc "${BACKUP_FILE}" | mysql --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" ${SSL_OPTS} "${DB_NAME}"
else
  mysql --host="${DB_HOST}" --port="${DB_PORT}" --user="${DB_USER}" ${SSL_OPTS} "${DB_NAME}" < "${BACKUP_FILE}"
fi

unset MYSQL_PWD

echo "✅ Base de datos '${DB_NAME}' restaurada exitosamente desde ${BACKUP_FILE}."
