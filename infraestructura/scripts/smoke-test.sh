#!/usr/bin/env bash
# ==============================================================================
# SMOKE TEST DE DISPONIBILIDAD POST-DESPLIEGUE (VERCEL + RENDER + TIDB)
# MTC Marcona - Unidad 4: Plan de Despliegue y Monitoreo
# ==============================================================================

set -euo pipefail

BACKEND_URL="${1:-${BACKEND_URL:-http://localhost:8080}}"
FRONTEND_URL="${2:-${FRONTEND_URL:-http://localhost:5173}}"

echo "================================================================="
echo "🧪 INICIANDO SMOKE TEST DE DISPONIBILIDAD"
echo "    Backend:  ${BACKEND_URL}"
echo "    Frontend: ${FRONTEND_URL}"
echo "================================================================="

FAILED=0

# 1. Verificar Backend Actuator Health
echo -n "👉 [1/3] Verificando Backend Health (${BACKEND_URL}/actuator/health)... "
HEALTH_RESPONSE=$(curl -sS -w "\n%{http_code}" --max-time 15 "${BACKEND_URL}/actuator/health" || echo -e "\n000")
HEALTH_BODY=$(echo "${HEALTH_RESPONSE}" | head -n -1)
HEALTH_CODE=$(echo "${HEALTH_RESPONSE}" | tail -n 1)

if [[ "${HEALTH_CODE}" == "200" && "${HEALTH_BODY}" == *"\"status\":\"UP\""* ]]; then
  echo "✅ OK (HTTP 200, status: UP)"
else
  echo "❌ FALLÓ (HTTP ${HEALTH_CODE}, body: ${HEALTH_BODY})"
  FAILED=1
fi

# 2. Verificar cabecera X-Request-ID en Backend
echo -n "👉 [2/3] Verificando header de trazabilidad X-Request-ID... "
HEADER_CHECK=$(curl -sS -I --max-time 10 "${BACKEND_URL}/actuator/health" | tr '[:upper:]' '[:lower:]' | grep -i "^x-request-id:" || true)

if [[ -n "${HEADER_CHECK}" ]]; then
  echo "✅ OK (${HEADER_CHECK})"
else
  echo "❌ FALLÓ (Cabecera X-Request-ID no devuelta)"
  FAILED=1
fi

# 3. Verificar Frontend (Vercel / Local)
echo -n "👉 [3/3] Verificando disponibilidad de Frontend (${FRONTEND_URL})... "
FRONTEND_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "${FRONTEND_URL}" || echo "000")

if [[ "${FRONTEND_CODE}" == "200" || "${FRONTEND_CODE}" == "304" ]]; then
  echo "✅ OK (HTTP ${FRONTEND_CODE})"
else
  echo "❌ FALLÓ (HTTP ${FRONTEND_CODE})"
  FAILED=1
fi

echo "================================================================="
if [[ ${FAILED} -eq 0 ]]; then
  echo "🎉 SMOKE TEST SUPERADO EXITOSAMENTE AL 100 %"
  exit 0
else
  echo "💥 EL SMOKE TEST ENCONTRÓ UNO O MÁS FALLOS"
  exit 1
fi
